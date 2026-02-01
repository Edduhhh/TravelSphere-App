// 🔥 INICIO DE SISTEMA: CONFIGURACIÓN Y SEGURIDAD 🔥
import 'dotenv/config'; // Carga las claves del archivo .env

// --- DIAGNÓSTICO DE ARRANQUE ---
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log("\n╔══════════════════════════════════════════════════╗");
console.log("║       INICIANDO SERVIDOR TRAVELSPHERE 2.0        ║");
console.log("╠══════════════════════════════════════════════════╣");

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("║ ❌ ERROR CRÍTICO: NO SE ENCUENTRAN LAS CLAVES    ║");
    console.error("║    El archivo .env no se está leyendo o falta.   ║");
    process.exit(1);
} else {
    console.log("║ ✅ CLAVES DETECTADAS                             ║");
    console.log(`║    URL: ${SUPABASE_URL.substring(0, 20)}...       ║`);
    console.log("║    Conexión a la nube: LISTA                     ║");
    console.log("╚══════════════════════════════════════════════════╝\n");
}

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';

const PORT = 3005;
const GOOGLE_API_KEY = 'AIzaSyDS3VslypLLj3ztowsvykxRUIcUrah7BZg';

// Cliente Supabase
const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Base de Datos Local
const db = new Database('viajes_pro.db');

// --- ESTRUCTURA DE BASE DE DATOS LOCAL (COMPLETA) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY, 
    codigo TEXT UNIQUE, 
    destino TEXT, 
    fecha_inicio TEXT, 
    fecha_fin TEXT, 
    selected_months TEXT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_final TEXT,
    voting_start_date TEXT,
    voting_phase TEXT DEFAULT 'PLANNING',
    current_round INTEGER DEFAULT 1,
    total_cities_initial INTEGER DEFAULT 0
  );
  
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY, 
    viaje_id INTEGER, 
    nombre TEXT, 
    es_admin BOOLEAN DEFAULT 0,
    es_tesorero BOOLEAN DEFAULT 0,
    FOREIGN KEY(viaje_id) REFERENCES viajes(id)
  );

  CREATE TABLE IF NOT EXISTS rondas (id INTEGER PRIMARY KEY, viaje_id INTEGER, monto_individual_solicitado REAL, activa BOOLEAN DEFAULT 1);
  CREATE TABLE IF NOT EXISTS aportaciones (id INTEGER PRIMARY KEY, ronda_id INTEGER, usuario_id INTEGER, monto_solicitado REAL, monto_pagado REAL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS adelantos (id INTEGER PRIMARY KEY, usuario_id INTEGER, concepto TEXT, monto REAL);
  CREATE TABLE IF NOT EXISTS gastos_personales (id INTEGER PRIMARY KEY, usuario_id INTEGER, concepto TEXT, monto REAL);
  CREATE TABLE IF NOT EXISTS candidaturas (
    id INTEGER PRIMARY KEY, 
    viaje_id INTEGER, 
    usuario_id INTEGER, 
    ciudad TEXT, 
    puntos INTEGER DEFAULT 0, 
    votos_pos1 INTEGER DEFAULT 0, 
    votos_pos2 INTEGER DEFAULT 0, 
    votos_pos3 INTEGER DEFAULT 0, 
    datos_viabilidad TEXT, 
    foto_url TEXT, 
    FOREIGN KEY(viaje_id) REFERENCES viajes(id)
  );
  CREATE TABLE IF NOT EXISTS votos_realizados (viaje_id INTEGER, usuario_id INTEGER, UNIQUE(viaje_id, usuario_id));
  CREATE TABLE IF NOT EXISTS votos_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    viaje_id INTEGER,
    usuario_id INTEGER,
    candidatura_id INTEGER,
    posicion INTEGER,
    UNIQUE(viaje_id, usuario_id, candidatura_id)
  );
  CREATE TABLE IF NOT EXISTS disponibilidad (
    id INTEGER PRIMARY KEY, 
    viaje_id INTEGER, 
    usuario_id INTEGER, 
    fecha TEXT,
    estado TEXT DEFAULT 'ideal',
    UNIQUE(usuario_id, fecha)
  );
`);

const app = express();
app.use(cors());
app.use(express.json());

// --- HELPERS IA ---
const generarViabilidad = (ciudad) => {
    const precioBase = Math.floor(Math.random() * 200 + 50);
    return JSON.stringify({
        score_global: Math.floor(Math.random() * 40 + 60),
        resumen_ia: `Análisis para ${ciudad}. Destino vibrante con opciones logísticas variadas.`,
        logistica: {
            ida: { tipo: "Vuelo Directo", tiempo_total: "3h 15m", precio: precioBase },
            vuelta: { tipo: "1 Escala", tiempo_total: "5h 45m", precio: precioBase + 20 },
            precio_total_vuelos: (precioBase * 2) + 20
        },
        alojamiento: {
            precio_medio_global: 90,
            zonas_recomendadas: [{ nombre: "Centro", precio: "120€", descripcion: "Céntrico" }]
        },
        salud_viaje: { clima: "Soleado", temperatura: "22ºC", saturacion: "Media" },
        presupuesto_diario_estimado: 65
    });
};

// --- ENDPOINTS GENERALES ---
app.get('/api/info-ciudad', async (req, res) => {
    const { city, country } = req.query;
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ',' + country)}&key=${GOOGLE_API_KEY}`;
        const response = await axios.get(url);
        if (response.data.status !== 'OK') return res.json({ coords: null });
        res.json({ coords: response.data.results[0].geometry.location });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- LOBBY (Sincronizado con Supabase trips) ---
