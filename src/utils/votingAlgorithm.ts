// Tipos de datos básicos para el algoritmo
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