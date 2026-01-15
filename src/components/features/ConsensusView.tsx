import { useState, useEffect } from 'react';
import { ArrowRight, Trophy, Users, Clock, Loader2, Check, TrendingUp, DollarSign, Target } from 'lucide-react';

// --- PROPS INTERFACE ---
interface ConsensusViewProps {
    viajeId: number;
    tripDuration: number;
    isAdmin: boolean;
    onBack?: () => void;
    onVoteComplete?: (selectedOption: any) => void;
}

interface DateOption {
    startDate: string;
    endDate: string;
    users: string[];
    userCount: number;
    idealScore: number;
    flexibleScore: number;
    balanceScore: number;
}

interface AnalysisData {
    status: 'waiting' | 'ready' | 'insufficient_data';
    progress: { submitted: number; total: number };
    message?: string;
    options?: {
        popular: DateOption | null;
        economic: DateOption | null;
        balance: DateOption | null;
    };
}

// --- COMPONENT ---
export const ConsensusView = ({
    viajeId,
    tripDuration,
    isAdmin,
    onBack,
    onVoteComplete
}: ConsensusViewProps) => {
    const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<'popular' | 'economic' | 'balance' | null>(null);

    // Fetch analysis from server AND check if trip is finalized
    const fetchAnalysis = async () => {
        setIsLoading(true);
        try {
            // Check if trip has been finalized (admin confirmed date)
            const statusRes = await fetch(`http://localhost:3005/api/viaje/estado?viajeId=${viajeId}`);
            const statusData = await statusRes.json();

            // If trip has final date, redirect ALL users to TripSummary
            if (statusData.fechaFinal && onVoteComplete) {
                console.log('🎯 Fecha final detectada, redirigiendo...', statusData.fechaFinal);
                // Trigger navigation with the final date data
                onVoteComplete({
                    startDate: statusData.fechaFinal.inicio,
                    endDate: statusData.fechaFinal.fin
                });
                return; // Stop further processing
            }

            // Otherwise, fetch consensus analysis
            const res = await fetch(`http://localhost:3005/api/calendar/analyze?viajeId=${viajeId}&tripDuration=${tripDuration}`);
            const data = await res.json();
            setAnalysisData(data);
        } catch (error) {
            console.error('Error fetching analysis:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // PERSISTENT POLLING - ALWAYS ACTIVE (every 2s)
    useEffect(() => {
        fetchAnalysis();

        const interval = setInterval(() => {
            fetchAnalysis(); // Poll every 2 seconds ALWAYS
        }, 2000);

        return () => clearInterval(interval);
    }, [viajeId, tripDuration]); // Re-setup if props change

    // Format date range nicely
    const formatDateRange = (startDate: string, endDate: string) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return `${start.getDate()} - ${end.getDate()} ${monthNames[end.getMonth()]}`;
    };

    // Handle vote - Save to backend and navigate
    const handleVote = async () => {
        if (!selectedOption || !analysisData?.options) return;

        const option = analysisData.options[selectedOption];
        if (!option) return;

        try {
            // Save chosen date to backend
            const res = await fetch('http://localhost:3005/api/trip/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    viajeId,
                    startDate: option.startDate,
                    endDate: option.endDate
                })
            });

            const data = await res.json();
            if (data.success && onVoteComplete) {
                onVoteComplete(option);
            } else {
                alert('Error guardando fecha');
            }
        } catch (error) {
            console.error('Error voting:', error);
            alert('Error de conexión');
        }
    };

    // --- LOADING STATE ---
    if (isLoading && !analysisData) {
        return (
            <div className="h-full bg-[#F8F5F2] flex items-center justify-center">
                <div className="text-center animate-enter">
                    <Loader2 size={48} className="text-[#1B4332] animate-spin mx-auto mb-4" />
                    <p className="text-[#78716C]">Analizando disponibilidad del grupo...</p>
                </div>
            </div>
        );
    }

    // --- WAITING STATE (not all users have confirmed) ---
    if (analysisData?.status === 'waiting' || analysisData?.status === 'insufficient_data') {
        const progress = analysisData.progress;
        const percentage = (progress.submitted / progress.total) * 100;
        const pendingUsers = (analysisData as any).pendingUsers || [];

        return (
            <div className="relative h-full bg-[#F8F5F2] p-6 pb-32 overflow-y-auto">
                <button onClick={onBack} className="flex items-center gap-2 text-[#78716C] mb-6 font-medium hover:text-[#1B4332]">
                    <ArrowRight className="rotate-180" size={16} /> Volver
                </button>

                <div className="max-w-2xl mx-auto text-center py-16 animate-enter">
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Clock size={48} className="text-amber-600 animate-pulse" />
                    </div>

                    <h1 className="text-4xl serif-font text-[#1B4332] mb-4">
                        Esperando al Grupo...
                    </h1>

                    <p className="text-[#78716C] mb-2 max-w-md mx-auto">
                        {analysisData.message || 'El resto del grupo aún está marcando sus fechas disponibles.'}
                    </p>

                    {/* Pending Users List */}
                    {pendingUsers.length > 0 && (
                        <div className="mb-8">
                            <p className="text-sm font-bold text-[#1B4332] mb-3">Pendientes de confirmar:</p>
                            <div className="flex flex-wrap justify-center gap-2">
                                {pendingUsers.map((userName: string, i: number) => (
                                    <span key={i} className="px-4 py-2 bg-white border-2 border-amber-200 text-amber-700 rounded-full text-sm font-medium shadow-sm">
                                        {userName}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    <div className="bg-white rounded-2xl p-8 border border-[#E7E5E4] shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-[#1B4332]">Progreso del Grupo</span>
                            <span className="text-2xl serif-font text-[#1B4332]">{progress.submitted}/{progress.total}</span>
                        </div>

                        <div className="h-4 bg-[#F8F5F2] rounded-full overflow-hidden mb-2">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>

                        <p className="text-xs text-[#78716C]">
                            {progress.submitted > 0
                                ? `${progress.submitted} ${progress.submitted === 1 ? 'persona ha' : 'personas han'} confirmado`
                                : 'Nadie ha confirmado aún'}
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#78716C]">
                        <Loader2 size={16} className="animate-spin" />
                        <span>Actualizando cada 2 segundos...</span>
                    </div>
                </div>
            </div>
        );
    }

    // --- READY STATE (show options) ---
    const options = analysisData?.options;
    if (!options) return null;

    return (
        <div className="relative h-full bg-[#F8F5F2] p-6 pb-40 overflow-y-auto">
            {/* Header */}
            <div className="mb-8 text-center animate-enter">
                <button onClick={onBack} className="flex items-center gap-2 text-[#78716C] mb-4 font-medium hover:text-[#1B4332] mx-auto">
                    <ArrowRight className="rotate-180" size={16} /> Volver
                </button>

                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} className="text-green-600" />
                </div>

                <h1 className="text-4xl serif-font text-[#1B4332] mb-2">
                    ¡Habemus Fecha!
                </h1>
                <p className="text-[#78716C]">
                    Basado en el análisis del grupo, estas son las mejores opciones
                </p>
            </div>

            {/* Top 3 Options */}
            <div className="max-w-4xl mx-auto space-y-6 mb-8">
                {/* 🥇 Popular Option */}
                {options.popular && (
                    <div
                        onClick={() => setSelectedOption('popular')}
                        className={`bg-white rounded-[24px] p-8 border-2 transition-all cursor-pointer ${selectedOption === 'popular'
                            ? 'border-green-500 shadow-xl scale-[1.02]'
                            : 'border-[#E7E5E4] hover:border-green-300'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">🥇</div>
                                <div>
                                    <h2 className="text-2xl serif-font text-[#1B4332] mb-1">La Popular</h2>
                                    <p className="text-sm text-[#78716C]">Máximas coincidencias 'Ideales'</p>
                                </div>
                            </div>
                            {selectedOption === 'popular' && (
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <Check size={20} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="bg-[#F0FDF4] p-6 rounded-2xl mb-4">
                            <p className="text-4xl serif-font text-green-700 mb-2">
                                {formatDateRange(options.popular.startDate, options.popular.endDate)}
                            </p>
                            <p className="text-sm text-green-600">
                                {options.popular.userCount} {options.popular.userCount === 1 ? 'persona coincide' : 'personas coinciden'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {options.popular.users.map((user, i) => (
                                <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                    {user}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🥈 Economic Option */}
                {options.economic && (
                    <div
                        onClick={() => setSelectedOption('economic')}
                        className={`bg-white rounded-[24px] p-8 border-2 transition-all cursor-pointer ${selectedOption === 'economic'
                            ? 'border-amber-500 shadow-xl scale-[1.02]'
                            : 'border-[#E7E5E4] hover:border-amber-300'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">🥈</div>
                                <div>
                                    <h2 className="text-2xl serif-font text-[#1B4332] mb-1">La Flexible</h2>
                                    <p className="text-sm text-[#78716C]">Gran coincidencia con flexibilidad</p>
                                </div>
                            </div>
                            {selectedOption === 'economic' && (
                                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                                    <Check size={20} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="bg-[#FFF7ED] p-6 rounded-2xl mb-4">
                            <p className="text-4xl serif-font text-amber-700 mb-2">
                                {formatDateRange(options.economic.startDate, options.economic.endDate)}
                            </p>
                            <p className="text-sm text-amber-600">
                                {options.economic.userCount} {options.economic.userCount === 1 ? 'persona coincide' : 'personas coinciden'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {options.economic.users.map((user, i) => (
                                <span key={i} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                    {user}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* 🥉 Balance Option */}
                {options.balance && (
                    <div
                        onClick={() => setSelectedOption('balance')}
                        className={`bg-white rounded-[24px] p-8 border-2 transition-all cursor-pointer ${selectedOption === 'balance'
                            ? 'border-blue-500 shadow-xl scale-[1.02]'
                            : 'border-[#E7E5E4] hover:border-blue-300'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="text-5xl">🥉</div>
                                <div>
                                    <h2 className="text-2xl serif-font text-[#1B4332] mb-1">El Equilibrio</h2>
                                    <p className="text-sm text-[#78716C]">Mejor mezcla ideal + flexible</p>
                                </div>
                            </div>
                            {selectedOption === 'balance' && (
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <Check size={20} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div className="bg-[#EFF6FF] p-6 rounded-2xl mb-4">
                            <p className="text-4xl serif-font text-blue-700 mb-2">
                                {formatDateRange(options.balance.startDate, options.balance.endDate)}
                            </p>
                            <p className="text-sm text-blue-600">
                                {options.balance.userCount} {options.balance.userCount === 1 ? 'persona coincide' : 'personas coinciden'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {options.balance.users.map((user, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    {user}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Vote Button - ADMIN ONLY */}
            {isAdmin ? (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6 animate-enter">
                    <button
                        onClick={handleVote}
                        disabled={!selectedOption}
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 transition-all ${!selectedOption
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#1B4332] text-white hover:bg-[#2D6A4F] hover:scale-105'
                            }`}
                    >
                        <Trophy size={24} />
                        Confirmar esta Fecha
                    </button>
                </div>
            ) : (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6 animate-enter">
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 text-center shadow-xl">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Clock size={24} className="text-amber-600 animate-pulse" />
                        </div>
                        <p className="text-amber-900 font-bold mb-1">Esperando decisión del Organizador...</p>
                        <p className="text-amber-700 text-sm">Solo el admin puede confirmar la fecha final</p>
                    </div>
                </div>
            )}
        </div>
    );
};
