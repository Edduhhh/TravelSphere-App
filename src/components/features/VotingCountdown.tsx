import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface VotingCountdownProps {
    votingDate: string | null;
    isAdmin: boolean;
    onDateUpdate: (date: string) => void;
    onStartVoting: () => void;
    candidatesCount: number;
}

export const VotingCountdown = ({
    votingDate,
    candidatesCount
}: VotingCountdownProps) => {
    const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isExpired, setIsExpired] = useState(false);

    // Calcular cuenta atrás
    useEffect(() => {
        if (!votingDate) return;

        const updateCountdown = () => {
            const now = new Date().getTime();
            const target = new Date(votingDate).getTime();
            const diff = target - now;

            if (diff <= 0) {
                setIsExpired(true);
                setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }

            setIsExpired(false);
            setCountdown({
                days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((diff % (1000 * 60)) / 1000)
            });
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [votingDate]);

    if (!votingDate) return null;

    return (
        <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl shadow-xl bg-gradient-to-br from-[#1B4332] to-[#143225] text-white relative overflow-hidden group border border-[#1B4332]/50 animate-in fade-in">

            {/* Decoración de fondo sutil */}
            <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/3 -translate-y-1/3 pointer-events-none">
                <Calendar size={140} />
            </div>

            <div className="relative z-10 text-center">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                    <Calendar size={14} />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.3em]">
                        {isExpired ? 'Votación en curso' : 'Tiempo Restante'}
                    </h3>
                </div>

                {/* LOS CONTADORES */}
                <div className="flex justify-center items-end gap-2 md:gap-6 mb-6">
                    {/* DÍAS */}
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-6xl font-bold serif-font text-white tabular-nums leading-none">
                            {countdown.days}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-white/40 mt-2">Días</span>
                    </div>

                    <span className="text-2xl md:text-4xl text-white/20 pb-4 mb-1">:</span>

                    {/* HORAS */}
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-6xl font-bold serif-font text-white tabular-nums leading-none">
                            {countdown.hours.toString().padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-white/40 mt-2">Horas</span>
                    </div>

                    <span className="text-2xl md:text-4xl text-white/20 pb-4 mb-1">:</span>

                    {/* MINUTOS */}
                    <div className="flex flex-col items-center">
                        <span className="text-4xl md:text-6xl font-bold serif-font text-white tabular-nums leading-none">
                            {countdown.minutes.toString().padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase tracking-widest text-white/40 mt-2">Min</span>
                    </div>
                </div>

                {/* Info de la fecha exacta */}
                <div className="inline-block px-4 py-1 rounded-full bg-white/10 border border-white/5 text-[10px] text-white/70 tracking-wider">
                    {new Date(votingDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {' • '}
                    {new Date(votingDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </div>

                {/* Avisos pequeños */}
                {candidatesCount > 0 && candidatesCount < 3 && !isExpired && (
                    <div className="mt-4 text-[10px] text-red-200 bg-red-900/30 px-3 py-1 rounded-lg inline-block border border-red-500/20">
                        ⚠ Se requieren mínimo 3 destinos
                    </div>
                )}
            </div>
        </div>
    );
};