import Database from 'better-sqlite3';

const db = new Database('viajes_pro.db');

console.log('\n🔍 ANÁLISIS DE VOTOS - VIAJE 20\n');

// Ver todos los votos con detalles
const detalles = db.prepare(`
    SELECT 
        u.nombre as usuario,
        u.id as usuario_id,
        c.ciudad,
        c.id as ciudad_id,
        vd.posicion,
        c.puntos as puntos_totales
    FROM votos_detalle vd
    JOIN usuarios u ON vd.usuario_id = u.id
    JOIN candidaturas c ON vd.candidatura_id = c.id
    WHERE vd.viaje_id = 20
    ORDER BY u.nombre, vd.posicion
`).all();

if (detalles.length === 0) {
    console.log('❌ NO HAY VOTOS REGISTRADOS\n');
    db.close();
    process.exit(0);
}

// Agrupar por usuario
const votosPorUsuario = {};
detalles.forEach(d => {
    if (!votosPorUsuario[d.usuario]) {
        votosPorUsuario[d.usuario] = [];
    }
    votosPorUsuario[d.usuario].push({
        posicion: d.posicion,
        ciudad: d.ciudad,
        ciudad_id: d.ciudad_id
    });
});

// Mostrar votos
console.log('📊 VOTOS EMITIDOS:\n');
Object.keys(votosPorUsuario).forEach(usuario => {
    console.log(`👤 ${usuario}:`);
    votosPorUsuario[usuario].forEach(v => {
        console.log(`   ${v.posicion}. ${v.ciudad} (ID: ${v.ciudad_id})`);
    });
    console.log('');
});

// Mostrar puntuaciones finales
console.log('🏆 PUNTUACIÓN TOTAL POR CIUDAD:\n');
const puntos = db.prepare(`
    SELECT 
        ciudad,
        id,
        puntos,
        votos_pos1,
        votos_pos2,
        votos_pos3
    FROM candidaturas
    WHERE viaje_id = 20
    ORDER BY puntos DESC, votos_pos1 DESC
`).all();

puntos.forEach((c, index) => {
    console.log(`${index + 1}. ${c.ciudad.padEnd(15)} | Puntos: ${c.puntos.toString().padStart(3)} | 1º: ${c.votos_pos1} | 2º: ${c.votos_pos2} | 3º: ${c.votos_pos3}`);
});

console.log('\n═══════════════════════════════════════\n');

db.close();