app.post('/api/lobby/crear', async (req, res) => {
    const { destino, nombreAdmin } = req.body;

    console.log('🎯 Creando nuevo viaje...');

    // ✅ GENERAR CÓDIGO ÚNICO (6 caracteres alfanuméricos)
    let codigo = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!codigo && attempts < MAX_ATTEMPTS) {
        attempts++;
        // Generar código de 6 caracteres: 36^6 = 2,176,782,336 combinaciones
        const candidate = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Verificar en SQLite local (rápido)
        const existsLocal = db.prepare('SELECT 1 FROM viajes WHERE codigo = ?').get(candidate);
        if (existsLocal) {
            console.log(`   ⚠️  Código ${candidate} ya existe en SQLite (intento ${attempts})`);
            continue;
        }

        // Verificar en Supabase (autoritativo - puede tener códigos de otros servidores)
        try {
            const { data: existsCloud } = await supabaseServer
                .from('trips')
                .select('code')
                .eq('code', candidate)
                .maybeSingle();

            if (existsCloud) {
                console.log(`   ⚠️  Código ${candidate} ya existe en Supabase (intento ${attempts})`);
                continue;
            }
        } catch (cloudCheckError) {
            console.warn(`   ⚠️  No se pudo verificar en Supabase (intento ${attempts}):`, cloudCheckError.message);
            // Continuar solo con verificación local si Supabase falla
        }

        // ✅ Código único encontrado
        codigo = candidate;
        console.log(`   ✅ Código único generado: ${codigo} (intento ${attempts})`);
    }

    if (!codigo) {
        console.error('❌ No se pudo generar código único después de', MAX_ATTEMPTS, 'intentos');
        return res.status(500).json({
            success: false,
            error: 'No se pudo generar un código único. Por favor, intenta nuevamente.'
        });
    }

    // ✅ Crear viaje en SQLite local
    try {
        const nuevoViaje = db.prepare('INSERT INTO viajes (codigo, destino) VALUES (?, ?)').run(codigo, destino);
        const viajeId = nuevoViaje.lastInsertRowid;
        const nuevoUser = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 1, 1)').run(viajeId, nombreAdmin);

        console.log(`   ✅ Viaje creado en SQLite local (ID: ${viajeId})`);

        // ✅ Crear en Supabase con INSERT (no upsert) para evitar sobrescribir
        const { error } = await supabaseServer.from('trips').insert({
            code: codigo,
            name: destino,
            is_voting_open: false,
            current_round: 1,
            voting_start_date: null
        });

        if (error) {
            console.error('❌ Error creando viaje en Supabase:', error.message);

            // 🔄 ROLLBACK: Eliminar de SQLite si falla Supabase
            try {
                db.prepare('DELETE FROM usuarios WHERE id = ?').run(nuevoUser.lastInsertRowid);
                db.prepare('DELETE FROM viajes WHERE id = ?').run(viajeId);
                console.log('   🔄 Rollback completado en SQLite');
            } catch (rollbackError) {
                console.error('   ❌ Error en rollback:', rollbackError.message);
            }

            return res.status(500).json({
                success: false,
                error: 'Error al sincronizar con la nube. Por favor, intenta nuevamente.'
            });
        }

        console.log(`✅ Viaje ${codigo} creado exitosamente (SQLite + Supabase)`);
        res.json({
            success: true,
            codigo,
            viajeId,
            userId: nuevoUser.lastInsertRowid
        });

    } catch (dbError) {
        console.error('❌ Error en base de datos local:', dbError.message);
        return res.status(500).json({
            success: false,
            error: 'Error al crear el viaje. Por favor, intenta nuevamente.'
        });
    }
});

app.post('/api/lobby/unirse', (req, res) => {
    const { codigo, nombre } = req.body;

    console.log(`\n🚪 JOIN REQUEST: ${nombre} → Trip code: ${codigo}`);

    const viaje = db.prepare('SELECT * FROM viajes WHERE codigo = ?').get(codigo);
    if (!viaje) {
        console.log('   ❌ Trip code not found');
        return res.status(404).json({ error: "Código no existe" });
    }

    // 🔥 CRITICAL: Check if user already exists in this trip
    const existingUser = db.prepare('SELECT * FROM usuarios WHERE viaje_id = ? AND nombre = ?').get(viaje.id, nombre);

    if (existingUser) {
        console.log(`   ♻️  EXISTING USER FOUND: ID=${existingUser.id}, Name="${existingUser.nombre}"`);
        console.log('   ✅ Returning existing user (no duplicate created)');
        return res.json({
            success: true,
            viajeId: viaje.id,
            userId: existingUser.id,
            destino: viaje.destino,
            isReturningUser: true
        });
    }

    // User doesn't exist, create new one
    console.log(`   ➕ Creating NEW user: "${nombre}"`);
    const nuevoUser = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 0, 0)').run(viaje.id, nombre);
    console.log(`   ✅ New user created: ID=${nuevoUser.lastInsertRowid}`);

    res.json({
        success: true,
        viajeId: viaje.id,
        userId: nuevoUser.lastInsertRowid,
        destino: viaje.destino,
        isReturningUser: false
    });
});

// --- CONSULTAR ESTADO (Lee de Supabase trips) ---
app.get('/api/viajes/:viajeId/voting-state', (req, res) => {
    const { viajeId } = req.params;
    const viaje = db.prepare('SELECT voting_start_date, voting_phase, current_round, total_cities_initial FROM viajes WHERE id = ?').get(viajeId);

    if (!viaje) return res.status(404).json({ error: "Viaje no encontrado" });

    // Verificar si se abrió votación (si ya pasó la fecha)
    const now = new Date();
    const startDate = viaje.voting_start_date ? new Date(viaje.voting_start_date) : null;
    let isVotingOpen = false;

    // Si hay fecha y ya pasó, la votación está abierta
    if (startDate && now >= startDate) {
        isVotingOpen = true;
    }

    res.json({
        voting_start_date: viaje.voting_start_date,
        voting_phase: viaje.voting_phase,
        current_round: viaje.current_round,
        total_cities_initial: viaje.total_cities_initial,
        is_voting_open: isVotingOpen
    });
});

app.get('/api/viaje/estado', async (req, res) => {
    const { viajeId } = req.query;
    const viajeLocal = db.prepare('SELECT codigo, destino, fecha_inicio, fecha_fin, fecha_final FROM viajes WHERE id = ?').get(viajeId);

    if (!viajeLocal) return res.status(404).json({ error: "Viaje no encontrado" });

    // 1. Consultar Nube (La Verdad Absoluta)
    let votingStartDate = null;
    let isVotingOpen = false;

    if (viajeLocal.codigo) {
        console.log(`   🔍 Consultando Supabase con código: ${viajeLocal.codigo}`);

        const { data: cloudTrip, error } = await supabaseServer
            .from('trips')
            .select('voting_start_date, is_voting_open')
            .eq('code', viajeLocal.codigo)
            .maybeSingle();

        if (error) {
            console.error(`   ❌ Error consultando Supabase:`, error.message);
        } else if (cloudTrip) {
            console.log(`   ✅ Datos encontrados en Supabase:`, cloudTrip);
            votingStartDate = cloudTrip.voting_start_date;
            isVotingOpen = cloudTrip.is_voting_open;
        } else {
            console.log(`   ⚠️  No se encontró viaje en Supabase con código: ${viajeLocal.codigo}`);
        }
    } else {
        console.log(`   ⚠️  Viaje sin código, no se puede consultar Supabase`);
    }

    let fechaFinal = null;
    if (viajeLocal.fecha_final) {
        const [start, end] = viajeLocal.fecha_final.split('|');
        fechaFinal = { inicio: start, fin: end };
    }

    console.log(`📊 [GET ESTADO] ViajeId: ${viajeId}, Código: ${viajeLocal?.codigo}`);
    console.log(`   ├─ voting_start_date: ${votingStartDate}`);
    console.log(`   └─ is_voting_open: ${isVotingOpen}`);

    res.json({
        destino: viajeLocal.destino,
        fechaInicio: viajeLocal.fecha_inicio,
        fechaFin: viajeLocal.fecha_fin,
        fechaFinal: fechaFinal,
        voting_start_date: votingStartDate, // El dato vital para la cuenta atrás
        is_voting_open: isVotingOpen
    });
});

