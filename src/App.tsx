import { useState } from 'react';
// 👇 CAMBIO CLAVE: Ahora le decimos la ruta exacta donde lo tienes guardado
import { Dashboard } from './components/features/Dashboard';
import { Compass, Calendar, CreditCard, Map as MapIcon } from 'lucide-react';

export default function App() {
    const [currentCity, setCurrentCity] = useState("A Coruña");
    const [currentCountry, setCurrentCountry] = useState("España");
    const [activeTab, setActiveTab] = useState("explore");

    return (
        <div className="h-screen w-full bg-slate-50 relative overflow-hidden font-sans text-slate-900">

            {/* 1. EL CEREBRO (DASHBOARD) */}
            <div className="h-full w-full">
                <Dashboard
                    currentCity={currentCity}
                    currentCountry={currentCountry}
                    onCityClick={() => console.log("Click ciudad")}
                    onParticipantsClick={() => console.log("Click participantes")}
                    onAiAction={(type: any, prompt: any) => console.log(type, prompt)}
                />
            </div>

            {/* 2. LA BARRA FLOTANTE (MENÚ) */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                <div className="bg-white/90 backdrop-blur-md shadow-2xl shadow-slate-200 border border-white/50 rounded-full px-6 py-3 flex items-center gap-8 animate-slide-up-delay">

                    <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'explore' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Compass size={22} strokeWidth={activeTab === 'explore' ? 2.5 : 2} />
                    </button>

                    <button onClick={() => setActiveTab('plan')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'plan' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <Calendar size={22} strokeWidth={activeTab === 'plan' ? 2.5 : 2} />
                    </button>

                    <div className="-mt-8">
                        <button className="bg-indigo-900 text-white p-4 rounded-full shadow-lg shadow-indigo-300 hover:scale-105 active:scale-95 transition-all border-4 border-slate-50">
                            <span className="font-bold text-xl">+</span>
                        </button>
                    </div>

                    <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'wallet' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <CreditCard size={22} strokeWidth={activeTab === 'wallet' ? 2.5 : 2} />
                    </button>

                    <button onClick={() => setActiveTab('map')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'map' ? 'text-indigo-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
                        <MapIcon size={22} strokeWidth={activeTab === 'map' ? 2.5 : 2} />
                    </button>

                </div>
            </div>
        </div>
    );
}