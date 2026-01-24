// ============================================
// PORCOS BRAVOS - REGLAS DE ORO
// ============================================

export interface RoundRules {
    phaseName: 'PHASE_ELIMINATION_BATCH' | 'PHASE_ELIMINATION_SINGLE' | 'PHASE_FINAL';
    countToEliminate: number;
    votingType: 'NEGATIVE' | 'POSITIVE';
    description: string; // Para debug/UI
}

/**
 * Calcula las reglas de la ronda actual basándose en el número total de ciudades.
 * 
 * LAS REGLAS DE ORO (Lógica de Aterrizaje en 8):
 * 
 * 1. FASE DE BARRIDO (> 8 ciudades):
 *    - Objetivo: Bajar a 8 ciudades
 *    - Cálculo: sobran = totalCities - 8
 *    - Se eliminan las ciudades sobrantes, con MÁXIMO 3 por ronda
 *    - Ejemplo: 10 ciudades → sobran 2 → eliminan 2
 *              12 ciudades → sobran 4 → eliminan 3 (quedan 9 para siguiente ronda)
 *    - Tipo de voto: NEGATIVE (votar para echar)
 * 
 * 2. FASE DE SUPERVIVENCIA (8 a 4 ciudades):
 *    - Se elimina SIEMPRE 1 ciudad por ronda
 *    - Tipo de voto: NEGATIVE (votar para echar)
 * 
 * 3. FASE FINAL (3 ciudades):
 *    - NO se elimina nadie
 *    - Se vota al GANADOR
 *    - Tipo de voto: POSITIVE (votar para ganar)
 * 
 * @param totalCities - Número actual de ciudades en competencia
 * @returns Reglas para la ronda actual
 */
export function calculateRoundRules(totalCities: number): RoundRules {
    // FASE FINAL: 3 ciudades
    if (totalCities === 3) {
        return {
            phaseName: 'PHASE_FINAL',
            countToEliminate: 0,
            votingType: 'POSITIVE',
            description: '¡FASE FINAL! Vota a tu ciudad FAVORITA para ganar.',
        };
    }

    // FASE DE SUPERVIVENCIA: 8 a 4 ciudades
    if (totalCities >= 4 && totalCities <= 8) {
        return {
            phaseName: 'PHASE_ELIMINATION_SINGLE',
            countToEliminate: 1,
            votingType: 'NEGATIVE',
            description: `Supervivencia: Eliminar 1 ciudad (quedarán ${totalCities - 1})`,
        };
    }

    // FASE DE BARRIDO: > 8 ciudades
    if (totalCities > 8) {
        const sobran = totalCities - 8;
        const toEliminate = Math.min(3, sobran); // Máximo 3 por ronda

        return {
            phaseName: 'PHASE_ELIMINATION_BATCH',
            countToEliminate: toEliminate,
            votingType: 'NEGATIVE',
            description: `Barrido: Eliminar ${toEliminate} ciudades (objetivo: llegar a 8)`,
        };
    }

    // CASO EDGE: < 3 ciudades (no debería pasar, pero por seguridad)
    return {
        phaseName: 'PHASE_FINAL',
        countToEliminate: 0,
        votingType: 'POSITIVE',
        description: 'Menos de 3 ciudades detectadas - votación final',
    };
}

// ============================================
// MOTOR DE SCORING (Recuento de Votos)
// ============================================

export interface VoteResult {
    cityId: string;
    totalPoints: number;
    firstPlaceCount: number; // Para desempate olímpico
    interpretation: 'hate' | 'love'; // Según el tipo de votación
}

/**
 * Procesa todos los votos y calcula la puntuación usando la fórmula de Borda.
 * 
 * FÓRMULA BASE:
 * - Posición 1 (arriba) = N puntos (N = total de ciudades activas)
 * - Posición 2 = N-1 puntos
 * - Posición N (última) = 1 punto
 * 
 * INTERPRETACIÓN SEGÚN FASE:
 * - NEGATIVE (Eliminación): Puntos = "Puntos de Odio"
 *   → Más puntos = Más odiada = Candidata a eliminar
 * - POSITIVE (Final): Puntos = "Puntos de Amor"
 *   → Más puntos = Más amada = Candidata a ganar
 * 
 * DESEMPATE:
 * - Si dos ciudades tienen los mismos puntos totales, gana/pierde
 *   la que tenga más "primeros puestos" (medallas de oro)
 * 
 * @param votes - Array de votos de los usuarios (cada voto es una lista ordenada)
 * @param allCityIds - Todas las ciudades activas en la ronda
 * @param totalCities - Total de ciudades (para calcular reglas)
 * @returns Array de resultados ordenado (los primeros son eliminados/ganadores según fase)
 */
