// TravelSphere - Type Definitions
// Database types and interfaces

export type TripPhase = 'PLANNING' | 'VOTING' | 'FINISHED';

export interface Trip {
    id: string;
    created_at: string;
    admin_user_id: string;
    destination?: string;
    budget?: number;
    group_size?: number;
    start_date?: string;
    end_date?: string;
    status: string; // 'active' | 'finished' | 'cancelled'

    // Phase system (NEW)
    phase: TripPhase;
    voting_start_date?: string | null;
}

export interface TripCity {
    id: string;
    trip_id: string;
    city_name: string;
    proposed_by_user_id: string;
    is_eliminated: boolean;
    ai_analysis_data?: any;
    created_at: string;
}

export interface TripVote {
    id: string;
    trip_id: string;
    user_id: string;
    ranked_city_ids: string[];
    created_at: string;
}

export interface TripParticipant {
    id: string;
    trip_id: string;
    user_id: string;
    is_admin: boolean;
    joined_at: string;
}
