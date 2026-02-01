// Reemplaza el endpoint /api/viaje/fijar-fechas (líneas 297-328 aprox) con esto:

// --- FIJAR FECHA DE VOTACIÓN ---
app.post('/api/viaje/fijar-fechas', async (req, res) => {
    console.log('📅 [FIJAR FECHAS] Request recibido:', req.body);
    const { viajeId, votingStartDate } = req.body;

    if (!viajeId || !votingStartDate) {
        console.error('   ❌ Faltan parámetros');
        return res.status(400).json({ error: 'Parámetros faltantes' });
    }

    // Obtener código del viaje
    const viajeLocal = db.prepare('SELECT codigo FROM viajes WHERE id = ?').get(viajeId);
    if (!viajeLocal) {
        console.error('   ❌ Viaje no encontrado');
        return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    console.log(`   📝 Actualizando viaje con código: ${viajeLocal.codigo}`);

    // ✅ CAMBIO CRÍTICO: Usar UPDATE en vez de UPSERT
    const { error, data } = await supabaseServer
        .from('trips')
        .update({
            voting_start_date: votingStartDate,
            is_voting_open: false  // CRUCIAL: NO abrir hasta que la fecha se alcance
        })
        .eq('code', viajeLocal.codigo)
        .select();

    if (error) {
        console.error('   ❌ Error actualizando Supabase:', error.message);
        return res.status(500).json({ error: 'Error al guardar en la nube' });
    }

    // Verificación adicional
    const { data: verification } = await supabaseServer
        .from('trips')
        .select('code, voting_start_date, is_voting_open')
        .eq('code', viajeLocal.codigo)
        .single();

    console.log(`   ✅ VERIFICACIÓN - Datos en Supabase:`, verification);
    console.log(`   ✅ voting_start_date: ${verification?.voting_start_date}`);
    console.log(`   ✅ is_voting_open: ${verification?.is_voting_open}`);

    res.json({ success: true, savedData: verification });
});
