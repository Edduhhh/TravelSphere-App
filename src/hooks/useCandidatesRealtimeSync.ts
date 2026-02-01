import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Candidate {
    id: number;
    trip_code: string;
    user_id: number;
    user_name: string;
    city_name: string;
    viability_data: any;
    photo_url: string | null;
    points: number;
    created_at: string;
}

interface UseCandidatesRealtimeSyncOptions {
    tripCode: string;
    onCandidateAdded: (candidate: Candidate) => void;
    enabled?: boolean;
}

export function useCandidatesRealtimeSync({
    tripCode,
    onCandidateAdded,
    enabled = true
}: UseCandidatesRealtimeSyncOptions) {
    useEffect(() => {
        if (!tripCode || !enabled) {
            console.log('🔕 [CANDIDATES REALTIME] Disabled or no trip code');
            return;
        }

        console.log(`🔥 [CANDIDATES REALTIME] Subscribing to trip: ${tripCode}`);

        const channel = supabase
            .channel(`candidates-${tripCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'candidates',
                    filter: `trip_code=eq.${tripCode}`
                },
                (payload: any) => {
                    console.log('🆕 [CANDIDATES REALTIME] New candidate detected:', payload.new);
                    onCandidateAdded(payload.new as Candidate);
                }
            )
            .subscribe((status: string) => {
                console.log(`📡 [CANDIDATES REALTIME] Subscription status: ${status}`);
            });

        return () => {
            console.log(`🔌 [CANDIDATES REALTIME] Unsubscribing from trip: ${tripCode}`);
            supabase.removeChannel(channel);
        };
    }, [tripCode, enabled, onCandidateAdded]);
}
