import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Importamos tus componentes arreglados
import { calculateSurvivalResults, Vote } from '../../utils/votingAlgorithm';
import { EliminationScreen } from './EliminationScreen';

// --- DATOS MOCK PARA PROBAR (Ciudades) ---
interface City { id: string; name: string; emoji: string; }
const INITIAL_CITIES: City[] = [
    { id: '1', name: 'Roma', emoji: '🍕' },
    { id: '2', name: 'París', emoji: '🥐' },
    { id: '3', name: 'Londres', emoji: '💂' },
    { id: '4', name: 'Berlín', emoji: '🍺' },
    { id: '5', name: 'Praga', emoji: '🏰' },
    { id: '6', name: 'Ámsterdam', emoji: '🚲' },
    { id: '7', name: 'Barcelona', emoji: '🏖️' },
    { id: '8', name: 'Nueva York', emoji: '🗽' },
    { id: '9', name: 'Tokio', emoji: '🍣' },
    { id: '10', name: 'Sídney', emoji: '🦘' },
    { id: '11', name: 'Dubái', emoji: '🕌' },
    { id: '12', name: 'Río de Janeiro', emoji: '🎭' },
];

// --- COMPONENTE DE TARJETA SORTABLE ---
function SortableCityItem(props: { city: City; index: number; phase: string }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.city.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    // Colores según posición: El primero es PELIGRO (en eliminación) o VICTORIA (en final)
    let borderColor = 'border-gray-600';
    let bgColor = 'bg-gray-800';

    if (props.index === 0) {
        borderColor = props.phase === 'final' ? 'border-yellow-400' : 'border-red-600';
        bgColor = props.phase === 'final' ? 'bg-yellow-900/30' : 'bg-red-900/30';
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`p-4 mb-2 rounded-lg border-2 ${borderColor} ${bgColor} flex items-center justify-between cursor-grab active:cursor-grabbing shadow-lg select-none`}>
            <div className="flex items-center gap-4">
                <span className="text-2xl font-bold text-gray-400">#{props.index + 1}</span>
                <span className="text-3xl">{props.city.emoji}</span>
                <span className="text-xl font-bold text-white">{props.city.name}</span>
            </div>
            <div className="text-gray-500">☰</div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export const SurvivalSession: React.FC = () => {
    const [cities, setCities] = useState<City[]>(INITIAL_CITIES);
    const [phase, setPhase] = useState<'purga' | 'knockout' | 'final'>('purga');
    const [eliminatedIds, setEliminatedIds] = useState<string[]>([]);
    const [showElimination, setShowElimination] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setCities((items) => {
                const oldIndex = items.findIndex(c => c.id === active.id);
                const newIndex = items.findIndex(c => c.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleVote = () => {
        // 1. Creamos un "Voto" basado en el orden actual que has puesto
        const currentVote: Vote = {
            userId: 'currentUser',
            rankedCityIds: cities.map(c => c.id) // El orden visual es tu voto
        };

        // 2. Llamamos al algoritmo
        const eliminatedCityIds = calculateSurvivalResults([currentVote], cities.map(c => c.id), phase);

        // 3. Mostramos pantalla dramática
        setEliminatedIds(eliminatedCityIds);
        setShowElimination(true);
    };

    const onEliminationAnimationComplete = () => {
        setShowElimination(false);

        // Eliminamos físicamente las ciudades de la lista
        const survivors = cities.filter(c => !eliminatedIds.includes(c.id));
        setCities(survivors);

        // Lógica de cambio de fase
        const count = survivors.length;
        if (count <= 3) {
            setPhase('final');
        } else if (count <= 8) {
            // Si acabamos de bajar a 8 o menos, entramos en Knockout
            setPhase('knockout');
        }
    };

    // Renderizado Condicional de Títulos
    const getHeader = () => {
        if (phase === 'final') return { title: '🏆 GRAN FINAL', subtitle: 'Pon a tu FAVORITA arriba del todo', color: 'text-yellow-400' };
        if (phase === 'knockout') return { title: '🥊 RONDA KNOCKOUT', subtitle: 'Solo cae UNA. Pon a la que odies arriba.', color: 'text-orange-500' };
        return { title: '🔥 LA PURGA', subtitle: 'Caerán 3 de golpe. Pon las peores arriba.', color: 'text-red-500' };
    };

    const header = getHeader();

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 pb-24">
            {/* PANTALLA DE ELIMINACIÓN (Overlay) */}
            {showElimination && (
                <EliminationScreen
                    phase={phase}
                    eliminatedCities={cities.filter(c => eliminatedIds.includes(c.id)).map(c => c.name)}
                    onComplete={onEliminationAnimationComplete}
                />
            )}

            {/* CABECERA */}
            <div className="text-center mb-6 sticky top-0 bg-gray-900/90 z-10 py-4 backdrop-blur-sm border-b border-gray-700">
                <h1 className={`text-3xl font-black ${header.color} uppercase tracking-wider`}>{header.title}</h1>
                <p className="text-gray-400 text-sm mt-1">{header.subtitle}</p>
                <div className="mt-2 text-xs font-mono bg-gray-800 inline-block px-3 py-1 rounded-full">
                    Supervivientes: {cities.length}
                </div>
            </div>

            {/* LISTA DRAG & DROP */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={cities.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div className="max-w-md mx-auto space-y-2">
                        {cities.map((city, index) => (
                            <SortableCityItem key={city.id} city={city} index={index} phase={phase} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* BOTÓN DE ACCIÓN */}
            <div className="fixed bottom-6 left-0 right-0 p-4 flex justify-center bg-gradient-to-t from-gray-900 to-transparent">
                <button
                    onClick={handleVote}
                    className={`px-8 py-4 rounded-full font-black text-xl shadow-2xl transform transition active:scale-95 ${phase === 'final' ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-red-600 text-white hover:bg-red-500'
                        }`}
                >
                    {phase === 'final' ? '🏆 CONFIRMAR GANADORA' : '💀 EJECUTAR ELIMINACIÓN'}
                </button>
            </div>
        </div>
    );
};