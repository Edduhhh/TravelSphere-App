import express from 'express';
import cors from 'cors';
import axios from 'axios';
import Database from 'better-sqlite3';

const PORT = 3001;
// 👇 TU CLAVE AQUÍ 👇
const GOOGLE_API_KEY = 'AIzaSyDS3VslypLLj3ztowsvykxRUIcUrah7BZg';

const db = new Database('viajes_pro.db');

// --- BASE DE DATOS (NUEVA ESTRUCTURA) ---
db.exec(`
  CREATE TABLE IF NOT EXISTS viajes (
    id INTEGER PRIMARY KEY, 
    codigo TEXT UNIQUE, 
    destino TEXT, 
    fecha_inicio TEXT, 
    fecha_fin TEXT, 
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY, 
    viaje_id INTEGER, 
    nombre TEXT, 
    es_admin BOOLEAN DEFAULT 0,    -- NUEVO: Controla votaciones y configuración
    es_tesorero BOOLEAN DEFAULT 0, -- NUEVO: Controla el dinero
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
    votos_pos1 INTEGER DEFAULT 0, -- NEW: Tie-breaking pos 1
    votos_pos2 INTEGER DEFAULT 0, -- NEW: Tie-breaking pos 2
    votos_pos3 INTEGER DEFAULT 0, -- NEW: Tie-breaking pos 3
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
  CREATE TABLE IF NOT EXISTS disponibilidad (id INTEGER PRIMARY KEY, viaje_id INTEGER, usuario_id INTEGER, fecha TEXT, UNIQUE(usuario_id, fecha));
`);

const app = express();
app.use(cors());
app.use(express.json());

