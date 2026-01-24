import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { findBestFlight } from "./utils/amadeusClient.ts";

// CORS headers for browser access
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mock data for testing (used when no body is provided)
const mockGroupData = {
    city: "Roma",
    budget: 1000,
    groupSize: 4,
    interests: {
        gastronomy: true,
        culture: false,
        nightlife: false,
        nature: false,
    },
    dates: {
        departure: "Thursday",
        return: "Sunday",
        duration: 4,
    },
};

interface GroupData {
    city: string;
    budget: number;
    groupSize?: number;
    interests?: {
        gastronomy?: boolean;
        culture?: boolean;
        nightlife?: boolean;
        nature?: boolean;
        adventure?: boolean;
    };
    dates?: {
        departure?: string;
        return?: string;
        duration?: number;
    };
}

interface CityReportResponse {
    viabilityScore: number;
    analysis: string;
    flight_analysis: {
        route: string;
        is_viable: boolean;
        price_estimation: number;
        duration_mins: number;
        comment: string;
    };
    accommodation_analysis: {
        zone_recommended: string;
        avg_price_night: number;
        options: Array<{
            name: string;
            price: number;
            vibe: string;
        }>;
    };
    activities_suggestion: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Get API key from environment
        const apiKey = Deno.env.get("GOOGLE_API_KEY");
        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY not configured in environment variables");
        }

        // Parse request body or use mock data
        let groupData: GroupData;
        try {
            const body = await req.json();
            groupData = body && Object.keys(body).length > 0 ? body : mockGroupData;
        } catch {
            groupData = mockGroupData;
        }

        // Set defaults
        const city = groupData.city;
        // Budget is already per person (no division needed)
        const budgetPerPerson = groupData.budget;

        // Get real flight data from Amadeus API
        console.log(`Fetching flight data for ${city}...`);
        let flightData = null;
        try {
            flightData = await findBestFlight(city);
            console.log('Flight data received:', JSON.stringify(flightData, null, 2));
        } catch (error) {
            console.error('Amadeus API failed, continuing without flight data:', error);
            flightData = null;
        }

        // Format flight data for the prompt
        let flightDataSection = '';
        if (flightData && (flightData.lcg || flightData.scq)) {
            flightDataSection = `**DATOS REALES DE VUELOS (Amadeus API):**\n`;
            if (flightData.lcg) {
                flightDataSection += `- LCG → ${city}: ${flightData.lcg.price}€, Duración: ${flightData.lcg.duration}\n`;
            }
            if (flightData.scq) {
                flightDataSection += `- SCQ → ${city}: ${flightData.scq.price}€, Duración: ${flightData.scq.duration}\n`;
            }
        } else {
            flightDataSection = `**DATOS REALES DE VUELOS (Amadeus API):**\n- No se encontraron vuelos disponibles para este destino.\n`;
        }

        // Initialize Google Gemini AI
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Build the AI prompt with strict business rules and REAL flight data
        const prompt = `
Eres un Consultor Estratégico de Viajes con conocimiento actualizado de precios reales de mercado. Tu misión es analizar la VIABILIDAD REAL de un destino para un grupo de viaje desde Galicia.

**DATOS DEL USUARIO:**
- Destino: ${city}
- Presupuesto individual: ${budgetPerPerson}€ (por persona)
- Intereses: ${JSON.stringify(groupData.interests || mockGroupData.interests)}
- Fechas: ${JSON.stringify(groupData.dates || mockGroupData.dates)}

${flightDataSection}
**IMPORTANTE:** Debes usar los datos reales de vuelos proporcionados arriba para tu análisis económico. NO inventes precios diferentes.
**CRÍTICO - HONESTIDAD DE DATOS:** Si NO recibes datos reales de vuelos (el apartado anterior dice "No se encontraron vuelos"), NO INVENTES PRECIOS NI DURACIONES. En ese caso, debes:
   - En el campo "comment" del flight_analysis, escribe: "No se han podido verificar vuelos reales para estas fechas en la base de datos de aerolíneas"
   - Establece is_viable: false
   - Reduce el viabilityScore significativamente (máximo 30/100) por falta de datos verificables
   - En "analysis" menciona claramente que no hay información de vuelos disponible

**RESTRICCIONES OBLIGATORIAS (STRICT MODE):**

1. **VUELOS (USA LOS DATOS REALES PROPORCIONADOS):**
   - Origen Principal: 'LCG' (A Coruña, Spain) -> MÁXIMA PRIORIDAD
   - Origen Secundario: 'SCQ' (Santiago de Compostela, Spain) -> Solo sugerir si el ahorro supera el 30%
   - Tiempo de Vuelo Máximo: 480 minutos (8 horas totales)
   - Si NO existe ruta comercial real bajo 8 horas, la ciudad es **INVIABLE**
   - Fechas: Jueves a Domingo (4 días / 3 noches)
   - USA LOS PRECIOS REALES proporcionados por la API de Amadeus
   - Si no hay datos de vuelos disponibles, marca la ciudad como inviable
   - **CRÍTICO PARA IATA CODES**: En el campo "route" del JSON, usa SIEMPRE códigos metropolitanos generales (ej: 'LON' para Londres, 'ROM' para Roma, 'PAR' para París, 'NYC' para Nueva York), NUNCA códigos de aeropuertos específicos (no 'LHR', 'FCO', 'CDG', etc.)

2. **HOTELES:**
   - Busca zonas que sean "Safe & Fun" (seguras y con ambiente)
   - Calcula precio medio REAL por noche por persona
   - Menciona 2-3 opciones de alojamiento con descripciones sarcásticas y realistas

3. **VIABILIDAD:**
   - Calcula un score de 0-100 considerando:
     * Disponibilidad de vuelos directos o con escala rápida (40 puntos)
     * Relación calidad-precio del alojamiento (30 puntos)
     * Adecuación a los intereses del grupo (30 puntos)
   - Si el tiempo de vuelo supera 480 min, el score debe ser 0 y is_viable debe ser false

**FORMATO DE SALIDA (JSON PURO, SIN MARKDOWN):**

Devuelve ÚNICAMENTE este JSON (sin \`\`\`json ni explicaciones adicionales):

{
  "viabilityScore": <número 0-100>,
  "analysis": "<Resumen en 2-3 frases justificando el score. Sé directo y realista>",
  "flight_analysis": {
    "route": "<LCG -> CÓDIGO_AEROPUERTO o SCQ -> CÓDIGO_AEROPUERTO>",
    "is_viable": <true/false>,
    "price_estimation": <precio REAL estimado por persona en euros>,
    "duration_mins": <tiempo total de vuelo en minutos>,
    "comment": "<Directo, con escala, o inviable. Menciona aerolíneas típicas>"
  },
  "accommodation_analysis": {
    "zone_recommended": "<Nombre del barrio/zona recomendada>",
    "avg_price_night": <precio medio real por noche por persona>,
    "options": [
      {"name": "<Hotel/Hostel A>", "price": <precio total 3 noches por persona>, "vibe": "<Descripción con humor>"},
      {"name": "<Hotel/Hostel B>", "price": <precio total 3 noches por persona>, "vibe": "<Descripción con humor>"}
    ]
  },
  "activities_suggestion": "<Una actividad única basada en los intereses del grupo, escrita con estilo 'must-do'>"
}

**IMPORTANTE:** 
- NO uses bloques de código markdown en tu respuesta
- Devuelve SOLO el JSON válido
- Usa precios REALES basados en tu conocimiento actualizado
- Si la ciudad es inviable por tiempo de vuelo, el viabilityScore debe ser 0
`;

        // Generate content with Gemini
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up potential markdown formatting
        let cleanedText = text.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.replace(/```\n?/g, "");
        }
        cleanedText = cleanedText.trim();

        // Parse the JSON response
        let reportData: CityReportResponse;
        try {
            reportData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error("Failed to parse AI response:", cleanedText);
            throw new Error(`AI returned invalid JSON: ${parseError.message}`);
        }

        // Validate required fields
        if (
            typeof reportData.viabilityScore !== "number" ||
            !reportData.flight_analysis ||
            !reportData.accommodation_analysis
        ) {
            throw new Error("AI response missing required fields");
        }

        // Return successful response
        return new Response(JSON.stringify(reportData), {
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
            },
            status: 200,
        });
    } catch (error: any) {
        console.error("Error in generate-city-report:", error);

        return new Response(
            JSON.stringify({
                error: error.message || "Internal server error",
                details: error.toString(),
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
                status: 500,
            }
        );
    }
});