// --- FIJAR FECHA DE VOTACIÓN ---
app.post('/api/viaje/fijar-fechas', async (req, res) => {
    console.log('📅 [FIJAR FECHAS] Request recibido:', req.body);
    const { viajeId, votingStartDate } = req.body;

    if (!viajeId || !votingStartDate) {
        console.error('   ❌ Faltan parámetros');
        return res.status(400).json({ error: 'Parámetros faltantes' });
    }

    // Obtener código del viaje
    const viajeLocal = db.prepare('SELECT codigo, destino FROM viajes WHERE id = ?').get(viajeId);
    if (!viajeLocal) {
        console.error('   ❌ Viaje no encontrado');
        return res.status(404).json({ error: 'Viaje no encontrado' });
    }

    console.log(`   📝 Guardando fecha para código: ${viajeLocal.codigo}`);
    console.log(`   📝 ViajeId: ${viajeId}, Fecha: ${votingStartDate}`);

    // 🔍 LOGGING EXHAUSTIVO: ANTES de guardar
    const before = db.prepare('SELECT voting_start_date, voting_phase FROM viajes WHERE id = ?').get(viajeId);
    console.log(`   🔍 ANTES de UPDATE:`, before);

    // ⚡ GUARDAR EN SQLITE LOCAL
    try {
        const result = db.prepare('UPDATE viajes SET voting_start_date = ?, voting_phase = ? WHERE id = ?')
            .run(votingStartDate, 'PLANNING', viajeId);

        console.log(`   📊 UPDATE result:`, result);
        console.log(`   📊 Changes: ${result.changes}`);
    } catch (error) {
        console.error(`   ❌ ERROR en UPDATE SQLite:`, error.message);
        return res.status(500).json({ error: 'Error guardando en SQLite' });
    }

    // 🔍 LOGGING EXHAUSTIVO: DESPUÉS de guardar
    const after = db.prepare('SELECT voting_start_date, voting_phase FROM viajes WHERE id = ?').get(viajeId);
    console.log(`   🔍 DESPUÉS de UPDATE:`, after);

    if (after.voting_start_date === votingStartDate) {
        console.log('   ✅ ¡SQLite confirmado! Fecha guardada correctamente');
    } else {
        console.error(`   ❌ ¡FALLO! Esperaba '${votingStartDate}' pero tengo '${after.voting_start_date}'`);
    }

    // ✅ GUARDAR EN SUPABASE (secundario)
    const { error } = await supabaseServer
        .from('trips')
        .upsert({
            code: viajeLocal.codigo,
            name: viajeLocal.destino,
            voting_start_date: votingStartDate,
            is_voting_open: false,
            current_round: 1
        }, {
            onConflict: 'code',
            ignoreDuplicates: false
        });

    if (error) {
        console.error('   ⚠️  Error en Supabase (no crítico):', error.message);
    } else {
        console.log('   ✅ Guardado en Supabase');
    }

    res.json({ success: true });
});

// --- GESTIÓN DE ROLES ---
app.get('/api/roles/lista', (req, res) => {
    const { viajeId } = req.query;
    const usuarios = db.prepare('SELECT id, nombre, es_admin, es_tesorero FROM usuarios WHERE viaje_id = ?').all(viajeId);
    res.json({ usuarios });
});

app.post('/api/roles/actualizar', (req, res) => {
    const { usuarioId, rol, valor } = req.body;
    if (rol !== 'es_admin' && rol !== 'es_tesorero') return res.status(400).json({ error: "Rol inválido" });
    const sql = `UPDATE usuarios SET ${rol} = ? WHERE id = ?`;
    db.prepare(sql).run(valor ? 1 : 0, usuarioId);
    res.json({ success: true });
});

// --- VOTACIÓN CIUDAD ---
app.get('/api/voting/candidaturas', (req, res) => {
    const { viajeId, usuarioId } = req.query;
    const candidaturas = db.prepare(`SELECT c.*, u.nombre as propuesto_por FROM candidaturas c JOIN usuarios u ON c.usuario_id = u.id WHERE c.viaje_id = ? ORDER BY c.puntos DESC`).all(viajeId);
    const localVote = db.prepare('SELECT 1 FROM votos_realizados WHERE viaje_id = ? AND usuario_id = ?').get(viajeId, usuarioId);
    res.json({ candidaturas: candidaturas.map(c => ({ ...c, datos: JSON.parse(c.datos_viabilidad) })), yaVoto: !!localVote });
});

app.post('/api/voting/proponer', async (req, res) => {
    const { viajeId, usuarioId, ciudad, datos } = req.body;
    console.log('🏙️  [PROPONER] Nueva ciudad:', ciudad, '| Usuario:', usuarioId, '| Viaje:', viajeId);

    let fotoUrl = null;
    try {
        const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(ciudad)}&key=${GOOGLE_API_KEY}`;
        const placesResp = await axios.get(placesUrl);
        if (placesResp.data.results?.length > 0 && placesResp.data.results[0].photos) {
            fotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${placesResp.data.results[0].photos[0].photo_reference}&key=${GOOGLE_API_KEY}`;
        }
    } catch (e) { console.log("⚠️ Sin foto"); }

    try {
        const datosFinales = datos || generarViabilidad(ciudad);

        // 1. Save to SQLite (local cache for fast reads)
        const info = db.prepare('INSERT INTO candidaturas (viaje_id, usuario_id, ciudad, datos_viabilidad, foto_url) VALUES (?, ?, ?, ?, ?)').run(viajeId, usuarioId, ciudad, datosFinales, fotoUrl);
        console.log('   ✅ Guardado en SQLite, ID:', info.lastInsertRowid);

        // 2. Get trip code and user name for Supabase sync
        const viaje = db.prepare('SELECT codigo FROM viajes WHERE id = ?').get(viajeId);
        const usuario = db.prepare('SELECT nombre FROM usuarios WHERE id = ?').get(usuarioId);

        if (!viaje || !viaje.codigo) {
            console.warn('   ⚠️  Trip code not found, skipping Supabase sync');
            return res.json({ success: true, id: info.lastInsertRowid });
        }

        // 3. 🔥 Sync to Supabase for REALTIME updates
        console.log(`   🔄 Syncing to Supabase... Trip: ${viaje.codigo}`);
        const { data: supabaseData, error: supabaseError } = await supabaseServer
            .from('candidates')
            .insert({
                trip_code: viaje.codigo,
                user_id: usuarioId,
                user_name: usuario?.nombre || 'Unknown',
                city_name: ciudad,
                viability_data: JSON.parse(datosFinales),
                photo_url: fotoUrl
            })
            .select()
            .single();

        if (supabaseError) {
            console.error('   ❌ Supabase sync failed:', supabaseError.message);
            // Continue anyway - SQLite is the source of truth
        } else {
            console.log('   ✅ Synced to Supabase, ID:', supabaseData?.id);
        }

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (e) {
        console.error('   ❌ Error:', e.message);
        res.status(500).json({ error: "Error BD" });
    }
});


