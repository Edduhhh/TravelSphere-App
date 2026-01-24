import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la Edge Function de Análisis de Ciudades
export interface CityAnalysisRequest {
    city: string;
    budget?: number;
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

export interface CityAnalysisResponse {
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

/**
 * Llama a la Edge Function de Supabase para analizar la viabilidad de un destino
 * usando Google Gemini AI
 */
export async function analyzeCity(cityData: CityAnalysisRequest): Promise<CityAnalysisResponse> {
    const { data, error } = await supabase.functions.invoke('generate-city-report', {
        body: cityData
    });

    // 🔥 DEBUG: Mostrar respuesta completa de Supabase
    console.log('🔥 RESPUESTA SUPABASE:', data);
    console.log('🔥 ERROR SUPABASE:', error);

    if (error) {
        console.error('❌ Error calling Edge Function:', error);
        alert('Error recibiendo datos reales: ' + (error.message || JSON.stringify(error)));
        throw error;
    }

    if (!data) {
        console.error('❌ Data is empty/null from Supabase');
        alert('Error: La respuesta de Supabase está vacía. No hay datos para mostrar.');
        throw new Error('Empty response from Supabase');
    }

    return data as CityAnalysisResponse;
}

