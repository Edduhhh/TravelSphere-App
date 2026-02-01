// Reset viaje 20
const viajeId = 20;

console.log(`🔄 Reseteando viaje ${viajeId}...`);

fetch('http://localhost:3005/api/voting/reset-viaje', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ viajeId })
})
    .then(res => res.json())
    .then(data => {
        console.log('✅ Respuesta:', data);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err);
        process.exit(1);
    });
