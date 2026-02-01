import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

async function checkSupabaseData() {
    console.log('🔍 Checking Supabase trips table...\n');

    const { data, error } = await supabase
        .from('trips')
        .select('*');

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    console.log(`Found ${data.length} trip(s) in Supabase:\n`);

    data.forEach(trip => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Code: ${trip.code}`);
        console.log(`Name: ${trip.name}`);
        console.log(`Voting Start Date: ${trip.voting_start_date || 'NULL'}`);
        console.log(`Is Voting Open: ${trip.is_voting_open} ${trip.is_voting_open ? '⚠️ PROBLEM!' : '✅'}`);
        console.log(`Current Round: ${trip.current_round}`);
        console.log(`Created: ${trip.created_at}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    });

    // Check for problematic entries
    const problematic = data.filter(t => t.is_voting_open === true && !t.voting_start_date);
    if (problematic.length > 0) {
        console.log('⚠️  WARNING: Found trips with is_voting_open=true but NO voting_start_date!');
        console.log('   This could cause immediate jump to Gran Final.\n');
    }

    const openWithFutureDate = data.filter(t => {
        if (!t.is_voting_open || !t.voting_start_date) return false;
        return new Date(t.voting_start_date) > new Date();
    });

    if (openWithFutureDate.length > 0) {
        console.log('⚠️  WARNING: Found trips with is_voting_open=true but future voting_start_date!');
        console.log('   The voting is marked as open before the countdown finished.\n');
    }
}

checkSupabaseData().then(() => {
    console.log('✅ Check complete');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
