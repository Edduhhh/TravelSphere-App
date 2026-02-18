import axios from 'axios';

const BASE_URL = 'http://localhost:3005';
const SERVER_URL = `${BASE_URL}/api`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log("🚀 Starting Verification Test for Elimination Logic...");

    try {
        // 1. Create a Test Trip
        console.log("\n1. Creating Test Trip...");
        const tripRes = await axios.post(`${SERVER_URL}/lobby/crear`, {
            destino: "Test Trip Elimination",
            nombreAdmin: "TestAdmin"
        });

        if (!tripRes.data.success) throw new Error("Failed to create trip");

        const { viajeId, userId, codigo } = tripRes.data;
        console.log(`   ✅ Trip Created: ID ${viajeId}, Code ${codigo}`);

        // 2. Add 13 Candidates
        console.log("\n2. Adding 13 Candidates...");
        const cities = [
            "Rome", "Paris", "London", "Tokyo", "New York",
            "Berlin", "Madrid", "Lisbon", "Amsterdam", "Prague",
            "Vienna", "Budapest", "Dublin"
        ];

        const cityIds = [];
        for (const city of cities) {
            const candRes = await axios.post(`${SERVER_URL}/voting/proponer`, {
                viajeId,
                usuarioId: userId,
                ciudad: city
            });
            cityIds.push(candRes.data.id);
            process.stdout.write(".");
        }
        console.log("\n   ✅ 13 Candidates Added.");

        // 3. Force Start Voting
        console.log("\n3. Forcing Start Voting...");
        await axios.post(`${SERVER_URL}/viaje/cambiar-fase`, {
            viajeId,
            phase: 'voting',
            votingDate: new Date().toISOString()
        });
        console.log("   ✅ Voting Started.");

        // 4. Submit Vote (Last Vote)
        console.log("\n4. Submitting Admin Vote (Last Vote)...");
        // Voting ranking: same order as added
        const rankingIds = cityIds;

        await axios.post(`${SERVER_URL}/voting/enviar-ranking`, {
            viajeId,
            usuarioId: userId,
            rankingIds
        });
        console.log("   ✅ Vote Submitted.");

        // 5. Verify Phase is CALCULATING (NOT ELIMINATION)
        console.log("\n5. Verifying Phase is CALCULATING...");
        const statusRes1 = await axios.get(`${SERVER_URL}/viaje/estado?viajeId=${viajeId}`);
        const phase1 = statusRes1.data.voting_phase;

        if (phase1 === 'CALCULATING') {
            console.log("   ✅ CORRECT: Phase is CALCULATING.");
        } else {
            console.error(`   ❌ FAIL: Phase is ${phase1}, expected CALCULATING.`);
            // Continue anyway to see what happens
        }

        // 6. Trigger Calculation (Admin Action)
        console.log("\n6. Triggering Calculation (Admin)...");
        const calcRes = await axios.post(`${SERVER_URL}/voting/calcular-eliminaciones-V2`, {
            viajeId
        });

        const result1 = calcRes.data;
        console.log(`   📊 Result: Phase ${result1.phase}, Eliminated: ${result1.eliminated.length}, Remaining: ${result1.remaining}`);

        if (result1.eliminated.length === 3 && result1.remaining === 10) {
            console.log("   ✅ CORRECT: Eliminated 3 cities (13 -> 10).");
        } else {
            console.error(`   ❌ FAIL: Expected 3 eliminated, got ${result1.eliminated.length}.`);
        }

        // 7. Trigger Calculation AGAIN (Idempotency Check)
        console.log("\n7. Triggering Calculation AGAIN (Idempotency)...");
        const calcRes2 = await axios.post(`${SERVER_URL}/voting/calcular-eliminaciones-V2`, {
            viajeId
        });

        const result2 = calcRes2.data;
        // Compare IDs
        const ids1 = result1.eliminated.map(c => c.id).sort().join(',');
        const ids2 = result2.eliminated.map(c => c.id).sort().join(',');

        if (ids1 === ids2) {
            console.log("   ✅ CORRECT: Idempotency worked. Same cities returned.");
        } else {
            console.error(`   ❌ FAIL: Idempotency failed. IDs1: [${ids1}], IDs2: [${ids2}]`);
        }

        if (result2.remaining === 10) {
            console.log("   ✅ CORRECT: Remaining count stays at 10.");
        } else {
            console.error(`   ❌ FAIL: Remaining count changed to ${result2.remaining}.`);
        }

        console.log("\n🎉 Verification Complete!");

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
        if (error.response) {
            console.error("   Response Data:", error.response.data);
        }
    }
}

runTest();
