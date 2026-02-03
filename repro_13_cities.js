
import axios from 'axios';

const BASE_URL = 'http://localhost:3005/api';

async function runRepro() {
    console.log('🚀 Starting 13-City Elimination Reproduction...');

    try {
        // 1. Create Trip
        const createRes = await axios.post(`${BASE_URL}/lobby/crear`, {
            destino: '13 City Test',
            nombreAdmin: 'AdminUser'
        });
        const { viajeId, userId: adminId } = createRes.data;
        console.log(`✅ Trip Created: ID=${viajeId}`);

        // 2. Add 13 Cities
        const cities = [
            'City 01', 'City 02', 'City 03', 'City 04', 'City 05',
            'City 06', 'City 07', 'City 08', 'City 09', 'City 10',
            'City 11', 'City 12', 'City 13'
        ];

        console.log(`\n--- Adding ${cities.length} Cities ---`);
        const cityIds = [];
        for (const city of cities) {
            const propRes = await axios.post(`${BASE_URL}/voting/proponer`, {
                viajeId,
                usuarioId: adminId,
                ciudad: city
            });
            cityIds.push(propRes.data.id);
        }
        console.log(`✅ Added ${cityIds.length} cities.`);

        // 3. Start Voting (Set date to past)
        await axios.post(`${BASE_URL}/viaje/fijar-fechas`, {
            viajeId,
            votingStartDate: new Date(Date.now() - 10000).toISOString()
        });

        // 4. Vote (Admin only is enough to trigger calc if it's the only user)
        // We will vote for them in order. 
        // 01 is favorite (index 0). 13 is least favorite (index 12).
        console.log('\n--- Submitting Votes ---');
        await axios.post(`${BASE_URL}/voting/enviar-ranking`, {
            viajeId,
            usuarioId: adminId,
            rankingIds: cityIds // [id1, id2, ..., id13]
        });

        // 5. Calculate Eliminations (Simulate endpoint call)
        console.log('\n--- Calculating Eliminations ---');
        const calcRes = await axios.post(`${BASE_URL}/voting/calcular-eliminaciones`, { viajeId });

        const eliminated = calcRes.data.eliminated;
        console.log(`\n📊 Results:`);
        console.log(`   Phase: ${calcRes.data.phase}`);
        console.log(`   Eliminated Count: ${eliminated.length}`);
        eliminated.forEach(e => console.log(`      - ${e.ciudad} (Points: ${e.points})`));

        if (eliminated.length === 2 && cities.length === 13) {
            console.log('\n❌ BUG REPRODUCED: 13 cities -> 2 eliminated (Expected 3)');
        } else if (eliminated.length === 3) {
            console.log('\n✅ LOGIC CORRECT: 13 cities -> 3 eliminated');
        } else {
            console.log(`\n❓ UNEXPECTED RESULT: ${eliminated.length} eliminated`);
        }

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

runRepro();