app.post('/api/voting/enviar-ranking', async (req, res) => {
    const { viajeId, usuarioId, rankingIds } = req.body;
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║          🗳️  GUARDANDO VOTO - DEBUG MODE          ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('📊 Request data:');
    console.log('   viajeId:', viajeId, '(type:', typeof viajeId, ')');
    console.log('   usuarioId:', usuarioId, '(type:', typeof usuarioId, ')');
    console.log('   rankingIds:', rankingIds ? rankingIds.join(', ') : '[]');
    console.log('   rankingIds length:', rankingIds?.length || 0);

    try {
        // STEP 0: VALIDAR QUE EL USUARIO EXISTE Y PERTENECE AL VIAJE
        console.log('\n[STEP 0] 🔍 VALIDANDO IDENTIDAD DEL USUARIO...');
        if (!usuarioId || usuarioId === null || usuarioId === undefined) {
            console.error('   ❌ ERROR CRÍTICO: usuarioId es NULL/UNDEFINED!');
            return res.status(400).json({
                error: "Usuario no identificado - Por favor recarga la página",
                errorType: "NULL_USER_ID"
            });
        }

        const usuario = db.prepare('SELECT * FROM usuarios WHERE id = ? AND viaje_id = ?').get(usuarioId, viajeId);
        if (!usuario) {
            console.error('   ❌ USUARIO NO ENCONTRADO EN BD!');
            console.error(`      Buscando: ID=${usuarioId}, ViajeID=${viajeId}`);

            // Mostrar usuarios reales del viaje para debug
            const usuariosReales = db.prepare('SELECT id, nombre FROM usuarios WHERE viaje_id = ?').all(viajeId);
            console.error('      Usuarios REALES en este viaje:');
            usuariosReales.forEach(u => console.error(`         - ID: ${u.id}, Nombre: ${u.nombre}`));

            return res.status(400).json({
                error: `Usuario ID ${usuarioId} no pertenece a este viaje`,
                errorType: "INVALID_USER_ID"
            });
        }
        console.log(`   ✅ Usuario identificado: ID=${usuario.id}, Nombre="${usuario.nombre}"`);

        // STEP 1: Verificar duplicado
        console.log('\n[STEP 1] Checking for duplicate vote...');
        const yaVoto = db.prepare('SELECT 1 FROM votos_realizados WHERE viaje_id = ? AND usuario_id = ?').get(viajeId, usuarioId);
        console.log('   Query result:', yaVoto ? 'ALREADY VOTED' : 'OK');

        if (yaVoto) {
            console.log(`   ⚠️  DUPLICATE VOTE DETECTED - Usuario "${usuario.nombre}" ya votó`);
            return res.status(400).json({ error: "Ya votaste" });
        }

        // STEP 2: Verificar que todos los candidatos existen
        console.log('\n[STEP 2] Validating candidate IDs...');
        for (let i = 0; i < rankingIds.length; i++) {
            const candId = rankingIds[i];
            const exists = db.prepare('SELECT id, ciudad FROM candidaturas WHERE id = ?').get(candId);
            if (!exists) {
                console.error(`   ❌ CANDIDATE ${candId} NOT FOUND in database!`);
                return res.status(400).json({ error: `Invalid candidate ID: ${candId}` });
            }
            console.log(`   ✅ Candidate ${i + 1}/${rankingIds.length}: ID=${candId}, City=${exists.ciudad}`);
        }

        // STEP 3: Preparar statements
        console.log('\n[STEP 3] Preparing SQL statements...');
        const updatePoints = db.prepare('UPDATE candidaturas SET puntos = puntos + ?, votos_pos1 = votos_pos1 + ?, votos_pos2 = votos_pos2 + ?, votos_pos3 = votos_pos3 + ? WHERE id = ?');
        const insertDetalle = db.prepare('INSERT INTO votos_detalle (viaje_id, usuario_id, candidatura_id, posicion) VALUES (?, ?, ?, ?)');
        const markVoted = db.prepare('INSERT INTO votos_realizados (viaje_id, usuario_id) VALUES (?, ?)');
        console.log('   ✅ Statements prepared');

        // STEP 4: Ejecutar transacción
        console.log('\n[STEP 4] Starting transaction...');
        const tx = db.transaction(() => {
            console.log('   🔒 Transaction BEGIN');

            rankingIds.forEach((candidaturaId, index) => {
                const points = rankingIds.length - index;
                const pos = index + 1;
                const pos1 = pos === 1 ? 1 : 0;
                const pos2 = pos === 2 ? 1 : 0;
                const pos3 = pos === 3 ? 1 : 0;

                console.log(`   [${index + 1}/${rankingIds.length}] Processing candidate ${candidaturaId}:`);
                console.log(`       Points: +${points}, Position: ${pos}`);

                try {
                    // Update points
                    const updateResult = updatePoints.run(points, pos1, pos2, pos3, candidaturaId);
                    console.log(`       UPDATE result: changed=${updateResult.changes}`);

                    // Insert detail
                    const insertResult = insertDetalle.run(viajeId, usuarioId, candidaturaId, pos);
                    console.log(`       INSERT detail result: lastID=${insertResult.lastInsertRowid}`);
                } catch (stepError) {
                    console.error(`       ❌ ERROR in candidate ${candidaturaId}:`, stepError.message);
                    throw stepError; // Re-throw to rollback transaction
                }
            });

            // Mark as voted LAST (only if all candidates processed successfully)
            console.log(`   Marking user ${usuarioId} ("${usuario.nombre}") as voted...`);
            const votedResult = markVoted.run(viajeId, usuarioId);
            console.log(`   ✅ Marked as voted: lastID=${votedResult.lastInsertRowid}`);

            console.log('   🔓 Transaction COMMIT (pending)');
        });

        console.log('\n[STEP 5] Executing transaction...');
        tx(); // Execute transaction
        console.log('   ✅ Transaction COMMITTED successfully!');

        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log(`║   ✅ VOTO GUARDADO - Usuario: ${usuario.nombre.padEnd(17)} ║`);
        console.log('╚══════════════════════════════════════════════════╝\n');

        res.json({ success: true });

    } catch (e) {
        console.error('\n╔══════════════════════════════════════════════════╗');
        console.error('║            ❌ ERROR CRÍTICO                       ║');
        console.error('╚══════════════════════════════════════════════════╝');
        console.error('Error type:', e.constructor.name);
        console.error('Error message:', e.message);
        console.error('Error code:', e.code || 'N/A');
        console.error('Error stack:', e.stack);
        console.error('═══════════════════════════════════════════════════\n');

        res.status(500).json({
            error: e.message || "Error desconocido",
            errorType: e.constructor.name,
            errorCode: e.code
        });
    }
});


