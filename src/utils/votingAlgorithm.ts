// ============================================
// PORCOS BRAVOS - REGLAS DE ORO
// ============================================

/**
 * Definición de un Voto emitido por un usuario.
 */
export interface Vote {
    userId: string;
    rankedCityIds: string[]; // El índice 0 es la favorita (Top 1)
}

/**
 * Reglas que aplican a una ronda específica.
 */
export interface RoundRules {
    phaseName: 'PHASE_ELIMINATION_BATCH' | 'PHASE_ELIMINATION_SINGLE' | 'PHASE_FINAL';
    countToEliminate: number;
    votingType: 'NEGATIVE' | 'POSITIVE';
    description: string; // Para mostrar en la UI
    title: string;       // Título de la fase (ej: LA PURGA)
}

/**
 * Calcula las reglas de la ronda actual basándose en el número total de ciudades.
 * * LAS REGLAS DE ORO (Lógica de Aterrizaje en 8):
 * * 1. FASE DE BARRIDO (> 8 ciudades):
 * - Objetivo: Bajar a 8 ciudades
 * - Cálculo: sobran = totalCities - 8
 * - Se eliminan las ciudades sobrantes, con MÁXIMO 3 por ronda
 * - Ejemplo: 10 ciudades → sobran 2 → eliminan 2
 * 12 ciudades → sobran 4 → eliminan 3 (quedan 9 para siguiente ronda)
 * - Tipo de voto: NEGATIVE (votar para echar)
 * * 2. FASE DE SUPERVIVENCIA (8 a 4 ciudades):
 * - Se elimina SIEMPRE 1 ciudad por ronda
 * - Tipo de voto: NEGATIVE (votar para echar)
 * * 3. FASE FINAL (3 ciudades o menos):
 * - NO se elimina nadie
 * - Se vota al GANADOR
 * - Tipo de voto: POSITIVE (votar para ganar)
 */
export function calculateRoundRules(totalCities: number): RoundRules {
    // FASE FINAL: 3 ciudades
    if (totalCities <= 3) {
        return {
            phaseName: 'PHASE_FINAL',
            countToEliminate: 0,
            votingType: 'POSITIVE',
            title: '🏆 GRAN FINAL',
            description: '¡FASE FINAL! Vota a tu ciudad FAVORITA para ganar.',
        };
    }

    // FASE DE SUPERVIVENCIA: 8 a 4 ciudades
    if (totalCities <= 8) {
        return {
            phaseName: 'PHASE_ELIMINATION_SINGLE',
            countToEliminate: 1,
            votingType: 'NEGATIVE',
            title: '🥊 RONDA KNOCKOUT',
            description: `Supervivencia: Eliminar 1 ciudad (quedarán ${totalCities - 1})`,
        };
    }

    // FASE DE BARRIDO: > 8 ciudades
    const sobran = totalCities - 8;
    const toEliminate = Math.min(3, sobran); // Máximo 3 por ronda

    return {
        phaseName: 'PHASE_ELIMINATION_BATCH',
        countToEliminate: toEliminate,
        votingType: 'NEGATIVE',
        title: '🔥 LA PURGA',
        description: `Barrido: Eliminar ${toEliminate} ciudades (objetivo: llegar a 8)`,
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

// Estructura interna para el acumulador
interface CityScore {
    cityId: string;
    totalPoints: number;
    firstPlaceCount: number;
}

/**
 * Procesa todos los votos y calcula la puntuación usando la fórmula de Borda.
 * * FÓRMULA BASE:
 * - Posición 1 (arriba) = N puntos (N = total de ciudades activas)
 * - Posición 2 = N-1 puntos
 * - Posición N (última) = 1 punto
 * * INTERPRETACIÓN SEGÚN FASE:
 * - NEGATIVE (Eliminación): Puntos = "Puntos de Odio"
 * → Más puntos = Más odiada = Candidata a eliminar
 * - POSITIVE (Final): Puntos = "Puntos de Amor"
 * → Más puntos = Más amada = Candidata a ganar
 * * DESEMPATE:
 * - Si dos ciudades tienen los mismos puntos totales, gana/pierde
 * la que tenga más "primeros puestos" (medallas de oro)
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

    // 3. Procesar cada voto (Fórmula de Borda)
    votes.forEach(vote => {
        vote.rankedCityIds.forEach((cityId, index) => {
            if (scores[cityId]) {
                // El primero (index 0) recibe N puntos, el último 1 punto
                const points = totalCities - index;
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

/**
 * Función Principal llamada por el Frontend.
 * Calcula directamente los IDs de los ELIMINADOS o del GANADOR.
 */
export const calculateSurvivalResults = (
    votes: Vote[],
    allCityIds: string[]
): string[] => {
    const totalCities = allCityIds.length;

    // 1. Calculamos las reglas (para saber cuántos eliminar)
    const rules = calculateRoundRules(totalCities);

    // 2. Procesamos los votos con todo el detalle (puntos y desempates)
    const rankedResults = processVotes(votes, allCityIds, totalCities);

    // 3. Decidir quién se va o quién gana según la fase
    if (rules.phaseName === 'PHASE_FINAL') {
        // FINAL: El Top 1 es el GANADOR (Return solo el ganador)
        // La lista viene ordenada por "Amor", así que el primero es el ganador.
        return [rankedResults[0].cityId];
    } else {
        // ELIMINACIÓN: Los Top N son los ELIMINADOS
        // La lista viene ordenada por "Odio", así que los primeros son los eliminados.
        return rankedResults
            .slice(0, rules.countToEliminate)
            .map(r => r.cityId);
    }
};