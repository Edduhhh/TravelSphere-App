import { Users, Clock, ArrowLeft, AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VotingWaitingScreenProps {
    viajeId: number;
    onAllVoted: () => void;
    onBack?: () => void;
    onResetVote?: () => void; // <--- NUEVO: Para desbloquear
    user?: { id: number; nombre: string; rol: string };
}

export const VotingWaitingScreen: React.FC<VotingWaitingScreenProps> = ({ viajeId, onAllVoted, onBack, onResetVote, user }) => {
    const [progress, setProgress] = useState({
        totalUsers: 0,
        votedUsers: 0,
        pendingUsers: [] as string[],
        allVoted: false
    });
    const [showForceExit, setShowForceExit] = useState(false);

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

    const handleForceExit = () => {
        if (onBack) {
            onBack();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-[#F8F5F2] flex flex-col items-center justify-center p-6">
            {/* Botón de Escape de Emergencia - Siempre visible */}
            <button
                onClick={() => setShowForceExit(!showForceExit)}
                className="absolute top-6 right-6 p-2 bg-red-500 hover:bg-red-600 rounded-full shadow-lg transition-all z-10"
                title="Salir de esta pantalla"
            >
                <X size={20} className="text-white" />
            </button>

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

                {/* Panel de Salida Forzada */}
                {showForceExit && (
                    <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl animate-in slide-in-from-top">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={20} className="text-red-600" />
                            <p className="text-sm font-bold text-red-800">Salida de Emergencia</p>
                        </div>
                        <p className="text-xs text-red-700 mb-3 leading-relaxed">
                            ¿Estás seguro de que quieres salir? Esto te permitirá volver al dashboard.
                        </p>
                        <button
                            onClick={handleForceExit}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors shadow-md"
                        >
                            SÍ, SALIR AHORA
                        </button>
                    </div>
                )}

                {/* ⚠️ ALERTA DE USUARIO PENDIENTE (SOLUCIÓN EMERGENCY) */}
                {(() => {
                    const cleanName = (n: string) => n?.toLowerCase().trim();
                    const isPending = user && progress.pendingUsers.some(p => cleanName(p) === cleanName(user.nombre));

                    // Debugging visible para el usuario si es necesario (o por consola)
                    if (user && progress.pendingUsers.length > 0) {
                        console.log('🔍 [DEBUG WAIT] Me:', user.nombre, '| Pending:', progress.pendingUsers, '| Match:', isPending, '| HasResetFn:', !!onResetVote);
                    }

                    if (isPending && onResetVote) {
                        return (
                            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col gap-3 shadow-lg animate-in slide-in-from-bottom">
                                <div className="flex items-start gap-3 text-left">
                                    <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
                                        <Users size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-yellow-800">¿Eres tú, {user?.nombre}?</p>
                                        <p className="text-xs text-yellow-700 mt-1">El sistema espera tu voto, pero tú estás aquí.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onResetVote}
                                    className="w-full bg-yellow-600 text-white py-3 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-yellow-700 transition-colors shadow-sm"
                                >
                                    CORREGIR Y VOTAR
                                </button>
                            </div>
                        );
                    }
                    return null;
                })()}

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
