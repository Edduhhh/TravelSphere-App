import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';

interface ProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (city: string) => Promise<void>;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [city, setCity] = useState('');
    const [status, setStatus] = useState<'idle' | 'thinking' | 'success'>('idle');

    useEffect(() => {
        if (isOpen) {
            setCity('');
            setStatus('idle');
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!city.trim()) return;

        setStatus('thinking');

        onSubmit(city)
            .then(() => {
                setStatus('success');
                setTimeout(() => onClose(), 4500);
            })
            .catch((err) => {
                console.error(err);
                setStatus('idle');
                alert("Hubo un error. Inténtalo de nuevo.");
            });
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#1B4332]/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative border-4 border-[#1B4332]/10 transform transition-all scale-100 animate-in zoom-in-95 duration-200">

                {status === 'idle' && (
                    <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X size={20} />
                    </button>
                )}

                {status === 'idle' && (
                    <form onSubmit={handleSubmit}>
                        <h2 className="text-3xl font-serif text-[#1B4332] mb-8 text-center tracking-tight">Nueva Propuesta</h2>
                        <div className="space-y-3 mb-8">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">NOMBRE DEL DESTINO</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Roma" className="w-full bg-[#F9F8F6] border-2 border-transparent focus:border-[#1B4332]/20 rounded-xl px-4 py-4 text-xl text-[#1B4332] placeholder:text-gray-300 focus:outline-none focus:ring-0 transition-all" autoFocus />
                        </div>
                        <button type="submit" disabled={!city.trim()} className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            <Sparkles size={18} /> LANZAR PROPUESTA
                        </button>
                    </form>
                )}

                {status === 'thinking' && (
                    <div className="py-12 text-center animate-in fade-in zoom-in duration-300">
                        <div className="mb-6 relative">
                            <div className="w-20 h-20 bg-[#1B4332]/10 rounded-full mx-auto animate-ping absolute inset-0 left-1/2 -translate-x-1/2"></div>
                            <div className="w-20 h-20 bg-[#1B4332] rounded-full flex items-center justify-center mx-auto relative z-10"><Sparkles className="text-white animate-spin-slow" size={32} /></div>
                        </div>
                        <h3 className="text-xl font-serif text-[#1B4332] animate-pulse">Consultando al Oráculo...</h3>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-10 text-center animate-in slide-in-from-bottom-4 duration-300">
                        <div className="w-24 h-24 bg-[#E8F5E9] rounded-full flex items-center justify-center mx-auto mb-6"><Check className="text-[#1B4332] w-12 h-12" strokeWidth={3} /></div>
                        <h3 className="text-3xl font-serif text-[#1B4332] mb-2">¡Hecho!</h3>
                    </div>
                )}

            </div>
        </div>
    );
};