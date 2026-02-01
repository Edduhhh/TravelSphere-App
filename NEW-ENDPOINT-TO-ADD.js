// ADD THIS TO server.js BEFORE THE FINAL app.listen() LINE

app.post('/api/voting/calcular-eliminaciones', (req, res) => {
    const { viajeId } = req.body;
    console.log(`\n🔥 [ELIMINAR] Calculando para viaje: ${viajeId}`);

    try {
        // Get all active candidates sorted by points (already calculated from votes)
        const cands = db.prepare(`
            SELECT id, ciudad, puntos, votos_pos1
            FROM candidaturas
            WHERE viaje_id = ? AND (eliminada IS NULL OR eliminada = 0)
            ORDER BY puntos DESC, votos_pos1 DESC, id ASC
        `).all(viajeId);

        console.log(`📋 Active cities: ${cands.length}`);
        cands.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c.ciudad} - ${c.puntos} points`);
        });

        const total = cands.length;
        let toElim = 0;

        // Determine how many to eliminate based on current count
        if (total > 8) {
            toElim = Math.min(3, total - 8);  // Batch elimination to reach 8
        } else if (total > 3) {
            toElim = 1;  // Single elimination between 8 and 3
        } else {
            // Final phase - declare winner (highest points)
            const winner = cands[0];
            console.log(`🏆 WINNER: ${winner.ciudad}`);
            return res.json({
                success: true,
                phase: 'FINAL',
                winner: winner,
                eliminated: []
            });
        }

        // Top N candidates (highest points) are eliminated (negative voting)
        const elims = cands.slice(0, toElim);
        console.log(`\n❌ Eliminating: ${elims.map(c => c.ciudad).join(', ')}`);

        // Mark as eliminated in database
        db.transaction(() => {
            elims.forEach(c => {
                db.prepare('UPDATE candidaturas SET eliminada = 1 WHERE id = ?').run(c.id);
            });
        })();

        console.log(`✅ Database updated. ${total - toElim} cities remaining\n`);

        res.json({
            success: true,
            phase: total > 8 ? 'BARRIDO' : 'SUPERVIVENCIA',
            eliminated: elims.map(c => ({ id: c.id, ciudad: c.ciudad, puntos: c.puntos })),
            remaining: total - toElim
        });

    } catch (e) {
        console.error('❌ Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});
