// Recuperamos la llave
const API_KEY = import.meta.env.VITE_BRAVE_API_KEY;

// --- 🛡️ BASE DE DATOS DE EMERGENCIA (PLAN B) ---
// Si internet falla (CORS), tu app usará esto para no dejarte tirado.
const FALLBACK_DB: Record<string, string> = {
    "roma": "🇮🇹 (Modo Offline) Top en Roma:\n1. Da Enzo al 29 (Trattoria auténtica)\n2. Tonnarello (La mejor carbonara)\n3. Pizzeria Ai Marmi\n⚠️ Consejo: Evita restaurantes con menú turístico en la puerta.",
    "tokio": "🇯🇵 (Modo Offline) Top en Tokio:\n1. Ichiran Ramen (Cabinas individuales)\n2. Sushiro (Sushi barato)\n3. Omoide Yokocho (Callejón histórico)",
    "paris": "🇫🇷 (Modo Offline) Top en París:\n1. L'As du Fallafel\n2. Bouillon Chartier (Clásico y barato)\n3. Creperie Bretonne",
    "default": "✨ (Modo Offline) No pude conectar con el servidor de búsqueda (Bloqueo CORS), pero te recomiendo buscar locales llenos de gente que no hablen inglés."
};

export const searchInternet = async (query: string): Promise<string> => {
    // 1. Intentamos conectar con Brave (El Detective Real)
    try {
        if (!API_KEY) throw new Error("No Key");

        const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}`, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "X-Subscription-Token": API_KEY
            }
        });

        if (!response.ok) throw new Error("Bloqueo CORS o Error API");

        const data = await response.json();
        const results = data.web.results.slice(0, 3).map((r: any) =>
            `- ${r.title}: ${r.description}`
        ).join("\n");

        return `🕵️‍♂️ (Online) He encontrado esto:\n${results}`;

    } catch (error) {
        // 2. 🚨 AQUÍ ESTÁ LA MAGIA: Si falla, usamos el Plan B
        console.warn("Fallo de conexión real, activando simulación:", error);

        const q = query.toLowerCase();
        let answer = FALLBACK_DB["default"];

        if (q.includes("roma") || q.includes("italia")) answer = FALLBACK_DB["roma"];
        else if (q.includes("tokio") || q.includes("japon")) answer = FALLBACK_DB["tokio"];
        else if (q.includes("paris") || q.includes("francia")) answer = FALLBACK_DB["paris"];

        return `🤖 ${answer}`;
    }
};

export const getSimulation = async (prompt: string): Promise<string> => {
    const p = prompt.toLowerCase();

    // Si detectamos intención de búsqueda, lanzamos el buscador (o su simulación)
    if (p.includes("buscar") || p.includes("donde") || p.includes("restaurante") || p.includes("consult")) {
        const cleanPrompt = prompt.replace("consult ", "");
        return await searchInternet(cleanPrompt);
    }

    // Respuestas rápidas de memoria
    if (p.includes("jet lag")) return "🌙 Plan Dr. Jet Lag: Luz solar antes de las 11:00 y mucha agua.";
    if (p.includes("sos")) return "🚨 AUXILIO: Policía 110, Ambulancia 119.";
    if (p.includes("mood")) return "✨ Según tu vibra, te recomiendo visitar el barrio bohemio.";

    return "✨ Estoy lista. Prueba a escribir 'Buscar restaurantes en Roma'.";
};