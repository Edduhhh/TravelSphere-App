import React, { useState, useEffect } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '../../services/supabase';
import { Save, GripVertical, Trophy, Info, AlertTriangle, Skull } from 'lucide-react';
// IMPORTANTE: Importamos TU lógica
import { calculateRoundRules } from '../../utils/votingAlgorithm';

// --- TARJETA VISUAL ---
function SortableCityItem(props: { city: any; index: number; isDanger: boolean; isWinner: boolean }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.city.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.05 : 1
    };

    let borderColor = 'border-gray-200';
    let bgColor = 'bg-white';

    if (props.index === 0) {
        borderColor = props.isWinner ? 'border-yellow-500' : 'border-[#1B4332]';
        bgColor = props.isWinner ? 'bg-yellow-50' : 'bg-[#F0FDF4]';
    } else if (props.isDanger) {
        borderColor = 'border-red-300';
        bgColor = 'bg-red-50';
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className={`
                p-4 mb-3 rounded-xl border-2 flex items-center justify-between cursor-grab active:cursor-grabbing select-none transition-all shadow-sm
                ${borderColor} ${bgColor}
            `}>
            <div className="flex items-center gap-4">
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${props.index === 0 ? 'bg-[#1B4332] text-white' : 'bg-white text-[#78716C] border'}
                `}>
                    {props.index === 0 ? <Trophy size={14} /> : props.index + 1}
                </div>
                <span className={`text-lg ${props.index === 0 ? 'font-bold' : 'font-medium'} text-[#1C1917]`}>
                    {props.city.ciudad}
                </span>
            </div>

            <div className="flex items-center gap-3">
                {props.isDanger && (
                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase px-2 py-1 bg-red-100 rounded">
                        <Skull size={14} /> Eliminar
                    </div>
                )}
                <GripVertical size={20} className="text-[#A8A29E]" />
            </div>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
interface VotingBoardProps {
    candidaturas: any[];
    user: any;
    onVoteSaved: () => void;
}

export const VotingBoard: React.FC<VotingBoardProps> = ({ candidaturas, user, onVoteSaved }) => {
    const [cities, setCities] = useState(candidaturas);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // USAMOS TU LÓGICA
    const rules = calculateRoundRules(cities.length);
    const isNegativeVoting = rules.votingType === 'NEGATIVE';

    useEffect(() => {
        setCities(candidaturas);
    }, [candidaturas]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (active.id !== over?.id) {
            setCities((items) => {
                const oldIndex = items.findIndex(c => c.id === active.id);
                const newIndex = items.findIndex(c => c.id === over?.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleDragStart = (event: DragEndEvent) => setActiveId(event.active.id as string);

    const handleSaveRanking = async () => {
        setSaving(true);
        try {
            // Guardamos la realidad (tu orden -> base de datos)
            const voteData = cities.map((city, index) => ({
                trip_id: user.viajeId,
                user_id: user.id,
                city_id: city.id,
                rank_position: index + 1,
                round_number: 1
            }));

            await supabase.from('votes').delete().match({ user_id: user.id, trip_id: user.viajeId });
            const { error } = await supabase.from('votes').insert(voteData);

            if (error) throw error;
            onVoteSaved();

        } catch (error) {
            console.error("Error:", error);
            alert("Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in duration-500">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E7E5E4] mb-4 mx-4 mt-4">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-black text-[#1B4332] uppercase tracking-wider flex items-center gap-2">
                        {rules.title}
                    </h2>
                    <div className="bg-[#1B4332] text-white text-xs font-bold px-2 py-1 rounded">
                        {cities.length} Destinos
                    </div>
                </div>
                <p className="text-sm text-[#78716C] mb-3 leading-relaxed">{rules.description}</p>
                <div className={`text-xs font-bold px-3 py-2 rounded-lg border-l-4 flex items-center gap-2 ${isNegativeVoting ? 'bg-red-50 border-red-500 text-red-700' : 'bg-yellow-50 border-yellow-500 text-yellow-800'}`}>
                    <Info size={16} />
                    {isNegativeVoting ? '⚠️ ATENCIÓN: Las ciudades ARRIBA reciben puntos negativos.' : '❤️ FINAL: Pon a tu favorita ARRIBA.'}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-32">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
                    <SortableContext items={cities.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                            {cities.map((city, index) => {
                                let isDanger = false;
                                if (isNegativeVoting) {
                                    isDanger = index < rules.countToEliminate;
                                }
                                return <SortableCityItem key={city.id} city={city} index={index} isDanger={isDanger} isWinner={!isNegativeVoting && index === 0} />;
                            })}
                        </div>
                    </SortableContext>
                    <DragOverlay>
                        {activeId ? (
                            <div className="bg-white p-4 rounded-xl border border-[#1B4332] shadow-2xl opacity-90 scale-105 font-bold text-[#1B4332]">
                                {cities.find(c => c.id === activeId)?.ciudad}
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </div>

            <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-center z-50">
                <button
                    onClick={handleSaveRanking}
                    disabled={saving}
                    className={`px-8 py-4 rounded-full font-bold text-white shadow-2xl flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 border-4 border-[#F8F5F2] ${saving ? 'bg-gray-400' : 'bg-[#1B4332] hover:bg-[#2D6A4F]'}`}
                >
                    {saving ? 'Guardando...' : <><Save size={20} /> CONFIRMAR VOTO</>}
                </button>
            </div>
        </div>
    );
};