import React, { useState, useEffect } from 'react';
import { Trophy, Skull, ArrowRight, Activity } from 'lucide-react';

interface EliminationScreenProps {
    candidaturas: any[];
    onVote: (eliminatedIds: string[]) => void;
    phase: string;
    viajeId: number;
}

export const EliminationScreen: React.FC<EliminationScreenProps> = ({ candidaturas, onVote, phase, viajeId }) => {
    const [step, setStep] = useState<'calculating' | 'result'>('calculating');
    const [eliminatedCities, setEliminatedCities] = useState<any[]>([]);
    const [survivors, setSurvivors] = useState<any[]>([]);

    useEffect(() => {
        fetchEliminationResults();
    }, [candidaturas, viajeId]);

    const fetchEliminationResults = async () => {
        try {
            console.log('🔥 Llamando al servidor para calcular eliminaciones...');

            const response = await fetch('http://localhost:3005/api/voting/calcular-eliminaciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ viajeId })
            });

            const data = await response.json();
            console.log('📥 Respuesta del servidor:', data);

            if (data.success) {
                if (data.phase === 'FINAL') {
                    console.log('🏆 FASE FINAL - Ganador:', data.winner);
                    // Handle winner case if needed
                } else {
                    // Get eliminated cities data
                    const eliminatedIds = data.eliminated.map((e: any) => e.id);

                    // Find full city data from candidaturas
                    const eliminatedFull = candidaturas.filter(c => eliminatedIds.includes(c.id));
                    const survivorsFull = candidaturas.filter(c => !eliminatedIds.includes(c.id));

                    console.log(`❌ Eliminadas: ${eliminatedFull.map(c => c.ciudad).join(', ')}`);
                    console.log(`✅ Sobreviven: ${survivorsFull.length} ciudades`);

                    setEliminatedCities(eliminatedFull);
                    setSurvivors(survivorsFull);
                }

                setStep('result');
            }
        } catch (error) {
            console.error('❌ Error al obtener eliminaciones:', error);
            setStep('result');
        }
    };

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
                    onClick={() => onVote(eliminatedCities.map(c => c.id))}
                    className="w-full py-5 bg-[#1B4332] text-white rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-[#2D6A4F] active:scale-95 transition-all"
                >
                    CONTINUAR <ArrowRight />
                </button>
            </div>
        </div>
    );
};