export function processVotes(
    votes: Vote[],
    allCityIds: string[],
    totalCities: number
): VoteResult[] {
    // 1. Obtener reglas de la fase actual
    const rules = calculateRoundRules(totalCities);
    const interpretation: 'hate' | 'love' = rules.votingType === 'NEGATIVE' ? 'hate' : 'love';

    // 2. Inicializar puntuaciones
    const scores: Record<string, CityScore> = {};
    allCityIds.forEach(id => {
        scores[id] = { cityId: id, totalPoints: 0, firstPlaceCount: 0 };
    });

    const numCities = allCityIds.length;

    // 3. Procesar cada voto (Fórmula de Borda)
    votes.forEach(vote => {
        vote.rankedCityIds.forEach((cityId, index) => {
            if (scores[cityId]) {
                // El primero (index 0) recibe N puntos, el último 1 punto
                const points = numCities - index;
                scores[cityId].totalPoints += points;

                // Contar "Medallas de Oro" para desempates
                if (index === 0) {
                    scores[cityId].firstPlaceCount += 1;
                }
            }
        });
    });

    // 4. Convertir a array y ordenar
    // SIEMPRE ordenamos de MAYOR a MENOR puntuación
    // En NEGATIVE: Los de arriba son los más odiados (a eliminar)
    // En POSITIVE: El de arriba es el más amado (ganador)
    const results = Object.values(scores)
        .map(score => ({
            cityId: score.cityId,
            totalPoints: score.totalPoints,
            firstPlaceCount: score.firstPlaceCount,
            interpretation,
        }))
        .sort((a, b) => {
            // Ordenar por puntos totales (descendente)
            if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
            }
            // Desempate olímpico: más primeros puestos gana/pierde
            return b.firstPlaceCount - a.firstPlaceCount;
        });

    return results;
}

// ============================================
// TIPOS DE DATOS BÁSICOS PARA EL ALGORITMO
// ============================================

export interface Vote {
    userId: string;
    rankedCityIds: string[]; // Orden de preferencia (Index 0 = El más fuerte)
}

export interface CityScore {
    cityId: string;
    totalPoints: number;
    firstPlaceCount: number; // Para desempate olímpico
}

/**
 * Calcula los resultados basándose en la fase actual.
 * * LÓGICA DE PUNTUACIÓN INVERSA/DIRECTA:
 * - En fases de ELIMINACIÓN (Purga/Knockout): 
 * Estar arriba (Index 0) da MÁXIMOS PUNTOS DE "ODIO". 
 * Se eliminan los que tienen MÁS puntos.
 * * - En fase FINAL:
 * Estar arriba (Index 0) da MÁXIMOS PUNTOS DE "AMOR".
 * Gana el que tiene MÁS puntos.
 */
export const calculateSurvivalResults = (
    votes: Vote[],
    allCityIds: string[],
    phase: 'purga' | 'knockout' | 'final'
): string[] => {

    // 1. Inicializar puntuaciones
    const scores: Record<string, CityScore> = {};
    allCityIds.forEach(id => {
        scores[id] = { cityId: id, totalPoints: 0, firstPlaceCount: 0 };
    });

    const numCities = allCityIds.length;

    // 2. Procesar cada voto
    votes.forEach(vote => {
        vote.rankedCityIds.forEach((cityId, index) => {
            if (scores[cityId]) {
                // Fórmula de Borda: El primero (index 0) recibe N puntos, el último 1 punto.
                // En eliminación: N puntos = MÁXIMO PELIGRO.
                // En final: N puntos = MÁXIMA VICTORIA.
                const points = numCities - index;

                scores[cityId].totalPoints += points;

                // Contar "Medallas de Oro" (Veces puesto en posición 1) para desempates
                if (index === 0) {
                    scores[cityId].firstPlaceCount += 1;
                }
            }
        });
    });

    // 3. Convertir a array y ordenar
    // Ordenamos siempre de MAYOR a MENOR puntuación total.
    // En caso de empate, gana/pierde quien tenga más "primeros puestos".
    const rankedCities = Object.values(scores).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints; // Más puntos primero
        }
        return b.firstPlaceCount - a.firstPlaceCount; // Desempate olímpico
    });

    // 4. Decidir quién se va o quién gana según la fase
    if (phase === 'final') {
        // FINAL: El Top 1 es el GANADOR (Return solo el ganador)
        return [rankedCities[0].cityId];
    } else {
        // ELIMINACIÓN: Los Top N son los ELIMINADOS
        // ¿Cuántos eliminamos?
        let eliminationCount = 1;
        if (phase === 'purga') {
            // En purga eliminamos el exceso sobre 8 (máximo 3)
            const excess = numCities - 8;
            eliminationCount = Math.min(3, Math.max(1, excess));
        }

        // Devolvemos los IDs de las ciudades ELIMINADAS (las que tuvieron más puntos)
        return rankedCities.slice(0, eliminationCount).map(c => c.cityId);
    }
};