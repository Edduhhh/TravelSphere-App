import { useState, useEffect } from 'react';
import { MessageCircle, Plane, Calendar, Sparkles, Map } from 'lucide-react';

// --- PROPS INTERFACE ---
interface TripSummaryProps {
    destino: string;
    startDate: string;
    endDate: string;
    onGoToMap?: () => void;
}

// --- COMPONENT ---
export const TripSummary = ({
    destino,
    startDate,
    endDate,
    onGoToMap
}: TripSummaryProps) => {
    const [daysUntilTrip, setDaysUntilTrip] = useState(0);

    // Calculate days until trip start
    useEffect(() => {
        const calculateDays = () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to midnight

            const tripStart = new Date(startDate);
            tripStart.setHours(0, 0, 0, 0);

            const diffMs = tripStart.getTime() - today.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            setDaysUntilTrip(diffDays);
        };

        calculateDays();

        // Update every day at midnight
        const interval = setInterval(calculateDays, 60000); // Check every minute

        return () => clearInterval(interval);
    }, [startDate]);

    // Format date range
    const formatDateRange = () => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const startDay = start.getDate();
        const endDay = end.getDate();
        const month = monthNames[end.getMonth()];

        return `${startDay} - ${endDay} ${month}`;
    };

    return (
        <div className="relative h-full bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#40916C] overflow-y-auto">
            {/* Animated Background Circles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 px-6 py-16 text-center max-w-4xl mx-auto">
                {/* Success Icon */}
                <div className="mb-8 animate-enter">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <Plane size={64} className="text-white" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-6xl serif-font text-white mb-4 animate-enter font-bold">
                    ¡Habemus Viaje a {destino}! ✈️
                </h1>

                {/* Date Range */}
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-12 border border-white/20 shadow-2xl animate-enter animation-delay-200">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Calendar size={32} className="text-white" />
                        <h2 className="text-3xl serif-font text-white font-bold">Fechas Oficiales</h2>
                    </div>
                    <p className="text-6xl font-bold text-white mb-2">
                        {formatDateRange()}
                    </p>
                    <p className="text-white/80 text-lg">2026</p>
                </div>

                {/* COUNTDOWN - THE HYPE */}
                <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-md rounded-3xl p-12 mb-12 border border-white/30 shadow-2xl animate-enter animation-delay-400">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <Sparkles size={40} className="text-yellow-300 animate-pulse" />
                        <h2 className="text-3xl serif-font text-white font-bold">La Cuenta Atrás</h2>
                        <Sparkles size={40} className="text-yellow-300 animate-pulse" />
                    </div>

                    {/* Giant Counter */}
                    <div className="relative">
                        <div className="text-9xl md:text-[12rem] font-black text-white leading-none mb-4 animate-pulse">
                            {daysUntilTrip > 0 ? daysUntilTrip : daysUntilTrip === 0 ? '¡HOY!' : 'Pasado'}
                        </div>
                        {daysUntilTrip > 0 && (
                            <p className="text-2xl md:text-3xl text-white/90 font-bold">
                                {daysUntilTrip === 1 ? 'día para el despegue 🚀' : 'días para el despegue 🚀'}
                            </p>
                        )}
                        {daysUntilTrip === 0 && (
                            <p className="text-2xl md:text-3xl text-white/90 font-bold">
                                ¡Es hora de volar! 🎉
                            </p>
                        )}
                    </div>

                    {/* Motivational Quote */}
                    <div className="mt-8 pt-8 border-t border-white/20">
                        <p className="text-xl text-white/80 italic">
                            "La aventura está a punto de comenzar..."
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 animate-enter animation-delay-600">
                    {/* Chat Placeholder */}
                    <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 transition-all hover:scale-105 shadow-xl">
                        <MessageCircle size={32} className="text-white mx-auto mb-3" />
                        <p className="text-white font-bold">Ir al Chat de Grupo</p>
                        <p className="text-white/60 text-xs mt-1">Próximamente</p>
                    </button>

                    {/* Flights Placeholder */}
                    <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl p-6 transition-all hover:scale-105 shadow-xl">
                        <Plane size={32} className="text-white mx-auto mb-3" />
                        <p className="text-white font-bold">Buscar Vuelos</p>
                        <p className="text-white/60 text-xs mt-1">Próximamente</p>
                    </button>

                    {/* Go to Map */}
                    <button
                        onClick={onGoToMap}
                        className="bg-white hover:bg-white/90 rounded-2xl p-6 transition-all hover:scale-105 shadow-2xl"
                    >
                        <Map size={32} className="text-[#1B4332] mx-auto mb-3" />
                        <p className="text-[#1B4332] font-bold">Ver en el Mapa</p>
                        <p className="text-[#2D6A4F] text-xs mt-1">Explorar destino</p>
                    </button>
                </div>

                {/* Footer Message */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 animate-enter animation-delay-800">
                    <p className="text-white/70 text-sm">
                        ¡El viaje ha sido confirmado! Prepara tus maletas y tu mejor actitud viajera 🌍
                    </p>
                </div>
            </div>

            {/* Custom Animations CSS */}
            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                .animation-delay-200 {
                    animation-delay: 0.2s;
                }
                .animation-delay-400 {
                    animation-delay: 0.4s;
                }
                .animation-delay-600 {
                    animation-delay: 0.6s;
                }
                .animation-delay-800 {
                    animation-delay: 0.8s;
                }
            `}</style>
        </div>
    );
};