// --- ANULAR VOTO (EMERGENCY RESET) ---
app.post('/api/voting/anular-voto', (req, res) => {
    const { viajeId, usuarioId } = req.body;
    console.log('⚠️ [ANULAR VOTO] Solicitado para Usuario:', usuarioId, 'Viaje:', viajeId);

    try {
        const tx = db.transaction(() => {
            // 1. Borrar registros (sin restar puntos para evitar complejidad, asumimos que si anulan es porque falló)
            db.prepare('DELETE FROM votos_detalle WHERE viaje_id = ? AND usuario_id = ?').run(viajeId, usuarioId);
            db.prepare('DELETE FROM votos_realizados WHERE viaje_id = ? AND usuario_id = ?').run(viajeId, usuarioId);
        });
        tx();

        console.log('   ✅ Voto anulado correctamente');
        res.json({ success: true });
    } catch (e) {
        console.error('   ❌ Error al anular voto:', e);
        res.status(500).json({ error: "Error anulando" });
    }
});

// --- RESETEAR TODOS LOS VOTOS DE UN VIAJE (TESTING) ---
app.post('/api/voting/reset-viaje', (req, res) => {
    const { viajeId } = req.body;
    console.log('\n🔄 [RESET VIAJE] Reseteando TODOS los votos del viaje:', viajeId);

    try {
        const tx = db.transaction(() => {
            // 1. Get all votes to show what's being deleted
            const votos = db.prepare('SELECT * FROM votos_realizados WHERE viaje_id = ?').all(viajeId);
            console.log(`   📊 Votos a eliminar: ${votos.length}`);
            votos.forEach(v => console.log(`      - Usuario ${v.usuario_id}`));

            // 2. Delete all vote details
            const detalle = db.prepare('DELETE FROM votos_detalle WHERE viaje_id = ?').run(viajeId);
            console.log(`   🗑️  Eliminados ${detalle.changes} registros de votos_detalle`);

            // 3. Delete all vote records
            const realizados = db.prepare('DELETE FROM votos_realizados WHERE viaje_id = ?').run(viajeId);
            console.log(`   🗑️  Eliminados ${realizados.changes} registros de votos_realizados`);

            // 4. Reset all candidate points to 0
            const candidatos = db.prepare('UPDATE candidaturas SET puntos = 0, votos_pos1 = 0, votos_pos2 = 0, votos_pos3 = 0 WHERE viaje_id = ?').run(viajeId);
            console.log(`   🔄 Reseteados ${candidatos.changes} candidatos`);
        });
        tx();

        console.log('   ✅ Viaje reseteado completamente - todos pueden votar de nuevo\n');
        res.json({ success: true, message: 'Viaje reseteado correctamente' });
    } catch (e) {
        console.error('   ❌ Error al resetear viaje:', e);
        res.status(500).json({ error: "Error al resetear" });
    }
});

// --- PROGRESO DE VOTACIÓN (Sincronización Multi-Usuario) ---
app.get('/api/voting/progreso', (req, res) => {
    const { viajeId } = req.query;
    console.log('📊 [PROGRESO] Request recibida. viajeId:', viajeId);

    try {
        // Total de usuarios en el viaje
        const totalResult = db.prepare('SELECT COUNT(*) as total FROM usuarios WHERE viaje_id = ?').get(viajeId);
        const totalUsers = totalResult.total;
        console.log('   👥 Total usuarios en viaje:', totalUsers);

        // Usuarios que han votado
        const votedResult = db.prepare('SELECT COUNT(DISTINCT usuario_id) as voted FROM votos_realizados WHERE viaje_id = ?').get(viajeId);
        const votedUsers = votedResult.voted;
        console.log('   ✅ Usuarios que han votado:', votedUsers);

        // IDs de quienes votaron
        const votedIds = db.prepare('SELECT usuario_id FROM votos_realizados WHERE viaje_id = ?').all(viajeId);
        const votedUserIds = new Set(votedIds.map(v => v.usuario_id));

        // Nombres de usuarios pendientes (la "Lista de la Vergüenza")
        const allUsers = db.prepare('SELECT id, nombre FROM usuarios WHERE viaje_id = ?').all(viajeId);
        console.log('   📋 Usuarios totales encontrados:', allUsers.length, allUsers.map(u => u.nombre));

        const pendingUsers = allUsers
            .filter(u => !votedUserIds.has(u.id))
            .map(u => u.nombre);
        console.log('   ⏳ Usuarios pendientes:', pendingUsers);

        const response = {
            totalUsers,
            votedUsers,
            pendingUsers,
            allVoted: votedUsers >= totalUsers && totalUsers > 0
        };
        console.log('   📤 Respuesta:', response);

        res.json(response);
    } catch (e) {
        console.error("❌ Error en /api/voting/progreso:", e);
        res.status(500).json({ error: 'Error obteniendo progreso' });
    }
});

