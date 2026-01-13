import { DollarSign, Coffee } from 'lucide-react';

interface Expense {
    id: number;
    desc: string;
    total: number;
    payer: string;
    status: string;
}

interface ExpensesProps {
    expenses: Expense[];
    myDebt: number;
    participantsCount: number;
    onAddExpense: () => void;
    onAiAction: (type: string, data?: string) => void;
}

export const Expenses = ({ expenses, myDebt, participantsCount, onAddExpense, onAiAction }: ExpensesProps) => {
    return (
        <div className="p-6 space-y-6 animate-reveal pb-32 overflow-y-auto h-full no-scrollbar">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Finanzas</h2>
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mi Deuda Total</p>
                <h2 className="text-5xl font-black mb-8 tracking-tighter">${myDebt.toFixed(2)}</h2>
                <div className="flex gap-3 relative z-10">
                    <button onClick={onAddExpense} className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-bold text-xs uppercase active:scale-95 transition-all shadow-lg">+ Gasto</button>
                    <button onClick={() => onAiAction('menu_decode')} className="p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 active:scale-95 transition-all">
                        <Coffee size={20} />
                    </button>
                </div>
            </div>
            <div className="space-y-3">
                {expenses.map(exp => (
                    <div key={exp.id} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                        <div className="flex gap-4 items-center">
                            <div className={`p-3.5 rounded-2xl ${exp.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                                <DollarSign size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">{exp.desc}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Pagó: <span className="text-indigo-600">{exp.payer}</span></div>
                            </div>
                        </div>
                        <div className="text-right">
                            {exp.payer === 'Tú' ? (
                                <>
                                    <div className="font-black text-emerald-600 text-sm">+${(exp.total - (exp.total / participantsCount)).toFixed(2)}</div>
                                    <p className="text-[8px] font-bold text-slate-300">ME DEBEN</p>
                                </>
                            ) : (
                                <>
                                    <div className="font-black text-rose-500 text-sm">-${(exp.total / participantsCount).toFixed(2)}</div>
                                    <p className="text-[8px] font-bold text-slate-300 uppercase">DEBO</p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
