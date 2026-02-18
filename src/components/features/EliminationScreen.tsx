import React, { useState, useEffect } from 'react';
import { Trophy, Skull, ArrowRight, Activity } from 'lucide-react';

interface EliminationScreenProps {
    candidaturas: any[];
    onVote: (eliminatedIds: string[]) => void;
    phase: string;
    viajeId: number;
    esAdmin?: boolean;
    forcedResults?: { eliminatedIds: string[], survivorsCount: number, winner?: any } | null;
    onGuestDismiss?: () => void;
}

export const EliminationScreen: React.FC<EliminationScreenProps> = ({ candidaturas, onVote, phase, viajeId, esAdmin, forcedResults, onGuestDismiss }) => {
    const [step, setStep] = useState<'calculating' | 'result'>('calculating');
    const [eliminatedCities, setEliminatedCities] = useState<any[]>([]);
    const [survivors, setSurvivors] = useState<any[]>([]);
    const [winner, setWinner] = useState<any>(forcedResults?.winner || null); // Initialize winner from forcedResults if available

    // --- LÓGICA DIVIDIDA: ADMIN CALCULA, GUEST OBSERVA ---

    // Referencia para detectar cambios en guests
    const prevCandidaturasRef = React.useRef<any[]>(candidaturas);

    useEffect(() => {
        // 🔥 SI HAY RESULTADOS FORZADOS (Invitado Sync), USARLOS DIRECTAMENTE
        if (forcedResults) {
            console.log('⚡ SYNC: Usando resultados forzados en EliminationScreen', forcedResults);

            if (forcedResults.winner) {
                console.log('🏆 SYNC: Ganador recibido en forzado:', forcedResults.winner);
                setWinner(forcedResults.winner);
                return;
            }

            const elim = candidaturas.filter(c => forcedResults.eliminatedIds.includes(c.id.toString()) || forcedResults.eliminatedIds.includes(c.id));
            const surv = candidaturas.filter(c => !forcedResults.eliminatedIds.includes(c.id.toString()) && !forcedResults.eliminatedIds.includes(c.id));

            setEliminatedCities(elim);
            setSurvivors(surv);
            setStep('result');
            return;
        }

        if (viajeId) {
            if (esAdmin) { // FIXED: Use prop directly
                // ADMIN: Es el "Director de Orquesta". Ejecuta la eliminación.
                handleAdminCalculation();
            } else {
                // GUEST: Es el "Espectador". Espera a ver qué desaparece.
                console.log('👀 GUEST: Esperando resultados de eliminación...');
            }
        }
    }, [viajeId, esAdmin, forcedResults]); // Added forcedResults

    // GUEST WATCHER: Detectar eliminaciones mirando los props
    useEffect(() => {
        if (esAdmin || step === 'result') return; // Admin ya sabe, y si ya tenemos resultado, stop.

        const prev = prevCandidaturasRef.current;
        const current = candidaturas;

        // Si la longitud baja, alguien ha sido eliminado
        if (current.length < prev.length) {
            console.log('⚡ GUEST: Detectada eliminación por cambio de lista!');

            // Encontrar quién falta
            const currentIds = new Set(current.map(c => c.id));
            const eliminated = prev.filter(c => !currentIds.has(c.id));

            if (eliminated.length > 0) {
                console.log('💀 GUEST: Víctimas identificadas:', eliminated);
                setEliminatedCities(eliminated);
                setSurvivors(current);
                setStep('result');
            }
        }

        // Actualizar ref para siguiente render
        prevCandidaturasRef.current = current;
    }, [candidaturas, esAdmin, step]);


    const handleAdminCalculation = async () => {
        // Double check to prevent rogue calls
        if (!esAdmin) return;

        try {
            console.log('🔥 ADMIN: Llamando al servidor para calcular eliminaciones...');

            const response = await fetch('http://localhost:3005/api/voting/calcular-eliminaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viajeId })
            });

            const data = await response.json();
            console.log('📥 ADMIN: Respuesta del servidor:', data);

            if (data.success) {
                if (data.phase === 'FINAL') {
                    console.log('🏆 FASE FINAL - Ganador:', data.winner);
                    setWinner(data.winner);
                } else {
                    // Get eliminated cities
                    const eliminatedIds = data.eliminated.map((e: any) => e.id);
                    const eliminatedFull = candidaturas.filter(c => eliminatedIds.includes(c.id));
                    const survivorsFull = candidaturas.filter(c => !eliminatedIds.includes(c.id));

                    setEliminatedCities(eliminatedFull);
                    setSurvivors(survivorsFull);

                    // 🔥 ANUNCIAR RESULTADOS A TODOS (Sync Drama)
                    await fetch('http://localhost:3005/api/voting/anunciar-resultados', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            viajeId,
                            eliminatedIds: eliminatedIds.map((id: any) => String(id)),
                            survivorsCount: survivorsFull.length
                        })
                    });
                }
                setStep('result');
            }
        } catch (error) {
            console.error('❌ Error admin calculation:', error);
            // Fallback: mostrar resultado si falla
            setStep('result');
        }
    };

    if (winner) {
        return (
            <div className="flex flex-col h-full p-4 animate-in zoom-in duration-700 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#1B4332]">
                <div className="text-center mt-10 mb-8">
                    <Trophy size={64} className="text-[#FFD700] mx-auto mb-4 animate-bounce" />
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-md">
                        ¡HABEMUS DESTINUM!
                    </h1>
                    <p className="text-emerald-200 mt-2 font-medium text-lg">
                        La decisión ha sido tomada
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl mx-4 text-center shadow-2xl">
                    <h2 className="text-5xl font-black text-white mb-2 drop-shadow-lg transform scale-110">
                        {winner.ciudad}
                    </h2>
                    <p className="text-emerald-100 uppercase tracking-widest text-sm">
                        Destino Final
                    </p>
                </div>

                <div className="mt-auto pb-8">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-5 bg-[#FFD700] text-[#1B4332] rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-[#F0C000] active:scale-95 transition-all"
                    >
                        VER RESULTADOS <ArrowRight />
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'calculating') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-in fade-in">
                <div className="w-24 h-24 bg-[#1B4332] rounded-full flex items-center justify-center mb-6 animate-pulse shadow-xl">
                    <Activity size={48} className="text-white" />
                </div>
                <h2 className="text-2xl font-black text-[#1B4332] mb-2 uppercase tracking-widest">
                    Recalculando Supervivencia
                </h2>
                <p className="text-[#78716C] max-w-xs mx-auto">
                    El servidor está procesando los votos y decidiendo quién abandona el viaje...
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full p-4 animate-in slide-in-from-bottom-10 duration-700">
            {/* CABECERA DE RESULTADOS */}
            <div className="text-center mb-8 mt-4">
                <div className="inline-flex items-center justify-center p-3 bg-red-100 rounded-full mb-4 ring-4 ring-red-50">
                    <Skull size={32} className="text-red-600" />
                </div>
                <h2 className="text-3xl font-black text-[#1C1917] uppercase tracking-tighter">
                    {eliminatedCities.length > 1 ? 'Ciudades Caídas' : 'Ciudad Eliminada'}
                </h2>
                <p className="text-red-500 font-medium mt-2">
                    Han sido expulsadas de la competición
                </p>
            </div>

            {/* LISTA DE ELIMINADOS */}
            <div className="space-y-4 mb-8">
                {eliminatedCities.map((city) => (
                    <div key={city.id} className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-center justify-between shadow-sm transform hover:scale-105 transition-transform">
                        <span className="text-2xl font-black text-red-900 line-through decoration-4 decoration-red-500/50">
                            {city.ciudad}
                        </span>
                        <Skull className="text-red-300" />
                    </div>
                ))}
            </div>

            {/* BOTÓN CONTINUAR */}
            <div className="mt-auto pb-8">
                <div className="bg-[#F8F5F2] p-6 rounded-2xl border border-[#E7E5E4] text-center mb-6">
                    <p className="text-[#1B4332] font-bold text-lg mb-1">
                        {survivors.length} Ciudades Sobreviven
                    </p>
                    <p className="text-xs text-[#A8A29E] uppercase tracking-widest">
                        Próxima ronda inminente
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (esAdmin) {
                            onVote(eliminatedCities.map(c => c.id));
                        } else {
                            if (onGuestDismiss) onGuestDismiss();
                            else window.location.reload();
                        }
                    }}
                    className="w-full py-5 bg-[#1B4332] text-white rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-[#2D6A4F] active:scale-95 transition-all"
                >
                    CONTINUAR <ArrowRight />
                </button>
            </div>
        </div>
    );
};