// 🐷 PORCOS BRAVOS - Travel Configuration
// Configuración de restricciones de viaje para el grupo

export interface TravelConfig {
    origins: {
        primary: string;
        secondary: string;
        secondarySavingsThreshold: number; // Percentage
    };
    timeLimits: {
        maxTravelTime: number; // minutes
    };
    defaultDates: {
        dayOfWeek: string;
        duration: number; // days
    };
}

export const travelConfig: TravelConfig = {
    origins: {
        primary: 'LCG', // A Coruña - Prioridad Alta
        secondary: 'SCQ', // Santiago - Solo si ahorro > 20%
        secondarySavingsThreshold: 20 // Percentage
    },
    timeLimits: {
        maxTravelTime: 480 // 8 hours strict limit
    },
    defaultDates: {
        dayOfWeek: 'Thursday', // Jueves a Domingo
        duration: 4 // 4 días (Thu-Sun)
    }
};

/**
 * Valida si un aeropuerto secundario es aceptable
 * @param primaryPrice Precio desde aeropuerto primario
 * @param secondaryPrice Precio desde aeropuerto secundario
 * @returns true si el ahorro justifica usar el secundario
 */
export const isSecondaryAirportAcceptable = (
    primaryPrice: number,
    secondaryPrice: number
): boolean => {
    const savingsPercentage = ((primaryPrice - secondaryPrice) / primaryPrice) * 100;
    return savingsPercentage > travelConfig.origins.secondarySavingsThreshold;
};

/**
 * Valida si el tiempo de viaje es aceptable
 * @param travelTimeMinutes Tiempo de viaje en minutos
 * @returns true si está dentro del límite
 */
export const isTravelTimeAcceptable = (travelTimeMinutes: number): boolean => {
    return travelTimeMinutes <= travelConfig.timeLimits.maxTravelTime;
};
