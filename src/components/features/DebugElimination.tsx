import { useState } from 'react';
import { EliminationScreen } from './EliminationScreen';
import { ArrowLeft } from 'lucide-react';

export const DebugElimination = () => {
    const [testCity, setTestCity] = useState('Paris');
    const [remaining, setRemaining] = useState(11);
    const [showElimination, setShowElimination] = useState(false);

    const cities = ['Paris', 'London', 'Berlin', 'Amsterdam', 'Barcelona', 'Rome', 'Prague', 'Vienna'];

    return (
        <div className="h-full bg-[#F8F5F2] p-6">
            {showElimination ? (
                <EliminationScreen
                    eliminatedCity={testCity}
                    remainingCities={remaining}
                    onContinue={() => {
                        setShowElimination(false);
                        setRemaining(remaining - 1);
                    }}
                />
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <ArrowLeft size={24} className="text-[#78716C]" />
                        <h1 className="text-4xl serif-font text-[#1B4332]">
                            🐷 Debug: Elimination Screen
                        </h1>
                    </div>

                    <div className="bg-white rounded-3xl p-8 shadow-lg mb-6">
                        <h2 className="text-2xl font-bold text-[#1B4332] mb-4">Test Controls</h2>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-[#78716C] mb-2">
                                    City to Eliminate
                                </label>
                                <select
                                    value={testCity}
                                    onChange={(e) => setTestCity(e.target.value)}
                                    className="w-full p-3 border-2 border-[#E7E5E4] rounded-xl focus:border-[#1B4332] outline-none"
                                >
                                    {cities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#78716C] mb-2">
                                    Remaining Cities
                                </label>
                                <input
                                    type="number"
                                    value={remaining}
                                    onChange={(e) => setRemaining(parseInt(e.target.value))}
                                    className="w-full p-3 border-2 border-[#E7E5E4] rounded-xl focus:border-[#1B4332] outline-none"
                                    min="1"
                                    max="20"
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => setShowElimination(true)}
                            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-xl py-4 rounded-2xl hover:from-orange-600 hover:to-red-700 transition-all shadow-xl"
                        >
                            🔥 Trigger Elimination
                        </button>
                    </div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
                        <h3 className="font-bold text-amber-900 mb-2">Testing Checklist:</h3>
                        <ul className="text-amber-800 space-y-2">
                            <li>✅ Viking pig loads (default fallback)</li>
                            <li>✅ Dramatic animation plays</li>
                            <li>✅ Phase messages change based on remaining count</li>
                            <li>✅ Button text adapts (MASACRE vs FINAL)</li>
                            <li>📝 To test city-specific pigs: add images to /public/assets/pigs/</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};
