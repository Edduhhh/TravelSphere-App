// 🔥 Hook para Supabase Realtime - Sincronización instantánea
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const useVotingRealtimeSync = (
    tripCode: string | null,
    onVotingStateChange: (data: any) => void
) => {
    useEffect(() => {
        if (!tripCode) return;

        console.log(`🔥 [REALTIME] Suscrito a cambios en trip: ${tripCode}`);

        const channel = supabase
            .channel(`trip-${tripCode}`)
            // 1. Cambios en el ESTADO DEL VIAJE (Fechas, Fase)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'trips',
                    filter: `code=eq.${tripCode}`
                },
                (payload) => {
                    console.log('🔥 [REALTIME TRIP] Cambio detectado:', payload.new);
                    onVotingStateChange({ type: 'trip_update', data: payload.new });
                }
            )
            // 2. Cambios en CANDIDATOS (Nuevas ciudades o eliminaciones)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'candidates',
                    filter: `trip_code=eq.${tripCode}`
                },
                (payload) => {
                    console.log('🔥 [REALTIME CANDIDATE] Cambio en candidatos:', payload);
                    onVotingStateChange({ type: 'candidates_changed', data: payload });
                }
            )
            .subscribe((status) => {
                console.log(`🔥 [REALTIME] Estado: ${status}`);
            });

        return () => {
            console.log(`🔥 [REALTIME] Desuscrito de trip: ${tripCode}`);
            channel.unsubscribe();
        };
    }, [tripCode]);
};
