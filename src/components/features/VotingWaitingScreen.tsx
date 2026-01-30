import { Users, Clock, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VotingWaitingScreenProps {
    viajeId: number;
    onAllVoted: () => void;
    onBack?: () => void;
    user?: { id: number; nombre: string; rol: string }; // <--- AÑADIDO
}

export const VotingWaitingScreen: React.FC<VotingWaitingScreenProps> = ({ viajeId, onAllVoted, onBack, user }) => {
    const [progress, setProgress] = useState({
        totalUsers: 0,
        votedUsers: 0,
        pendingUsers: [] as string[],
        allVoted: false
    });

    useEffect(() => {
        const checkProgress = async () => {
            try {
                const res = await fetch(`http://localhost:3005/api/voting/progreso?viajeId=${viajeId}`);
                const data = await res.json();
                setProgress(data);

                if (data.allVoted) {
                    onAllVoted();
                }
            } catch (error) {
                console.error('Error checking vote progress:', error);
            }
        };

        checkProgress();
        const interval = setInterval(checkProgress, 2000);
        return () => clearInterval(interval);
    }, [viajeId, onAllVoted]);

    const progressPercentage = progress.totalUsers > 0
        ? (progress.votedUsers / progress.totalUsers) * 100
        : 0;

    return (
        <div className="fixed inset-0 z-[200] bg-[#F8F5F2] flex flex-col items-center justify-center p-6">
            {/* Botón de Volver */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 rounded-xl shadow-md border border-[#E7E5E4] transition-all"
                >
                    <ArrowLeft size={18} className="text-[#1B4332]" />
                    <span className="text-sm font-bold text-[#1B4332]">Volver</span>
                </button>
            )}

            <div className="bg-white/80 backdrop-blur-md rounded-3xl p-12 max-w-md w-full shadow-2xl border border-[#E7E5E4] text-center animate-in fade-in">
                <div className="w-20 h-20 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Clock size={40} className="text-[#1B4332]" />
                </div>

                <h2 className="text-2xl serif-font text-[#1B4332] mb-3 font-semibold">
                    ¡Voto Guardado!
                </h2>

                <p className="text-[#78716C] mb-8 leading-relaxed">
                    Esperando a que vote el resto del grupo...
                </p>

                {/* Barra de Progreso */}
                <div className="bg-[#F8F5F2] rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Users size={24} className="text-[#1B4332]" />
                        <span className="text-4xl serif-font text-[#1B4332] font-bold">
                            {progress.votedUsers} / {progress.totalUsers}
                        </span>
                    </div>

                    {/* Barra de Progreso Lineal */}
                    <div className="w-full bg-[#E7E5E4] rounded-full h-3 overflow-hidden mb-4">
                        <div
                            className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] h-full transition-all duration-500 rounded-full"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>

                    <p className="text-xs text-[#A8A29E] uppercase tracking-wider font-bold">
                        {progress.totalUsers - progress.votedUsers === 1
                            ? 'Falta 1 persona'
                            : `Faltan ${progress.totalUsers - progress.votedUsers} personas`}
                    </p>
                </div>

                {/* Lista de la Vergüenza (con estilo elegante) */}
                {progress.pendingUsers.length > 0 && (
                    <div className="mb-6">
                        <p className="text-[10px] font-bold text-[#78716C] uppercase tracking-widest mb-3 opacity-60">
                            Esperando por...
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {progress.pendingUsers.map((nombre, idx) => (
                                <span
                                    key={idx}
                                    className="px-3 py-1.5 bg-[#1B4332]/10 text-[#1B4332] text-xs font-medium rounded-full border border-[#1B4332]/20 animate-pulse"
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                    {nombre}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Indicador de Actualización */}
                <div className="flex items-center justify-center gap-2 text-[#78716C] mb-4">
                    <div className="w-2 h-2 bg-[#1B4332] rounded-full animate-pulse" />
                    <span className="text-xs font-medium">Actualizando en tiempo real...</span>
                </div>

                {/* Botón de Override Manual (SOLO PARA ADMIN) */}
                {user?.rol === 'admin' && (
                    <button
                        onClick={() => onAllVoted()}
                        className="text-xs text-[#78716C]/60 hover:text-[#1B4332] underline transition-colors"
                    >
                        Ver resultados de todas formas
                    </button>
                )}
            </div>
        </div>
    );
};
