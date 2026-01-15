import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Props {
    phase: 'purga' | 'knockout' | 'final';
    eliminatedCities: string[];
    onComplete: () => void;
}

export const EliminationScreen: React.FC<Props> = ({ phase, eliminatedCities, onComplete }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onComplete, 500);
        }, 4000); // 4 segundos de drama
        return () => clearTimeout(timer);
    }, [onComplete]);

    const getTitle = () => {
        switch (phase) {
            case 'purga': return '🔥 ¡LA PURGA HA COMENZADO!';
            case 'knockout': return '☠️ SOLO PUEDE QUEDAR UNO...';
            case 'final': return '🏆 HABEMUS GANADOR';
            default: return 'ELIMINACIÓN';
        }
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-900 text-white p-8">
            <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                className="text-4xl font-black mb-8 text-center text-yellow-400"
            >
                {getTitle()}
            </motion.h1>

            <div className="bg-black/50 p-6 rounded-xl mb-8 border border-red-500 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Han caído:</h2>
                <div className="text-3xl text-center font-mono text-red-300 font-bold">
                    {eliminatedCities.join(', ')}
                </div>
            </div>

            {/* AQUÍ SALDRÁ TU CERDO */}
            <div className="text-6xl animate-bounce mt-4">🐷</div>
        </div>
    );
};