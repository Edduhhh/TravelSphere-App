
import axios from 'axios';

const BASE_URL = 'http://localhost:3005/api';

async function runTest() {
    console.log('🚀 Starting Backend Verification Flow...');

    try {
        // 1. Create Trip
        console.log('\n--- 1. Creating Trip ---');
        const createRes = await axios.post(`${BASE_URL}/lobby/crear`, {
            destino: 'Backend Test Trip',
            nombreAdmin: 'AdminUser'
        });

        const { viajeId, codigo, userId: adminId } = createRes.data;
        console.log(`✅ Trip Created: ID=${viajeId}, Code=${codigo}, AdminID=${adminId}`);

        // 2. Join Guest
        console.log('\n--- 2. Joining Guest ---');
        const joinRes = await axios.post(`${BASE_URL}/lobby/unirse`, {
            codigo: codigo,
            nombre: 'GuestUser'
        });
        const guestId = joinRes.data.userId;
        console.log(`✅ Guest Joined: ID=${guestId}`);

        // 3. Set Voting Dates (Start Voting)
        console.log('\n--- 3. Starting Voting Phase ---');
        // Set date to past to open voting immediately
        const pastDate = new Date(Date.now() - 10000).toISOString();
        await axios.post(`${BASE_URL}/viaje/fijar-fechas`, {
            viajeId,
            votingStartDate: pastDate
        });
        console.log('✅ Voting Started (Date set to past)');

        // 4. Propose Candidates
        console.log('\n--- 4. Proposing Candidates ---');
        const cities = ['City A', 'City B', 'City C', 'City D', 'City E'];
        const candidateIds = [];

        for (const city of cities) {
            const propRes = await axios.post(`${BASE_URL}/voting/proponer`, {
                viajeId,
                usuarioId: adminId,
                ciudad: city
            });
            candidateIds.push(propRes.data.id);
            console.log(`   Proposed ${city}: ID=${propRes.data.id}`);
        }

        // 5. Submit Votes (Trigger Auto-Elimination)
        console.log('\n--- 5. Submitting Votes ---');
        // Admin votes
        // Rank: City A (1st), City B (2nd), City C (3rd) -> Points: 5, 4, 3 (assuming 5 candidates)
        // Actually points logic in server.js: points = totalCities - index.
        // totalCities = 5.
        // Vote: [City A, City B, City C, City D, City E]

        await axios.post(`${BASE_URL}/voting/enviar-ranking`, {
            viajeId,
            usuarioId: adminId,
            rankingIds: candidateIds // id of A, B, C, D, E in order
        });
        console.log('✅ Admin Voted');

        // Guest votes same order
        const voteRes = await axios.post(`${BASE_URL}/voting/enviar-ranking`, {
            viajeId,
            usuarioId: guestId,
            rankingIds: candidateIds
        });
        console.log('✅ Guest Voted');

        // 6. Check Elimination Results
        // elimination should have triggered on last vote
        console.log('\n--- 6. Checking Status ---');
        const statusRes = await axios.get(`${BASE_URL}/viajes/${viajeId}/voting-state`);
        console.log('Current State:', statusRes.data);

        // Check candidates to see who is eliminated
        // server.js logic:
        // totalCandidates = 5. Logic: if > 3, eliminate some.
        // scores: A (most points, because ranked first?), wait server logic:
        // points += (totalCities - index).
        // index 0 (first) gets 5 points.
        // sorted by points DESC. 
        // "Mayor puntuación = Más Odiado (eliminable)" -> WAIT.
        // If I rank City A as #1 (My favorite), it gets 5 points.
        // If server sorts by points DESC and eliminates top... then FAVORITES are eliminated?
        // Let's check server.js line 837:
        // "Mayor puntuación = Más Odiado (eliminable)"
        // But in `enviar-ranking` (line 618): points = rankingIds.length - index;
        // If I send [A, B, C], A is index 0. points = 3 - 0 = 3. A gets MAX points.
        // So A (my favorite) gets MAX points.
        // If 'sorted' is DESC (b.points - a.points), then A is at top.
        // If 'eliminated' is top of list (sorted.slice(0...)), then A (Favorite) is ELIMINATED?

        // This seems to be the "Porcos Bravos" logic described in previous conversations ("Survival").
        // "Positive vote among the last three". 
        // But if `points` represents "favoritism", eliminating highest points means eliminating favorites.
        // UNLESS the prompt says "Survival" implies eliminating the ones we DON'T like?
        // Server comment line 837: "Mayor puntuación = Más Odiado". 
        // But logic line 618 `points = length - index` implies index 0 (top choice) gets MOST points.
        // So Top Choice = Most Points = Most Hated? 
        // That implies the UI sends "Most Hated" as index 0.
        // Or the logic is inverted.

        // Verify via API output.
        const candsRes = await axios.get(`${BASE_URL}/voting/candidaturas?viajeId=${viajeId}&usuarioId=${adminId}`);
        const allCands = candsRes.data.candidaturas || candsRes.data; // adjust based on endpoint return

        if (Array.isArray(allCands)) {
            console.log('Candidates status:');
            allCands.forEach(c => {
                console.log(`   ${c.ciudad}: Puntos=${c.puntos}, Eliminada=${c.eliminada}`);
            });
        } else if (allCands.candidaturas) {
            console.log('Candidates status:');
            allCands.candidaturas.forEach(c => {
                console.log(`   ${c.ciudad}: Puntos=${c.puntos}, Eliminada=${c.eliminada}`);
            });
        }

        // 7. Reset for Next Round
        console.log('\n--- 7. Resetting for Next Round ---');
        await axios.post(`${BASE_URL}/voting/reset-votes`, { viajeId });
        console.log('✅ Votes Reset');

        // Check verification: votes should be gone
        const progressRes = await axios.get(`${BASE_URL}/voting/progreso?viajeId=${viajeId}`);
        console.log('Progress after reset:', progressRes.data);
        if (progressRes.data.votedUsers === 0) {
            console.log('✅ Setup Clean verified (votedUsers is 0)');
        } else {
            console.error('❌ Reset failed, votedUsers:', progressRes.data.votedUsers);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response?.data || error.message);
    }
}

runTest();
