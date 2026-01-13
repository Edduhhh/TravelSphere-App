import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, Map as MapIcon, Send } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ExploreProps {
    currentCity: string;
    isNavigating: boolean;
    localLens: boolean;
    navTarget: string;
    setNavTarget: (t: string) => void;
    onAiAction: (type: string, data?: string) => void;
}

// 🌍 ATLAS MEJORADO (Soporta tildes y sin tildes)
const cityCoordinates: Record<string, [number, number]> = {
    "Roma": [41.9028, 12.4964], "Rome": [41.9028, 12.4964],
    "Tokio": [35.6762, 139.6503], "Tokyo": [35.6762, 139.6503],
    "París": [48.8566, 2.3522], "Paris": [48.8566, 2.3522], // <-- ¡Ahora sí vuela!
    "New York": [40.7128, -74.0060], "Nueva York": [40.7128, -74.0060],
    "Madrid": [40.4168, -3.7038],
    "Barcelona": [41.3851, 2.1734],
    "Londres": [51.5074, -0.1278], "London": [51.5074, -0.1278],
    "Berlín": [52.5200, 13.4050], "Berlin": [52.5200, 13.4050],
    "A Coruña": [43.3623, -8.4115], "La Coruña": [43.3623, -8.4115],
    "Default": [41.9028, 12.4964]
};

function MapFlyTo({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 13, { duration: 2 });
    }, [center, map]);
    return null;
}

export const Explore = ({ currentCity, isNavigating, localLens, navTarget, setNavTarget, onAiAction }: ExploreProps) => {
    const [query, setQuery] = useState("");

    // Buscamos las coordenadas (ahora es más listo)
    const position = cityCoordinates[currentCity] || cityCoordinates["Default"];

    const handleSearch = () => {
        if (query.trim()) {
            onAiAction('consult', `¿Dónde está ${query} en ${currentCity}?`);
            setNavTarget(query);
            setQuery("");
        }
    };

    return (
        <div className="h-full w-full relative bg-slate-50 flex flex-col">

            {/* 🗺️ EL MAPA */}
            <div className="flex-1 w-full relative z-0">
                <MapContainer center={position} zoom={13} scrollWheelZoom={true} className="h-full w-full" zoomControl={false}>
                    <TileLayer
                        attribution='&copy; OpenStreetMap'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position}>
                        <Popup>¡Estás en <b>{currentCity}</b>!</Popup>
                    </Marker>
                    <MapFlyTo center={position} />
                </MapContainer>
            </div>

            {/* Panel Flotante SUPERIOR (Más pequeño) */}
            <div className="absolute top-4 left-4 right-4 z-[400]">
                <div className="bg-white/90 backdrop-blur-md p-3 rounded-[1.5rem] shadow-lg border border-white/50 flex items-center gap-2">
                    <div className={`p-2 rounded-full ${isNavigating ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        {isNavigating ? <Navigation size={18} /> : <MapIcon size={18} />}
                    </div>

                    {/* Buscador Integrado */}
                    <input
                        type="text"
                        placeholder={`Buscar en ${currentCity}...`}
                        className="flex-1 bg-transparent border-none text-xs font-bold text-slate-600 outline-none placeholder:text-slate-400"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />

                    <button onClick={handleSearch} className="bg-slate-800 text-white p-2 rounded-full active:scale-90 transition-all">
                        <Send size={14} />
                    </button>
                </div>
            </div>

            {/* Nota: El panel inferior lo gestiona App.tsx, lo reduciremos al final para no romper la navegación ahora */}
        </div>
    );
};