// --- HELPERS IA ---
const generarViabilidad = (ciudad) => {
    // ... (Tu lógica de generación de informes se mantiene igual que la última versión)
    // Para no alargar el código aquí, asumo que usas la versión "Bilateral/Realista" que te di antes.
    // Si quieres te la pego entera de nuevo, pero es la misma lógica de "calcularTrayecto".
    // Por simplicidad en este bloque, pongo una versión resumida para que funcione el copy-paste:
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
app.get('/api/info-ciudad', async (req, res) => { /* ... Mismo código Google Maps ... */
    const { city, country } = req.query; try { const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ',' + country)}&key=${GOOGLE_API_KEY}`; const response = await axios.get(url); if (response.data.status !== 'OK') return res.json({ coords: null }); res.json({ coords: response.data.results[0].geometry.location }); } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- LOBBY (ACTUALIZADO ROLES) ---
app.post('/api/lobby/crear', (req, res) => {
    const { destino, nombreAdmin } = req.body;
    const codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nuevoViaje = db.prepare('INSERT INTO viajes (codigo, destino) VALUES (?, ?)').run(codigo, destino);
    const viajeId = nuevoViaje.lastInsertRowid;
    // EL CREADOR AHORA ES ADMIN Y TESORERO POR DEFECTO
    const nuevoUser = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 1, 1)').run(viajeId, nombreAdmin);
    res.json({ success: true, codigo, viajeId, userId: nuevoUser.lastInsertRowid });
});

app.post('/api/lobby/unirse', (req, res) => {
    const { codigo, nombre } = req.body;
    const viaje = db.prepare('SELECT * FROM viajes WHERE codigo = ?').get(codigo);
    if (!viaje) return res.status(404).json({ error: "Código no existe" });
    // LOS QUE SE UNEN NO TIENEN ROL INICIAL
    const nuevoUser = db.prepare('INSERT INTO usuarios (viaje_id, nombre, es_admin, es_tesorero) VALUES (?, ?, 0, 0)').run(viaje.id, nombre);
    res.json({ success: true, viajeId: viaje.id, userId: nuevoUser.lastInsertRowid, destino: viaje.destino, fechas: { inicio: viaje.fecha_inicio, fin: viaje.fecha_fin } });
});

// --- GESTIÓN DE ROLES (NUEVO) ---
app.get('/api/roles/lista', (req, res) => {
    const { viajeId } = req.query;
    const usuarios = db.prepare('SELECT id, nombre, es_admin, es_tesorero FROM usuarios WHERE viaje_id = ?').all(viajeId);
    res.json({ usuarios });
});

app.post('/api/roles/actualizar', (req, res) => {
    const { usuarioId, rol, valor } = req.body; // rol puede ser 'es_admin' o 'es_tesorero'

    // Seguridad: Evitar quedarse sin admins (opcional, por ahora confiamos en el usuario)
    if (rol !== 'es_admin' && rol !== 'es_tesorero') return res.status(400).json({ error: "Rol inválido" });

    const sql = `UPDATE usuarios SET ${rol} = ? WHERE id = ?`;
    db.prepare(sql).run(valor ? 1 : 0, usuarioId);
    res.json({ success: true });
});

// --- VOTACIÓN CIUDAD (BORDA) ---
app.get('/api/voting/candidaturas', (req, res) => { /* ... Mismo código ... */
    const { viajeId, usuarioId } = req.query; const candidaturas = db.prepare(`SELECT c.*, u.nombre as propuesto_por FROM candidaturas c JOIN usuarios u ON c.usuario_id = u.id WHERE c.viaje_id = ? ORDER BY c.puntos DESC`).all(viajeId); const yaVoto = db.prepare('SELECT 1 FROM votos_realizados WHERE viaje_id = ? AND usuario_id = ?').get(viajeId, usuarioId); res.json({ candidaturas: candidaturas.map(c => ({ ...c, datos: JSON.parse(c.datos_viabilidad) })), yaVoto: !!yaVoto });
});
app.post('/api/voting/proponer', async (req, res) => { /* ... Mismo código ... */
    const { viajeId, usuarioId, ciudad } = req.body; let fotoUrl = null; try { const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(ciudad)}&key=${GOOGLE_API_KEY}`; const placesResp = await axios.get(placesUrl); if (placesResp.data.results?.length > 0 && placesResp.data.results[0].photos) { fotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${placesResp.data.results[0].photos[0].photo_reference}&key=${GOOGLE_API_KEY}`; } } catch (e) { console.log("⚠️ Sin foto"); } try { db.prepare('INSERT INTO candidaturas (viaje_id, usuario_id, ciudad, datos_viabilidad, foto_url) VALUES (?, ?, ?, ?, ?)').run(viajeId, usuarioId, ciudad, generarViabilidad(ciudad), fotoUrl); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Error BD" }); }
});
app.post('/api/voting/enviar-ranking', (req, res) => {
    const { viajeId, usuarioId, rankingIds } = req.body;
    try {
        const yaVoto = db.prepare('SELECT 1 FROM votos_realizados WHERE viaje_id = ? AND usuario_id = ?').get(viajeId, usuarioId);
        if (yaVoto) return res.status(400).json({ error: "Ya votaste" });

        const updatePoints = db.prepare('UPDATE candidaturas SET puntos = puntos + ?, votos_pos1 = votos_pos1 + ?, votos_pos2 = votos_pos2 + ?, votos_pos3 = votos_pos3 + ? WHERE id = ?');
        const insertDetalle = db.prepare('INSERT INTO votos_detalle (viaje_id, usuario_id, candidatura_id, posicion) VALUES (?, ?, ?, ?)');

        const tx = db.transaction(() => {
            rankingIds.forEach((candidaturaId, index) => {
                const points = rankingIds.length - index;
                const pos = index + 1;
                const pos1 = pos === 1 ? 1 : 0;
                const pos2 = pos === 2 ? 1 : 0;
                const pos3 = pos === 3 ? 1 : 0;

                updatePoints.run(points, pos1, pos2, pos3, candidaturaId);
                insertDetalle.run(viajeId, usuarioId, candidaturaId, pos);
            });
            db.prepare('INSERT INTO votos_realizados (viaje_id, usuario_id) VALUES (?, ?)').run(viajeId, usuarioId);
        });
        tx();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Error" }); }
});
app.post('/api/voting/borrar', (req, res) => {
    // OJO: Aceptamos 'id' O 'candidaturaId' para evitar fallos
    const idParaBorrar = req.body.id || req.body.candidaturaId;
    console.log("Intentando borrar ID:", idParaBorrar); // Debug en consola server
    if (!idParaBorrar) return res.json({ success: false, message: "Falta ID" });
    db.run("DELETE FROM candidaturas WHERE id = ?", [idParaBorrar], function (err) {
        if (err) {
            console.error("Error SQL al borrar:", err);
            return res.json({ success: false, message: err.message });
        }
        // Importante: this.changes dice cuántas filas se borraron
        res.json({ success: true, changes: this.changes });
    });
});
app.post('/api/voting/cerrar', (req, res) => {
    const { viajeId } = req.body;
    try {
        // Query robusta: Borda -> Pos1 -> Pos2 -> Pos3 -> RANDOM (Triple empate friendly)
        const ganador = db.prepare(`
            SELECT c.ciudad 
            FROM candidaturas c
            LEFT JOIN votos_detalle v1 ON c.id = v1.candidatura_id AND v1.posicion = 1
            LEFT JOIN votos_detalle v2 ON c.id = v2.candidatura_id AND v2.posicion = 2
            LEFT JOIN votos_detalle v3 ON c.id = v3.candidatura_id AND v3.posicion = 3
            WHERE c.viaje_id = ?
            GROUP BY c.id
            ORDER BY 
                c.puntos DESC, 
                COUNT(v1.id) DESC, 
                COUNT(v2.id) DESC, 
                COUNT(v3.id) DESC, 
                RANDOM()
            LIMIT 1
        `).get(viajeId);

        let finalDestino = ganador ? ganador.ciudad : null;

        // Fail-safe: Si por algo la query falla, elegir uno random de la lista
        if (!finalDestino) {
            const fallback = db.prepare('SELECT ciudad FROM candidaturas WHERE viaje_id = ? ORDER BY RANDOM() LIMIT 1').get(viajeId);
            if (fallback) finalDestino = fallback.ciudad;
        }

        if (finalDestino) {
            db.prepare('UPDATE viajes SET destino = ? WHERE id = ?').run(finalDestino, viajeId);
            res.json({ success: true, nuevoDestino: finalDestino });
        } else {
            res.status(404).json({ error: "No hay candidaturas para cerrar" });
        }
    } catch (e) {
        console.error("Error al cerrar votación:", e);
        res.status(500).json({ error: "Fail-safe activado" });
    }
});

// --- CALENDARIO (ACTUALIZADO) ---
app.get('/api/calendar/heat', (req, res) => {
    const { viajeId } = req.query;
    // Recuperamos también las fechas oficiales si existen
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

// --- CALENDARIO SLIDING WINDOW ---
app.post('/api/calendar/best-interval', (req, res) => {
    const { viajeId, duracion } = req.body;
    const dur = parseInt(duracion) || 4;

    const fechas = db.prepare('SELECT fecha, COUNT(*) as coincidencia FROM disponibilidad WHERE viaje_id = ? GROUP BY fecha ORDER BY fecha ASC').all(viajeId);
    if (fechas.length === 0) return res.json({ success: false });

    let maxMatch = -1;
    let bestStart = null;

    // Sliding window logic
    for (let i = 0; i <= fechas.length - dur; i++) {
        let currentMatch = 0;
        // Check if the window is continuous (optional, but requested as "intervalo de esos días")
        // For simplicity, we calculate the sum of available data within a range.
        const window = fechas.slice(i, i + dur);

        // Check if dates are consecutive
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
        // Fallback: Si no hay días consecutivos marcados, buscar el primero con datos
        res.json({ success: false });
    }
});

app.post('/api/calendar/toggle', (req, res) => {
    const { viajeId, usuarioId, fecha } = req.body; const existe = db.prepare('SELECT id FROM disponibilidad WHERE usuario_id = ? AND fecha = ?').get(usuarioId, fecha); if (existe) { db.prepare('DELETE FROM disponibilidad WHERE id = ?').run(existe.id); res.json({ status: 'removed' }); } else { db.prepare('INSERT INTO disponibilidad (viaje_id, usuario_id, fecha) VALUES (?, ?, ?)').run(viajeId, usuarioId, fecha); res.json({ status: 'added' }); }
});

// 🔥 NUEVO: FIJAR FECHAS OFICIALES
app.post('/api/calendar/fijar', (req, res) => {
    const { viajeId, fechaInicio, fechaFin } = req.body;
    db.prepare('UPDATE viajes SET fecha_inicio = ?, fecha_fin = ? WHERE id = ?').run(fechaInicio, fechaFin, viajeId);
    res.json({ success: true });
});

// --- WALLET (Mismo código pero usando es_tesorero de la tabla usuarios) ---
app.get('/api/wallet/estado', (req, res) => { const { viajeId } = req.query; const totalRecaudado = db.prepare(`SELECT SUM(a.monto_pagado) as t FROM aportaciones a JOIN usuarios u ON a.usuario_id = u.id WHERE u.viaje_id = ?`).get(viajeId).t || 0; const usuarios = db.prepare('SELECT id, nombre, es_tesorero FROM usuarios WHERE viaje_id = ?').all(viajeId); const estadoUsuarios = usuarios.map(u => { const pedido = db.prepare('SELECT SUM(monto_solicitado) as t FROM aportaciones WHERE usuario_id = ?').get(u.id).t || 0; const pagado = db.prepare('SELECT SUM(monto_pagado) as t FROM aportaciones WHERE usuario_id = ?').get(u.id).t || 0; const adelantado = db.prepare('SELECT SUM(monto) as t FROM adelantos WHERE usuario_id = ?').get(u.id).t || 0; const balance = (pagado + adelantado) - pedido; return { ...u, balance, debe: balance < 0, credito: balance > 0 }; }); res.json({ saldoBote: totalRecaudado, usuarios: estadoUsuarios }); });
app.post('/api/wallet/nueva-ronda', (req, res) => { const { viajeId, monto } = req.body; const rondaId = db.prepare('INSERT INTO rondas (viaje_id, monto_individual_solicitado) VALUES (?, ?)').run(viajeId, monto).lastInsertRowid; const users = db.prepare('SELECT id FROM usuarios WHERE viaje_id = ?').all(viajeId); const insert = db.prepare('INSERT INTO aportaciones (ronda_id, usuario_id, monto_solicitado) VALUES (?, ?, ?)'); const tx = db.transaction(() => { for (const u of users) insert.run(rondaId, u.id, monto); }); tx(); res.json({ success: true }); });
app.post('/api/wallet/pagar', (req, res) => { const { usuarioId, cantidad } = req.body; const deudas = db.prepare('SELECT id, monto_solicitado, monto_pagado FROM aportaciones WHERE usuario_id = ? AND monto_pagado < monto_solicitado').all(usuarioId); let restante = Number(cantidad); const update = db.prepare('UPDATE aportaciones SET monto_pagado = ? WHERE id = ?'); const tx = db.transaction(() => { for (const d of deudas) { if (restante <= 0) break; const falta = d.monto_solicitado - d.monto_pagado; const pago = Math.min(restante, falta); update.run(d.monto_pagado + pago, d.id); restante -= pago; } if (restante > 0) db.prepare('INSERT INTO adelantos (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, "Exceso pago", restante); }); tx(); res.json({ success: true }); });
app.post('/api/wallet/adelantar', (req, res) => { const { usuarioId, monto, concepto } = req.body; db.prepare('INSERT INTO adelantos (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, concepto, monto); res.json({ success: true }); });
app.get('/api/wallet/mis-gastos', (req, res) => { const { usuarioId } = req.query; const gastos = db.prepare('SELECT * FROM gastos_personales WHERE usuario_id = ? ORDER BY id DESC').all(usuarioId); res.json({ gastos }); });
app.post('/api/wallet/nuevo-gasto-personal', (req, res) => { const { usuarioId, concepto, monto } = req.body; db.prepare('INSERT INTO gastos_personales (usuario_id, concepto, monto) VALUES (?, ?, ?)').run(usuarioId, concepto, monto); res.json({ success: true }); });
app.get('/api/buscar-sitios', async (req, res) => { const { busqueda, lat, lng, radio } = req.query; let q = busqueda; if (['tapas', 'bar', 'comer', 'restaurante'].some(x => busqueda.toLowerCase().includes(x))) q += ' calidad tradicional'; const radioFinal = radio || 1500; try { const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&location=${lat},${lng}&radius=${radioFinal}&key=${GOOGLE_API_KEY}`; const resp = await axios.get(url); if (resp.data.results) { const hits = resp.data.results.filter(p => p.rating >= 4.2).slice(0, 10).map(p => ({ id: p.place_id, nombre: p.name, rating: p.rating, total_opiniones: p.user_ratings_total, coords: p.geometry.location, direccion: p.formatted_address, foto: p.photos ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${GOOGLE_API_KEY}` : null, categoria: p.types ? p.types[0].replace(/_/g, ' ').toUpperCase() : 'LOCAL', abierto: p.opening_hours ? p.opening_hours.open_now : null })); res.json({ sitios: hits }); } else res.json({ sitios: [] }); } catch (e) { res.json({ sitios: [] }); } });

app.listen(PORT, () => { console.log(`\n✈️ SERVIDOR LISTO EN PUERTO ${PORT}`); });