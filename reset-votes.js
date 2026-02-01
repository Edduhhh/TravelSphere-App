// Script para resetear todos los votos de un viaje
// Uso: node reset-votes.js <viajeId>

const viajeId = process.argv[2];

if (!viajeId) {
    console.error('❌ Error: Debes proporcionar el viajeId');
    console.log('Uso: node reset-votes.js <viajeId>');
    console.log('Ejemplo: node reset-votes.js 20');
    process.exit(1);
}

console.log(`🔄 Reseteando votos del viaje ${viajeId}...`);

fetch(`http://localhost:3005/api/voting/reset-viaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viajeId: parseInt(viajeId) })
})
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            console.log('✅ Viaje reseteado exitosamente');
            console.log('   Ahora todos los usuarios pueden votar de nuevo');
        } else {
            console.error('❌ Error:', data.error || 'Error desconocido');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error de conexión:', err.message);
        console.log('⚠️  Asegúrate de que el servidor esté corriendo (node server.js)');
        process.exit(1);
    });
