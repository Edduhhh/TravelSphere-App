import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// PORCOS BRAVOS - VOTING LOGIC (Ported from frontend)
// ============================================

interface Vote {
    userId: string;
    rankedCityIds: string[];
}

interface VoteResult {
    cityId: string;
    totalPoints: number;
    firstPlaceCount: number;
    interpretation: 'hate' | 'love';
}

interface RoundRules {
    phaseName: 'PHASE_ELIMINATION_BATCH' | 'PHASE_ELIMINATION_SINGLE' | 'PHASE_FINAL';
    countToEliminate: number;
    votingType: 'NEGATIVE' | 'POSITIVE';
    description: string;
}

function calculateRoundRules(totalCities: number): RoundRules {
    if (totalCities === 3) {
        return {
            phaseName: 'PHASE_FINAL',
            countToEliminate: 0,
            votingType: 'POSITIVE',
            description: '¡FASE FINAL! Vota a tu ciudad FAVORITA para ganar.',
        };
    }

    if (totalCities >= 4 && totalCities <= 8) {
        return {
            phaseName: 'PHASE_ELIMINATION_SINGLE',
            countToEliminate: 1,
            votingType: 'NEGATIVE',
            description: `Supervivencia: Eliminar 1 ciudad (quedarán ${totalCities - 1})`,
        };
    }

    if (totalCities > 8) {
        const sobran = totalCities - 8;
        const toEliminate = Math.min(3, sobran);

        return {
            phaseName: 'PHASE_ELIMINATION_BATCH',
            countToEliminate: toEliminate,
            votingType: 'NEGATIVE',
            description: `Barrido: Eliminar ${toEliminate} ciudades (objetivo: llegar a 8)`,
        };
    }

    return {
        phaseName: 'PHASE_FINAL',
        countToEliminate: 0,
        votingType: 'POSITIVE',
        description: 'Menos de 3 ciudades detectadas - votación final',
    };
}

function processVotes(
    votes: Vote[],
    allCityIds: string[],
    totalCities: number
): VoteResult[] {
    const rules = calculateRoundRules(totalCities);
    const interpretation: 'hate' | 'love' = rules.votingType === 'NEGATIVE' ? 'hate' : 'love';

    const scores: Record<string, { cityId: string; totalPoints: number; firstPlaceCount: number }> = {};
    allCityIds.forEach(id => {
        scores[id] = { cityId: id, totalPoints: 0, firstPlaceCount: 0 };
    });

    const numCities = allCityIds.length;

    votes.forEach(vote => {
        vote.rankedCityIds.forEach((cityId, index) => {
            if (scores[cityId]) {
                const points = numCities - index;
                scores[cityId].totalPoints += points;

                if (index === 0) {
                    scores[cityId].firstPlaceCount += 1;
                }
            }
        });
    });

    const results = Object.values(scores)
        .map(score => ({
            cityId: score.cityId,
            totalPoints: score.totalPoints,
            firstPlaceCount: score.firstPlaceCount,
            interpretation,
        }))
        .sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            return b.firstPlaceCount - a.firstPlaceCount;
        });

    return results;
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: req.headers.get('Authorization')! },
                },
            }
        );

        const { tripId } = await req.json();

        if (!tripId) {
            throw new Error('tripId is required');
        }

        console.log(`🎯 Resolving round for trip: ${tripId}`);

        // ============================================
        // 1. CARGA DE DATOS
        // ============================================

        // Obtener ciudades activas (no eliminadas)
        const { data: activeCities, error: citiesError } = await supabaseClient
            .from('trip_cities')
            .select('id, city_name')
            .eq('trip_id', tripId)
            .eq('is_eliminated', false);

        if (citiesError) throw citiesError;
        if (!activeCities || activeCities.length === 0) {
            throw new Error('No active cities found for this trip');
        }

        const activeCityIds = activeCities.map(c => c.id);
        console.log(`📊 Active cities: ${activeCities.length}`, activeCities.map(c => c.city_name));

        // Obtener todos los votos de la ronda actual
        const { data: votes, error: votesError } = await supabaseClient
            .from('trip_votes')
            .select('user_id, ranked_city_ids')
            .eq('trip_id', tripId);

        if (votesError) throw votesError;

        const formattedVotes: Vote[] = (votes || []).map(v => ({
            userId: v.user_id,
            rankedCityIds: v.ranked_city_ids,
        }));

        console.log(`🗳️ Total votes: ${formattedVotes.length}`);

        // ============================================
        // 2. EL CEREBRO (Calcular resultados)
        // ============================================

        const rules = calculateRoundRules(activeCities.length);
        console.log(`📋 Round rules:`, rules);

        const results = processVotes(formattedVotes, activeCityIds, activeCities.length);
        console.log(`🏆 Vote results (top 5):`, results.slice(0, 5));

        // ============================================
        // 3. LA GUILLOTINA (Aplicar cambios a DB)
        // ============================================

        let eliminated: string[] = [];
        let winner: string | null = null;
        let tripStatus = 'active';

        if (rules.votingType === 'NEGATIVE') {
            // FASE DE ELIMINACIÓN
            const toEliminate = results.slice(0, rules.countToEliminate);
            eliminated = toEliminate.map(r => r.cityId);

            console.log(`❌ Eliminating ${eliminated.length} cities:`,
                toEliminate.map(r => activeCities.find(c => c.id === r.cityId)?.city_name));

            // Actualizar base de datos
            const { error: updateError } = await supabaseClient
                .from('trip_cities')
                .update({ is_eliminated: true })
                .in('id', eliminated);

            if (updateError) throw updateError;

        } else {
            // FASE FINAL (POSITIVE)
            const winningResult = results[0];
            winner = winningResult.cityId;
            tripStatus = 'finished';

            console.log(`🎊 WINNER:`, activeCities.find(c => c.id === winner)?.city_name);

            // Actualizar el viaje
            const { error: tripUpdateError } = await supabaseClient
                .from('trips')
                .update({
                    status: 'finished',
                    winning_city_id: winner
                })
                .eq('id', tripId);

            if (tripUpdateError) throw tripUpdateError;
        }

        // Limpiar votos para la siguiente ronda
        await supabaseClient
            .from('trip_votes')
            .delete()
            .eq('trip_id', tripId);

        // ============================================
        // 4. RESPUESTA
        // ============================================

        const remainingCities = activeCities.length - eliminated.length;

        return new Response(
            JSON.stringify({
                success: true,
                phase: rules.phaseName,
                eliminated,
                eliminatedNames: eliminated.map(id => activeCities.find(c => c.id === id)?.city_name),
                winner,
                winnerName: winner ? activeCities.find(c => c.id === winner)?.city_name : null,
                remainingCities,
                tripStatus,
                newRound: remainingCities,
                description: rules.description,
            }),
            {
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json",
                },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Error in resolve-round:", error);

        return new Response(
            JSON.stringify({
                success: false,
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
