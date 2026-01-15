import { useState, useRef } from 'react';
import { ArrowRight, Check, Calendar } from 'lucide-react';

// --- PROPS INTERFACE ---
interface GroupAvailabilityProps {
    selectedMonths: number[]; // Array of month indexes (0-11)
    tripDuration: number; // Number of days for the trip
    viajeId: number;
    usuarioId: number;
    onBack?: () => void;
    onComplete?: () => void;
}

type AvailabilityState = 'ideal' | 'flexible' | 'busy';

// --- COMPONENT ---
export const GroupAvailability = ({
    selectedMonths,
    tripDuration,
    viajeId,
    usuarioId,
    onBack,
    onComplete
}: GroupAvailabilityProps) => {
    // State management
    const [availability, setAvailability] = useState<Record<string, AvailabilityState>>({});
    const [paintMode, setPaintMode] = useState<AvailabilityState>('ideal');
    const [isPainting, setIsPainting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Track starting position for paint
    const paintStartRef = useRef<string | null>(null);

    // --- CALENDAR UTILITIES ---
    const YEAR = 2026; // Configurable year
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

    const getDaysInMonth = (year: number, month: number) => {
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        // Adjust so Monday = 0, Sunday = 6
        const emptyDays = firstDay === 0 ? 6 : firstDay - 1;
        return { days, emptyDays };
    };

    const formatDateKey = (year: number, month: number, day: number): string => {
        const monthStr = String(month + 1).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        return `${year}-${monthStr}-${dayStr}`;
    };

    // --- PAINT INTERACTION HANDLERS ---
    const handleMouseDown = (dateKey: string) => {
        setIsPainting(true);
        paintStartRef.current = dateKey;
        paintDate(dateKey);
    };

    const handleMouseEnter = (dateKey: string) => {
        if (isPainting) {
            paintDate(dateKey);
        }
    };

    const handleMouseUp = () => {
        setIsPainting(false);
        paintStartRef.current = null;
    };

    const handleTouchStart = (dateKey: string) => {
        setIsPainting(true);
        paintStartRef.current = dateKey;
        paintDate(dateKey);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isPainting) return;
        const touch = e.touches[0];
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const dateKey = element?.getAttribute('data-date');
        if (dateKey) {
            paintDate(dateKey);
        }
    };

    const handleTouchEnd = () => {
        setIsPainting(false);
        paintStartRef.current = null;
    };

    const paintDate = (dateKey: string) => {
        setAvailability(prev => {
            // If clicking the same state, remove it (toggle off)
            if (prev[dateKey] === paintMode) {
                const newState = { ...prev };
                delete newState[dateKey];
                return newState;
            }
            // Otherwise, apply the new paint mode
            return { ...prev, [dateKey]: paintMode };
        });
    };

    // --- COUNTERS ---
    const idealCount = Object.values(availability).filter(state => state === 'ideal').length;

    // --- SUBMIT HANDLER ---
    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('http://localhost:3005/api/availability/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    viajeId,
                    usuarioId,
                    availability
                })
            });
            const data = await res.json();
            if (data.success) {
                console.log('✅ Availability saved:', availability);
                onComplete?.();
            } else {
                alert('Error al guardar disponibilidad: ' + data.error);
            }
        } catch (error) {
            console.error('Error submitting availability:', error);
            alert('Error de conexión');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER CALENDAR FOR A SPECIFIC MONTH ---
    const renderMonth = (monthIndex: number) => {
        const { days, emptyDays } = getDaysInMonth(YEAR, monthIndex);

        return (
            <div key={monthIndex} className="bg-white rounded-[24px] p-6 shadow-lg border border-[#E7E5E4] animate-enter">
                {/* Month Header */}
                <div className="mb-6 text-center">
                    <h2 className="text-2xl serif-font text-[#1B4332]">{monthNames[monthIndex]} {YEAR}</h2>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-2 mb-3 text-center text-xs font-bold text-[#78716C] uppercase">
                    {dayLabels.map((label, i) => <div key={i}>{label}</div>)}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {/* Empty cells for alignment */}
                    {Array.from({ length: emptyDays }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: days }).map((_, i) => {
                        const day = i + 1;
                        const dateKey = formatDateKey(YEAR, monthIndex, day);
                        const state = availability[dateKey];

                        // Determine styling based on state
                        let bgColor = 'bg-[#F8F5F2]';
                        let textColor = 'text-[#1B4332]';
                        let extraClasses = '';

                        if (state === 'ideal') {
                            bgColor = 'bg-green-500';
                            textColor = 'text-white';
                            extraClasses = 'shadow-md';
                        } else if (state === 'flexible') {
                            bgColor = 'bg-amber-400';
                            textColor = 'text-white';
                            extraClasses = 'shadow-md';
                        } else if (state === 'busy') {
                            bgColor = 'bg-red-300';
                            textColor = 'text-white';
                            extraClasses = 'line-through opacity-60';
                        }

                        return (
                            <button
                                key={day}
                                data-date={dateKey}
                                onMouseDown={() => handleMouseDown(dateKey)}
                                onMouseEnter={() => handleMouseEnter(dateKey)}
                                onTouchStart={() => handleTouchStart(dateKey)}
                                className={`h-14 rounded-xl flex items-center justify-center transition-all select-none cursor-pointer hover:scale-105 ${bgColor} ${textColor} ${extraClasses}`}
                            >
                                <span className="text-sm font-bold">{day}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- MAIN RENDER ---
    return (
        <div
            className="relative h-full bg-[#F8F5F2] p-6 pb-40 overflow-y-auto"
            onMouseUp={handleMouseUp}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
        >
            {/* Header */}
            <div className="mb-8 animate-enter">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-[#78716C] mb-4 font-medium hover:text-[#1B4332]"
                >
                    <ArrowRight className="rotate-180" size={16} /> Volver
                </button>
                <h1 className="text-4xl serif-font text-[#1B4332] mb-2">
                    ¿Cuándo puedes viajar?
                </h1>
                <p className="text-[#78716C]">
                    Selecciona un color y pinta los días según tu disponibilidad
                </p>
            </div>

            {/* Counter */}
            <div className="bg-white rounded-2xl p-4 mb-6 border border-[#E7E5E4] shadow-sm flex items-center justify-center gap-2 animate-enter">
                <Calendar size={20} className="text-green-600" />
                <p className="text-[#1B4332] font-medium">
                    Días marcados como <span className="font-bold text-green-600">Ideales</span>:
                    <span className="ml-2 text-2xl serif-font">{idealCount}</span>
                </p>
            </div>

            {/* Calendars - Only selected months */}
            <div className="space-y-8 max-w-2xl mx-auto mb-8">
                {selectedMonths.sort((a, b) => a - b).map(monthIndex => renderMonth(monthIndex))}
            </div>

            {/* Bottom Toolbar - Paint Mode Selector */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-enter">
                <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-full px-8 py-4 flex items-center gap-6 border border-[#E7E5E4]">
                    {/* Ideal Button */}
                    <button
                        onClick={() => setPaintMode('ideal')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${paintMode === 'ideal'
                                ? 'bg-green-600 text-white scale-110 shadow-lg'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                    >
                        <div className="text-2xl">🟢</div>
                        <span className="text-xs font-bold uppercase tracking-wider">Ideal</span>
                    </button>

                    {/* Flexible Button */}
                    <button
                        onClick={() => setPaintMode('flexible')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${paintMode === 'flexible'
                                ? 'bg-amber-500 text-white scale-110 shadow-lg'
                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            }`}
                    >
                        <div className="text-2xl">🟡</div>
                        <span className="text-xs font-bold uppercase tracking-wider">Flexible</span>
                    </button>

                    {/* Busy Button */}
                    <button
                        onClick={() => setPaintMode('busy')}
                        className={`flex flex-col items-center gap-2 px-6 py-3 rounded-2xl transition-all ${paintMode === 'busy'
                                ? 'bg-red-400 text-white scale-110 shadow-lg'
                                : 'bg-red-100 text-red-600 hover:bg-red-200'
                            }`}
                    >
                        <div className="text-2xl">🔴</div>
                        <span className="text-xs font-bold uppercase tracking-wider">No puedo</span>
                    </button>
                </div>
            </div>

            {/* Confirm Button */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-6 animate-enter">
                <button
                    onClick={handleConfirm}
                    disabled={isSubmitting || Object.keys(availability).length === 0}
                    className={`w-full py-4 rounded-2xl font-bold text-lg shadow-2xl flex items-center justify-center gap-3 transition-all ${isSubmitting || Object.keys(availability).length === 0
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#1B4332] text-white hover:bg-[#2D6A4F] hover:scale-105'
                        }`}
                >
                    <Check size={24} />
                    {isSubmitting ? 'Guardando...' : 'Confirmar mi Disponibilidad'}
                </button>
            </div>
        </div>
    );
};
