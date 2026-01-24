/**
 * Amadeus API Client
 * Handles authentication and token management for Amadeus API
 */

interface AmadeusTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface FlightOffer {
    id: string;
    price: {
        total: string;
        currency: string;
    };
    itineraries: Array<{
        duration: string; // ISO 8601 format (e.g., "PT8H30M")
        segments: Array<{
            departure: {
                iataCode: string;
                at: string;
            };
            arrival: {
                iataCode: string;
                at: string;
            };
        }>;
    }>;
}

interface AmadeusFlightResponse {
    data: FlightOffer[];
}

interface FlightResult {
    price: number;
    currency: string;
    duration: string;
    origin: string;
    warning?: 'duration_exceeded'; // Flag when flight exceeds 8h limit
}

export interface BestFlightResult {
    lcg: FlightResult | null;
    scq: FlightResult | null;
}

/**
 * Obtains an access token from Amadeus OAuth2 endpoint
 * @returns {Promise<string>} The access token
 * @throws {Error} If authentication fails or credentials are missing
 */
export async function getAmadeusToken(): Promise<string> {
    const clientId = Deno.env.get('AMADEUS_CLIENT_ID');
    const clientSecret = Deno.env.get('AMADEUS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
        throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be set in environment variables');
    }

    const tokenUrl = 'https://test.api.amadeus.com/v1/security/oauth2/token';

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
    });

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Amadeus authentication failed: ${response.status} - ${errorText}`);
        }

        const data: AmadeusTokenResponse = await response.json();
        return data.access_token;
    } catch (error) {
        throw new Error(`Failed to obtain Amadeus token: ${error.message}`);
    }
}

/**
 * Converts ISO 8601 duration to minutes
 * @param {string} duration - ISO 8601 duration string (e.g., "PT8H30M")
 * @returns {number} Duration in minutes
 */
function parseDurationToMinutes(duration: string): number {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

    return hours * 60 + minutes;
}

/**
 * Searches for flights from a specific origin to destination
 * @param {string} accessToken - Amadeus API access token
 * @param {string} origin - Origin airport IATA code
 * @param {string} destination - Destination airport IATA code
 * @param {string} departureDate - Departure date in YYYY-MM-DD format
 * @returns {Promise<FlightOffer[]>} Array of flight offers
 */
async function searchFlights(
    accessToken: string,
    origin: string,
    destination: string,
    departureDate: string
): Promise<FlightOffer[]> {
    const url = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
    url.searchParams.append('originLocationCode', origin);
    url.searchParams.append('destinationLocationCode', destination);
    url.searchParams.append('departureDate', departureDate);
    url.searchParams.append('adults', '1');
    url.searchParams.append('nonStop', 'false'); // Allow connecting flights (critical for Galicia)
    url.searchParams.append('max', '20'); // Increased for better fallback options

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // ENHANCED DEBUG: Log full response for diagnostics
        console.log(`[AMADEUS API] Response status for ${origin}→${destination}: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AMADEUS API] ERROR ${response.status}:`, errorText);
            return [];
        }

        const data: AmadeusFlightResponse = await response.json();
        const flights = data.data || [];

        // CRITICAL DEBUG: Show what Amadeus actually returned
        if (flights.length === 0) {
            console.warn(`[AMADEUS API] ⚠️ ZERO flights returned for ${origin}→${destination} on ${departureDate}`);
            console.warn(`[AMADEUS API] This means the Test API has NO DATA for this route/date combination`);
        }
        console.log(`Vuelos encontrados antes de filtrar (${origin} → ${destination}, ${departureDate}):`, flights.length);
        return flights;
    } catch (error) {
        console.error(`Error searching flights from ${origin}:`, error);
        return [];
    }
}

/**
 * Searches flights with flexible dates (tries 3 consecutive days)
 * @param {string} accessToken - Amadeus API access token
 * @param {string} origin - Origin airport IATA code
 * @param {string} destination - Destination airport IATA code
 * @param {string} baseDate - Base departure date in YYYY-MM-DD format
 * @returns {Promise<FlightOffer[]>} Array of flight offers from any of the 3 dates
 */
async function searchFlightsFlexible(
    accessToken: string,
    origin: string,
    destination: string,
    baseDate: string
): Promise<FlightOffer[]> {
    console.log(`[FLEXIBLE SEARCH] Trying 3 dates starting from ${baseDate}...`);

    // Try 3 consecutive dates
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + dayOffset);
        const dateStr = date.toISOString().split('T')[0];

        console.log(`[FLEXIBLE SEARCH] Attempt ${dayOffset + 1}/3: ${dateStr}`);
        const flights = await searchFlights(accessToken, origin, destination, dateStr);

        if (flights.length > 0) {
            console.log(`[FLEXIBLE SEARCH] ✅ Found ${flights.length} flights on ${dateStr}`);
            return flights;
        }
    }

    console.warn(`[FLEXIBLE SEARCH] ⚠️ No flights found in any of the 3 dates`);
    return [];
}

/**
 * Finds the best flight options from LCG and SCQ to a destination
 * LA REGLA DE ORO: Filters out flights longer than 8 hours, then finds cheapest from each origin
 * @param {string} destination - Destination airport IATA code (e.g., 'MAD', 'BCN')
 * @returns {Promise<BestFlightResult>} Best flight from each origin or null if none found
 */
export async function findBestFlight(destination: string): Promise<BestFlightResult> {
    // Get access token
    const accessToken = await getAmadeusToken();

    // Calculate departure date (45 days from now for better availability)
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 45);
    const formattedDate = departureDate.toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`Searching flights for date: ${formattedDate} (45 days from now)`);

    // Search flights from both origins in parallel with FLEXIBLE DATES
    const [lcgFlights, scqFlights] = await Promise.all([
        searchFlightsFlexible(accessToken, 'LCG', destination, formattedDate),
        searchFlightsFlexible(accessToken, 'SCQ', destination, formattedDate),
    ]);

    // LÓGICA DE SUPERVIVENCIA: Procesamiento ultra-permisivo
    const processFlight = (flights: FlightOffer[], origin: string): FlightResult | null => {
        console.log(`[${origin}] Procesando ${flights.length} vuelos...`);

        if (flights.length === 0) {
            console.warn(`[${origin}] ⚠️ NO HAY VUELOS DISPONIBLES`);
            return null;
        }

        // Filtrar vuelos con duración válida
        const flightsWithDuration = flights.filter(flight => flight.itineraries[0]?.duration);
        console.log(`[${origin}] Vuelos con duración válida: ${flightsWithDuration.length}`);

        if (flightsWithDuration.length === 0) return null;

        // PASO B: Intentar filtrar por < 8h
        const under8h = flightsWithDuration
            .filter(flight => {
                const minutes = parseDurationToMinutes(flight.itineraries[0].duration);
                return minutes <= 480; // 8 hours = 480 minutes
            })
            .sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total));

        console.log(`[${origin}] Vuelos bajo 8h: ${under8h.length}`);

        // Si hay vuelos bajo 8h, devolver el más barato
        if (under8h.length > 0) {
            const best = under8h[0];
            const durationMins = parseDurationToMinutes(best.itineraries[0].duration);
            console.log(`[${origin}] ✅ Mejor vuelo <8h: ${best.price.total}€, ${durationMins}min`);
            return {
                price: parseFloat(best.price.total),
                currency: best.price.currency,
                duration: best.itineraries[0].duration,
                origin,
            };
        }

        // PASO C (SUPERVIVENCIA): NO hay vuelos <8h → Devolver el MÁS CORTO disponible
        console.warn(`[${origin}] ⚠️ NO hay vuelos <8h. Activando MODO SUPERVIVENCIA...`);

        const sortedByDuration = flightsWithDuration
            .sort((a, b) => {
                const durationA = parseDurationToMinutes(a.itineraries[0].duration);
                const durationB = parseDurationToMinutes(b.itineraries[0].duration);
                return durationA - durationB;
            });

        const fastest = sortedByDuration[0];
        const fastestMins = parseDurationToMinutes(fastest.itineraries[0].duration);
        const fastestHours = (fastestMins / 60).toFixed(1);

        console.warn(`[${origin}] 🆘 FALLBACK: Vuelo más corto disponible: ${fastest.price.total}€, ${fastestHours}h (${fastestMins}min)`);

        return {
            price: parseFloat(fastest.price.total),
            currency: fastest.price.currency,
            duration: fastest.itineraries[0].duration,
            origin,
            warning: 'duration_exceeded', // Opción larga (única encontrada)
        };
    };

    // Process both origins - TRUTH ONLY (no synthetic data)
    console.log('\n===== PROCESANDO RESULTADOS (TRUTH ONLY) =====');
    const lcgBest = processFlight(lcgFlights, 'LCG');
    const scqBest = processFlight(scqFlights, 'SCQ');

    // NO PLAN Z - If no data, return NULL (integrity over convenience)
    if (!lcgBest && !scqBest) {
        console.error('❌❌❌ NO REAL FLIGHT DATA AVAILABLE FROM AMADEUS API ❌❌❌');
        console.error('This likely means the Test API does not have data for this destination.');
        console.error('Returning NULL - Gemini will handle the "no data" scenario honestly.');
    }

    console.log('===== FIN PROCESAMIENTO ===== \n');

    return {
        lcg: lcgBest,
        scq: scqBest,
    };
}
