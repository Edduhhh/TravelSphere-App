import React, { useState, useEffect } from 'react';
import { Trophy, Skull, ArrowRight, Activity } from 'lucide-react';
import { calculateSurvivalResults, Vote } from '../../utils/votingAlgorithm';

// 1. AQUÍ ESTABA EL ERROR: Añadimos 'phase' a la definición para que Typescript no se queje
interface EliminationScreenProps {
    candidaturas: any[];
    onVote: (eliminatedIds: string[]) => void;
    phase: string; // <--- ESTO FALTABA
}

export const EliminationScreen: React.FC<EliminationScreenProps> = ({ candidaturas, onVote, phase }) => {
    const [step, setStep] = useState<'calculating' | 'eliminating' | 'result'>('calculating');
    const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
    const [survivors, setSurvivors] = useState<any[]>([]);

    useEffect(() => {
        // Simulamos un pequeño "pensamiento" de la IA para dar emoción
        const timer = setTimeout(() => {
            runCalculation();
        }, 1500);
        return () => clearTimeout(timer);
    }, [candidaturas]);

    const runCalculation = () => {
        // Preparamos los datos para el algoritmo
        // Como estamos en la pantalla de resultados, asumimos que el orden actual es el resultado de los votos
        const currentVote: Vote = {
            userId: 'system',
            rankedCityIds: candidaturas.map(c => c.id)
        };

        // Calculamos quién cae
        const resultIds = calculateSurvivalResults([currentVote], candidaturas.map(c => c.id));

        setEliminatedIds(resultIds);
        setSurvivors(candidaturas.filter(c => !resultIds.includes(c.id)));
        setStep('result');
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
                    La IA está analizando los votos y decidiendo quién abandona el viaje...
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
                    {eliminatedIds.length > 1 ? 'Ciudades Caídas' : 'Ciudad Eliminada'}
                </h2>
                <p className="text-red-500 font-medium mt-2">
                    Han sido expulsadas de la competición
                </p>
            </div>

            {/* LISTA DE ELIMINADOS */}
            <div className="space-y-4 mb-8">
                {candidaturas.filter(c => eliminatedIds.includes(c.id)).map((city) => (
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
                    onClick={() => onVote(eliminatedIds)}
                    className="w-full py-5 bg-[#1B4332] text-white rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 hover:bg-[#2D6A4F] active:scale-95 transition-all"
                >
                    CONTINUAR <ArrowRight />
                </button>
            </div>
        </div>
    );
};