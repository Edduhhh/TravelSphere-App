import { Plus, Compass, Calendar, Image as ImageIcon } from 'lucide-react';

interface ItineraryItem {
    id: number;
    time: string;
    event: string;
    status: string;
}

interface ItineraryProps {
    items: ItineraryItem[];
    onAiAction: (type: string, data?: string) => void;
}

export const Itinerary = ({ items, onAiAction }: ItineraryProps) => {
    return (
        <div className="p-6 space-y-6 animate-reveal pb-32 overflow-y-auto h-full no-scrollbar">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Agenda</h2>
            <div className="flex gap-3">
                <button onClick={() => onAiAction('postcard')} className="w-1/3 bg-fuchsia-50 text-fuchsia-600 p-5 rounded-[2rem] border border-fuchsia-100 flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <ImageIcon size={24} />
                    <span className="text-[9px] font-bold uppercase">Postal</span>
                </button>
                <button onClick={() => onAiAction('itinerary_fill')} className="flex-1 bg-slate-900 text-white p-5 rounded-[2rem] shadow-xl flex flex-col items-center gap-1 active:scale-95 transition-all">
                    <Plus size={24} />
                    <span className="text-[9px] font-bold uppercase">Planificar IA</span>
                </button>
            </div>
            <div className="space-y-4">
                {items.map(item => (
                    <div key={item.id} className="p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div className="flex gap-5 items-center">
                            <div className="bg-slate-50 w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-[11px] font-bold text-indigo-600 border border-slate-100">
                                {item.time.split(' ')[0]}<span className="text-[8px] text-slate-400">{item.time.split(' ')[1]}</span>
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">{item.event}</div>
                                <div className="text-[10px] font-bold text-indigo-400 uppercase mt-0.5">{item.status}</div>
                            </div>
                        </div>
                        <button onClick={() => onAiAction('guide_me', item.event)} className="text-slate-300 hover:text-indigo-600 p-2">
                            <Compass size={20} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
