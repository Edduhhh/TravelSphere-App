
import axios from 'axios';

async function checkStatus() {
    try {
        const res = await axios.get('http://localhost:3005/api/viaje/estado?viajeId=29');
        console.log('Status Response:', res.data);
    } catch (e) {
        console.error('Error fetching status:', e.message);
        if (e.response) console.error('Data:', e.response.data);
    }
}

checkStatus();
