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

        // Suscribirse a cambios en tabla 'trips' para este código
        const channel = supabase
            .channel(`trip-${tripCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'trips',
                    filter: `code=eq.${tripCode}`
                },
                (payload) => {
                    console.log('🔥 [REALTIME] Cambio detectado:', payload.new);
                    onVotingStateChange(payload.new);
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
