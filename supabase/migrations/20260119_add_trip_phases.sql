-- Migration: Add phase system to trips table
-- Created: 2026-01-19
-- Purpose: Implement professional trip flow with PLANNING -> VOTING -> FINISHED phases

-- Add phase column with default 'PLANNING'
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS phase text DEFAULT 'PLANNING';

-- Add voting_start_date column (nullable)
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS voting_start_date timestamptz;

-- Add constraint to ensure valid phase values
ALTER TABLE trips
ADD CONSTRAINT trips_phase_check 
CHECK (phase IN ('PLANNING', 'VOTING', 'FINISHED'));

-- Add index for performance when filtering by phase
CREATE INDEX IF NOT EXISTS idx_trips_phase ON trips(phase);

-- Add comment for documentation
COMMENT ON COLUMN trips.phase IS 'Current phase of the trip: PLANNING (default), VOTING, or FINISHED';
COMMENT ON COLUMN trips.voting_start_date IS 'Timestamp when voting phase starts (set by admin)';
