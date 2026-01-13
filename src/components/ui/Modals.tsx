import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AiModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    isProcessing: boolean;
    content: string;
    image?: string | null;
}

export const AiModal = ({ isOpen, onClose, title, isProcessing, content, image }: AiModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-sm rounded-[2.8rem] p-10 shadow-2xl relative"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                                {isProcessing ? <Loader2 size={24} className="text-indigo-500 animate-spin" /> : <Sparkles size={24} className="text-indigo-500" />}
                                {title}
                            </h3>
                            {!isProcessing && <button onClick={onClose}><X size={24} className="text-slate-300" /></button>}
                        </div>
                        {isProcessing ? (
                            <div className="py-10 text-center">
                                <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">Consultando a Gemini...</p>
                            </div>
                        ) : (
                            <div className="max-h-[50vh] overflow-y-auto no-scrollbar">
                                <p className="text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-line mb-6">
                                    {content}
                                </p>
                                {image && <img src={image} alt="IA" className="rounded-3xl w-full shadow-lg border-4 border-slate-50" />}
                                <div className="mt-8 flex gap-3">
                                    <button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase tracking-widest">
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export const BaseModal = ({ isOpen, onClose, title, children }: BaseModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-sm rounded-[2.5rem] p-10 shadow-2xl"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-800">{title}</h3>
                            <button onClick={onClose}><X size={24} className="text-slate-300" /></button>
                        </div>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