app.post('/api/voting/borrar', (req, res) => {
    const { id, candidaturaId } = req.body;
    const finalId = id || candidaturaId;
    if (!finalId) return res.status(400).json({ success: false, message: "ID no recibido" });

    try {
        const info = db.prepare("DELETE FROM candidaturas WHERE id = ?").run(finalId);
        res.json({ success: true, changes: info.changes });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- RESETEAR VOTOS PARA NUEVA RONDA (mantener ciudades eliminadas) ---
app.post('/api/voting/reset-votes', (req, res) => {
    const { viajeId } = req.body;
    console.log('🔄 [RESET VOTOS] Limpiando votos para nueva ronda. ViajeId:', viajeId);

    try {
        // Eliminamos SOLO los votos, no las candidaturas eliminadas
        db.prepare('DELETE FROM votos_realizados WHERE viaje_id = ?').run(viajeId);
        db.prepare('DELETE FROM votos_detalle WHERE viaje_id = ?').run(viajeId);

        // Reseteamos los contadores de puntos y votos de todas las candidaturas restantes
        db.prepare(`
            UPDATE candidaturas 
            SET puntos = 0, votos_pos1 = 0, votos_pos2 = 0, votos_pos3 = 0 
            WHERE viaje_id = ?
        `).run(viajeId);

        console.log('   ✅ Votos limpiados, listo para nueva ronda');
        res.json({ success: true });
    } catch (e) {
        console.error('   ❌ Error al resetear votos:', e);
        res.status(500).json({ error: 'Error al resetear votos' });
    }
});

app.post('/api/voting/cerrar', (req, res) => {
    const { viajeId } = req.body;
    try {
        const ganador = db.prepare(`SELECT c.ciudad FROM candidaturas c LEFT JOIN votos_detalle v1 ON c.id = v1.candidatura_id AND v1.posicion = 1 LEFT JOIN votos_detalle v2 ON c.id = v2.candidatura_id AND v2.posicion = 2 LEFT JOIN votos_detalle v3 ON c.id = v3.candidatura_id AND v3.posicion = 3 WHERE c.viaje_id = ? GROUP BY c.id ORDER BY c.puntos DESC, COUNT(v1.id) DESC, COUNT(v2.id) DESC, COUNT(v3.id) DESC, RANDOM() LIMIT 1`).get(viajeId);
        let finalDestino = ganador ? ganador.ciudad : null;
        if (!finalDestino) {
            const fallback = db.prepare('SELECT ciudad FROM candidaturas WHERE viaje_id = ? ORDER BY RANDOM() LIMIT 1').get(viajeId);
            if (fallback) finalDestino = fallback.ciudad;
        }
        if (finalDestino) {
            db.prepare('UPDATE viajes SET destino = ? WHERE id = ?').run(finalDestino, viajeId);
            res.json({ ganador: finalDestino });
        } else {
            res.status(404).json({ error: "No hay candidaturas para cerrar" });
        }
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// --- ENDPOINTS DE ESTADO DE VOTACIÓN ---

// GET voting state for a trip
app.get('/api/viajes/:id/voting-state', (req, res) => {
    const { id } = req.params;
    console.log('📊 [GET VOTING STATE] ViajeId:', id);

    try {
        const viaje = db.prepare(`
            SELECT voting_start_date, voting_phase, current_round, total_cities_initial 
            FROM viajes 
            WHERE id = ?
        `).get(id);

        if (!viaje) {
            return res.status(404).json({ error: 'Viaje not found' });
        }

        const state = {
            voting_start_date: viaje.voting_start_date,
            voting_phase: viaje.voting_phase || 'PLANNING',
            current_round: viaje.current_round || 1,
            total_cities_initial: viaje.total_cities_initial || 0
        };

        console.log('   ✅ State:', state);
        res.json(state);
    } catch (e) {
        console.error('   ❌ Error:', e);
        res.status(500).json({ error: 'Error fetching voting state' });
    }
});

// POST update voting state for a trip
app.post('/api/viajes/:id/voting-state', (req, res) => {
    const { id } = req.params;
    const { voting_start_date, voting_phase, current_round, total_cities_initial } = req.body;

    console.log('💾 [UPDATE VOTING STATE] ViajeId:', id);
    console.log('   Data:', { voting_start_date, voting_phase, current_round, total_cities_initial });

    try {
        // Build dynamic update query based on provided fields
        const updates = [];
        const values = [];

        if (voting_start_date !== undefined) {
            updates.push('voting_start_date = ?');
            values.push(voting_start_date);
        }
        if (voting_phase !== undefined) {
            updates.push('voting_phase = ?');
            values.push(voting_phase);
        }
        if (current_round !== undefined) {
            updates.push('current_round = ?');
            values.push(current_round);
        }
        if (total_cities_initial !== undefined) {
            updates.push('total_cities_initial = ?');
            values.push(total_cities_initial);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(id); // Add viajeId at the end for WHERE clause

        const sql = `UPDATE viajes SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(sql).run(...values);

        console.log('   ✅ State updated');
        res.json({ success: true });
    } catch (e) {
        console.error('   ❌ Error:', e);
        res.status(500).json({ error: 'Error updating voting state' });
    }
});

// --- CALENDARIO ---
app.get('/api/calendar/heat', (req, res) => {
    const { viajeId } = req.query;
    const viaje = db.prepare('SELECT fecha_inicio, fecha_fin FROM viajes WHERE id = ?').get(viajeId);
    const fechas = db.prepare('SELECT fecha, usuario_id FROM disponibilidad WHERE viaje_id = ?').all(viajeId);
    const mapaCalor = {};
    fechas.forEach(f => {
        if (!mapaCalor[f.fecha]) mapaCalor[f.fecha] = { count: 0, users: [] };
        mapaCalor[f.fecha].count++;
        mapaCalor[f.fecha].users.push(f.usuario_id);
    });
    const totalUsuarios = db.prepare('SELECT COUNT(*) as c FROM usuarios WHERE viaje_id = ?').get(viajeId).c;

    res.json({
        mapaCalor,
        totalUsuarios,
        fechasOficiales: (viaje.fecha_inicio && viaje.fecha_fin) ? { inicio: viaje.fecha_inicio, fin: viaje.fecha_fin } : null
    });
});

app.post('/api/calendar/best-interval', (req, res) => {
    const { viajeId, duracion } = req.body;
    const dur = parseInt(duracion) || 4;

    const fechas = db.prepare('SELECT fecha, COUNT(*) as coincidencia FROM disponibilidad WHERE viaje_id = ? GROUP BY fecha ORDER BY fecha ASC').all(viajeId);
    if (fechas.length === 0) return res.json({ success: false });

    let maxMatch = -1;
    let bestStart = null;

    for (let i = 0; i <= fechas.length - dur; i++) {
        let currentMatch = 0;
        const window = fechas.slice(i, i + dur);

        const start = new Date(window[0].fecha);
        const end = new Date(window[window.length - 1].fecha);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        if (diffDays === dur) {
            currentMatch = window.reduce((acc, f) => acc + f.coincidencia, 0);
            if (currentMatch > maxMatch) {
                maxMatch = currentMatch;
                bestStart = window[0].fecha;
            }
        }
    }

    if (bestStart) {
        const start = new Date(bestStart);
        const end = new Date(start);
        end.setDate(start.getDate() + (dur - 1));
        const resEnd = end.toISOString().split('T')[0];
        res.json({ success: true, inicio: bestStart, fin: resEnd });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/calendar/toggle', (req, res) => {
    const { viajeId, usuarioId, fecha } = req.body;
    const existe = db.prepare('SELECT id FROM disponibilidad WHERE usuario_id = ? AND fecha = ?').get(usuarioId, fecha);
    if (existe) {
        db.prepare('DELETE FROM disponibilidad WHERE id = ?').run(existe.id);
        res.json({ status: 'removed' });
    } else {
        db.prepare('INSERT INTO disponibilidad (viaje_id, usuario_id, fecha) VALUES (?, ?, ?)').run(viajeId, usuarioId, fecha);
        res.json({ status: 'added' });
    }
});

app.post('/api/calendar/fijar', (req, res) => {
    const { viajeId, fechaInicio, fechaFin } = req.body;
    db.prepare('UPDATE viajes SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?').run(fechaInicio, fechaFin, viajeId);
    res.json({ success: true });
});

// --- SELECTED MONTHS (ADMIN ONLY) ---
app.post('/api/months/save', (req, res) => {
    const { viajeId, selectedMonths } = req.body;
    try {
        try { db.prepare("ALTER TABLE viajes ADD COLUMN selected_months TEXT").run(); } catch (alterError) { }
        const monthsJson = JSON.stringify(selectedMonths);
        const result = db.prepare('UPDATE viajes SET selected_months = ? WHERE id = ?').run(monthsJson, viajeId);
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(500).json({ error: 'Error guardando meses', details: e.message });
    }
});

app.get('/api/months/get', (req, res) => {
    const { viajeId } = req.query;
    try {
        const viaje = db.prepare('SELECT selected_months FROM viajes WHERE id = ?').get(viajeId);
        if (!viaje || !viaje.selected_months) {
            return res.json({ selectedMonths: null });
        }
        res.json({ selectedMonths: JSON.parse(viaje.selected_months) });
    } catch (e) {
        res.status(500).json({ error: 'Error obteniendo meses' });
    }
});

// --- AVAILABILITY WITH STATES (SEMÁFORO) ---
app.post('/api/availability/save', (req, res) => {
    const { viajeId, usuarioId, availability } = req.body;
    try {
        try { db.prepare("ALTER TABLE disponibilidad ADD COLUMN estado TEXT DEFAULT 'ideal'").run(); } catch (alterError) { }
        const deleteResult = db.prepare('DELETE FROM disponibilidad WHERE usuario_id = ? AND viaje_id = ?').run(usuarioId, viajeId);
        const insertStmt = db.prepare('INSERT INTO disponibilidad (viaje_id, usuario_id, fecha, estado) VALUES (?, ?, ?, ?)');
        const tx = db.transaction(() => {
            for (const [fecha, estado] of Object.entries(availability)) {
                insertStmt.run(viajeId, usuarioId, fecha, estado);
            }
        });
        tx();
        res.json({ success: true, count: Object.keys(availability).length });
    } catch (e) {
        res.status(500).json({ error: 'Error guardando disponibilidad', details: e.message });
    }
});

app.get('/api/availability/get', (req, res) => {
    const { viajeId, usuarioId } = req.query;
    try {
        const rows = db.prepare('SELECT fecha, estado FROM disponibilidad WHERE viaje_id = ? AND usuario_id = ?').all(viajeId, usuarioId);
        const availability = {};
        rows.forEach(r => {
            availability[r.fecha] = r.estado;
        });
        res.json({ availability });
    } catch (e) {
        res.status(500).json({ error: 'Error obteniendo disponibilidad' });
    }
});

// --- CALENDAR ANALYSIS (CONSENSUS) - STRICT SYNC ---
app.get('/api/calendar/analyze', (req, res) => {
    const { viajeId, tripDuration } = req.query;
    const duration = parseInt(tripDuration) || 4;

    try {
        const allUsers = db.prepare('SELECT id, nombre FROM usuarios WHERE viaje_id = ?').all(viajeId);
        const totalUsers = allUsers.length;
        const usersWithAvailability = db.prepare('SELECT DISTINCT usuario_id FROM disponibilidad WHERE viaje_id = ?').all(viajeId);
        const confirmedUserIds = usersWithAvailability.map(u => u.usuario_id);
        const submittedCount = confirmedUserIds.length;
        const pendingUsers = allUsers.filter(u => !confirmedUserIds.includes(u.id)).map(u => u.nombre);

        if (submittedCount < totalUsers) {
            return res.json({
                status: 'waiting',
                progress: { submitted: submittedCount, total: totalUsers },
                pendingUsers: pendingUsers,
                message: `Esperando a que ${pendingUsers.length === 1 ? pendingUsers[0] + ' confirme' : pendingUsers.length + ' personas confirmen'}...`
            });
        }

        const allAvailability = db.prepare(`
            SELECT d.fecha, d.estado, d.usuario_id, u.nombre 
            FROM disponibilidad d
            JOIN usuarios u ON d.usuario_id = u.id
            WHERE d.viaje_id = ?
            ORDER BY d.fecha ASC
        `).all(viajeId);

        const dateMap = {};
        allAvailability.forEach(row => {
            if (!dateMap[row.fecha]) {
                dateMap[row.fecha] = { ideal: [], flexible: [], busy: [] };
            }
            dateMap[row.fecha][row.estado].push({ id: row.usuario_id, nombre: row.nombre });
        });

        const dates = Object.keys(dateMap).sort();

        if (dates.length < duration) {
            return res.json({
                status: 'insufficient_data',
                progress: { submitted: submittedCount, total: totalUsers },
                message: 'No hay suficientes fechas marcadas para formar un rango'
            });
        }

        const options = [];

        for (let i = 0; i <= dates.length - duration; i++) {
            const window = dates.slice(i, i + duration);
            const startDate = new Date(window[0]);
            const endDate = new Date(window[window.length - 1]);
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

            if (daysDiff !== duration) continue;

            let idealScore = 0;
            let flexibleScore = 0;
            let totalUsers = 0;
            const participatingUsers = new Set();

            window.forEach(date => {
                const data = dateMap[date];
                idealScore += data.ideal.length * 3;
                flexibleScore += data.flexible.length * 1.5;
                data.ideal.forEach(u => participatingUsers.add(u.nombre));
                data.flexible.forEach(u => participatingUsers.add(u.nombre));
            });

            totalUsers = participatingUsers.size;
            const balanceScore = idealScore + flexibleScore;

            options.push({
                startDate: window[0],
                endDate: window[window.length - 1],
                dates: window,
                idealScore,
                flexibleScore,
                balanceScore,
                users: Array.from(participatingUsers),
                userCount: totalUsers
            });
        }

        const popular = [...options].sort((a, b) => b.idealScore - a.idealScore)[0];
        const economic = [...options].sort((a, b) => b.flexibleScore - a.flexibleScore)[0];
        const balance = [...options].sort((a, b) => b.balanceScore - a.balanceScore)[0];

        res.json({
            status: 'ready',
            progress: { submitted: submittedCount, total: totalUsers },
            options: {
                popular: popular || null,
                economic: economic || null,
                balance: balance || null
            }
        });
    } catch (e) {
        res.status(500).json({ error: 'Error analizando disponibilidad' });
    }
});

// --- TRIP FINALIZATION (SAVE CHOSEN DATE) ---
app.post('/api/trip/finalize', (req, res) => {
    const { viajeId, startDate, endDate } = req.body;
    try {
        try { db.prepare("ALTER TABLE viajes ADD COLUMN fecha_final TEXT").run(); } catch (alterError) { }
        const finalDate = `${startDate}|${endDate}`;
        const result = db.prepare('UPDATE viajes SET fecha_inicio = ?, fecha_fin = ?, fecha_final = ? WHERE id = ?')
            .run(startDate, endDate, finalDate, viajeId);
        res.json({ success: true, changes: result.changes });
    } catch (e) {
        res.status(500).json({ error: 'Error guardando fecha final', details: e.message });
    }
});

// --- WALLET ---
app.get('/api/wallet/estado', (req, res) => {
    const { viajeId } = req.query;
    const totalRecaudado = db.prepare(`SELECT SUM(a.monto_pagado) as t FROM aportaciones a JOIN usuarios u ON a.usuario_id = u.id WHERE u.viaje_id = ?`).get(viajeId).t || 0;
    const usuarios = db.prepare('SELECT id, nombre, es_tesorero FROM usuarios WHERE viaje_id = ?').all(viajeId);
    const estadoUsuarios = usuarios.map(u => {
        const pedido = db.prepare('SELECT SUM(monto_solicitado) as t FROM aportaciones WHERE usuario_id = ?').get(u.id).t || 0;
        const pagado = db.prepare('SELECT SUM(monto_pagado) as t FROM aportaciones WHERE usuario_id = ?').get(u.id).t || 0;
        const adelantado = db.prepare('SELECT SUM(monto) as t FROM adelantos WHERE usuario_id = ?').get(u.id).t || 0;
        const balance = (pagado + adelantado) - pedido;
        return { ...u, balance, debe: balance < 0, credito: balance > 0 };
    });
    res.json({ saldoBote: totalRecaudado, usuarios: estadoUsuarios });
});

app.post('/api/wallet/nueva-ronda', (req, res) => {
    const { viajeId, monto } = req.body;
    const rondaId = db.prepare('INSERT INTO rondas (viaje_id, monto_individual_solicitado) VALUES (?, ?)').run(viajeId, monto).lastInsertRowid;
    const users = db.prepare('SELECT id FROM usuarios WHERE viaje_id = ?').all(viajeId);
    const insert = db.prepare('INSERT INTO aportaciones (ronda_id, usuario_id, monto_solicitado) VALUES (?, ?, ?)');
    const tx = db.transaction(() => { for (const u of users) insert.run(rondaId, u.id, monto); });
    tx();
    res.json({ success: true });
});

app.post('/api/wallet/pagar', (req, res) => {
    const { usuarioId, cantidad } = req.body;
    const deudas = db.prepare('SELECT id, monto_solicitado, monto_pagado FROM aportaciones WHERE usuario_id = ? AND monto_pagado < monto_solicitado').all(usuarioId);
    let restante = Number(cantidad);
    const update = db.prepare('UPDATE aportaciones SET monto_pagado = ? WHERE id = ?');
    const tx = db.transaction(() => {
        for (const d of deudas) {
            if (restante <= 0) break;
            const falta = d.monto_solicitado - d.monto_pagado;
            const pago = Math.min(restante, falta);
            update.run(d.monto_pagado + pago, d.id);
            restante -= pago;
        }
        if (restante > 0) db.prepare('INSERT INTO adelantos (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, "Exceso pago", restante);
    });
    tx();
    res.json({ success: true });
});

app.post('/api/wallet/adelantar', (req, res) => {
    const { usuarioId, monto, concepto } = req.body;
    db.prepare('INSERT INTO adelantos (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, concepto, monto);
    res.json({ success: true });
});

app.get('/api/wallet/mis-gastos', (req, res) => {
    const { usuarioId } = req.query;
    const gastos = db.prepare('SELECT * FROM gastos_personales WHERE usuario_id = ? ORDER BY id DESC').all(usuarioId);
    res.json({ gastos });
});

app.post('/api/wallet/nuevo-gasto-personal', (req, res) => {
    const { usuarioId, concepto, monto } = req.body;
    db.prepare('INSERT INTO gastos_personales (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, concepto, monto);
    res.json({ success: true });
});

app.get('/api/buscar-sitios', async (req, res) => {
    const { busqueda, lat, lng, radio } = req.query;
    let q = busqueda;
    if (['tapas', 'bar', 'comer', 'restaurante'].some(x => busqueda.toLowerCase().includes(x))) q += ' calidad tradicional';
    const radioFinal = radio || 1500;
    try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&location=${lat},${lng}&radius=${radioFinal}&key=${GOOGLE_API_KEY}`;
        const resp = await axios.get(url);
        if (resp.data.results) {
            const hits = resp.data.results.filter(p => p.rating >= 4.2).slice(0, 10).map(p => ({
                id: p.place_id,
                nombre: p.name,
                rating: p.rating,
                total_opiniones: p.user_ratings_total,
                coords: p.geometry.location,
                direccion: p.formatted_address,
                foto: p.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null,
                categoria: p.types ? p.types[0].replace(/_/g, ' ').toUpperCase() : 'LOCAL',
                abierto: p.opening_hours ? p.opening_hours.open_now : null
            }));
            res.json({ sitios: hits });
        } else res.json({ sitios: [] });
    } catch (e) { res.json({ sitios: [] }); }
});

// --- SUPABASE PROXY: ESCRITURA EN TABLA TRIPS (PROFESIONAL) ---
// Aquí es donde hacemos la magia de escribir en la tabla 'trips'
app.post('/api/viaje/cambiar-fase', async (req, res) => {
    const { viajeId, phase, votingDate } = req.body;
    console.log('🔄 Sincronizando Fase (Trips):', phase);

    try {
        const viajeLocal = db.prepare('SELECT codigo, destino FROM viajes WHERE id = ?').get(viajeId);
        if (!viajeLocal || !viajeLocal.codigo) return res.status(404).json({ success: false });

        // UPSERT: Si existe actualiza, si no crea. GARANTÍA DE ÉXITO.
        // GRACIAS A TU SQL, AHORA 'CODE' ES UNIQUE Y ESTO FUNCIONA.
        const { error } = await supabaseServer.from('trips').upsert({
            code: viajeLocal.codigo,
            name: viajeLocal.destino || 'Viaje',
            is_voting_open: phase === 'voting',
            voting_start_date: votingDate || new Date().toISOString()
        }, { onConflict: 'code' });

        if (error) {
            console.error("❌ Error Supabase:", error.message);
        } else {
            console.log("✅ Fase actualizada en nube.");
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/viaje/fijar-fechas', async (req, res) => {
    const { viajeId, votingStartDate } = req.body;
    console.log('📅 Fijando Fecha (Trips):', votingStartDate);

    try {
        const viajeLocal = db.prepare('SELECT codigo, destino FROM viajes WHERE id = ?').get(viajeId);
        if (!viajeLocal || !viajeLocal.codigo) return res.status(404).json({ success: false });

        // UPSERT: Garantiza que la fecha se guarde sí o sí.
        const { error } = await supabaseServer.from('trips').upsert({
            code: viajeLocal.codigo,
            name: viajeLocal.destino || 'Viaje',
            voting_start_date: votingStartDate,
            is_voting_open: false // <--- CAMBIADO A FALSE PARA EVITAR SALTO A FINAL
        }, { onConflict: 'code' });

        if (error) {
            console.error("❌ Error Supabase:", error.message);
        } else {
            console.log("✅ Fecha guardada en nube.");
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});
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


app.listen(PORT, () => { console.log(`\n✈️ SERVIDOR LISTO EN PUERTO ${PORT}`); });