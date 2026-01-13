import { useState, useEffect, useRef } from 'react';
import { Wallet, Search, X, Plus, User, LogIn, Target, MapPin, ArrowRight, Compass, Users, Vote, Heart, Plane, Clock, Sun, Calendar, ChevronLeft, ChevronRight, Check, Trophy, ListOrdered, Star, AlertTriangle, Gavel, DollarSign, Hotel, Thermometer, Info, GripVertical, Map, BarChart3, PieChart, PlaneLanding, PlaneTakeoff, Settings, Timer, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// DND-KIT IMPORTS
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, TouchSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// --- CONFIGURACIÓN LEAFLET ---
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop";

// --- SUB-COMPONENTES ---

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => { if (center) map.flyTo(center, 13); }, [center, map]);
    return null;
}

function SortableItem({ id, children }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 9999 : 'auto', position: 'relative' as 'relative', opacity: isDragging ? 0.8 : 1, scale: isDragging ? 1.05 : 1 };
    return (<div ref={setNodeRef} style={style} className="touch-none relative"> {children(attributes, listeners)} </div>);
}

const Modal = ({ isOpen, title, onClose, children }: any) => {
    if (!isOpen) return null;
    return (<div className="fixed inset-0 z-[5000] bg-[#1B4332]/60 backdrop-blur-sm flex items-center justify-center p-6 animate-enter"> <div className="bg-white w-full max-w-sm rounded-[24px] p-8 shadow-2xl relative border border-[#F8F5F2]"> <div className="flex justify-between items-center mb-6"> <h3 className="serif-font text-2xl text-[#1B4332] font-semibold">{title}</h3> <button onClick={onClose} className="p-2 bg-[#F8F5F2] rounded-full hover:bg-slate-200 transition-colors"><X size={20} className="text-[#1B4332]" /></button> </div> {children} </div> </div>);
};

const CustomAlert = ({ type, message, onConfirm, onCancel }: any) => {
    if (!message) return null;
    const isConfirm = type === 'confirm';
    return (
        <div className="fixed inset-0 z-[6000] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-enter">
            <div className="bg-white w-full max-w-xs rounded-[24px] p-6 shadow-2xl text-center border border-[#F8F5F2]">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isConfirm ? 'bg-[#FFF7ED] text-[#C2410C]' : 'bg-[#F0FDF4] text-[#15803d]'}`}>
                    {isConfirm ? <AlertTriangle size={32} /> : <Check size={32} />}
                </div>
                <h3 className="text-xl serif-font text-[#1B4332] mb-2">{isConfirm ? '¿Estás seguro?' : '¡Hecho!'}</h3>
                <p className="text-sm text-[#78716C] mb-6 leading-relaxed">{message}</p>
                <div className="flex gap-2">
                    {isConfirm && <button onClick={onCancel} className="flex-1 py-3 border border-[#E7E5E4] bg-white rounded-xl text-sm font-bold text-[#78716C] hover:bg-gray-50">Cancelar</button>}
                    <button onClick={onConfirm} className={`flex-1 py-3 rounded-xl text-sm font-bold text-white shadow-lg ${isConfirm ? 'bg-[#1B4332] hover:bg-[#2D6A4F]' : 'bg-[#1B4332] w-full'}`}>
                        {isConfirm ? 'Confirmar' : 'Entendido'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

export const Dashboard = ({ currentCity, onCityClick, onParticipantsClick }: any) => {
    // --- ESTADOS ---
    const [view, setView] = useState<'lobby' | 'dashboard' | 'voting_room' | 'calendar_room'>('lobby');
    const [user, setUser] = useState<any>(null);

    // Lobby
    const [lobbyMode, setLobbyMode] = useState<'start' | 'create_choice' | 'create_fixed' | 'create_voting' | 'join'>('start');
    const [lobbyForm, setLobbyForm] = useState({ nombre: '', destino: '', codigo: '' });
    const [lobbyError, setLobbyError] = useState('');

    // Sistema
    const [alertConfig, setAlertConfig] = useState<any>(null);
    const [isLoadingMap, setIsLoadingMap] = useState(false);

    // Votación
    const [candidaturas, setCandidaturas] = useState<any[]>([]);
    const [myRanking, setMyRanking] = useState<any[]>([]);
    const [hasVoted, setHasVoted] = useState(false);
    const [newProposal, setNewProposal] = useState('');
    const [winnerData, setWinnerData] = useState<any>(null);

    // Roles
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [usersList, setUsersList] = useState<any[]>([]);

    // Dossier
    const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
    const [dossierTab, setDossierTab] = useState<'general' | 'logistica' | 'alojamiento' | 'costes'>('general');

    // Drag & Drop
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    // Calendario
    const [heatmap, setHeatmap] = useState<any>({});
    const [totalUsers, setTotalUsers] = useState(1);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [fechasOficiales, setFechasOficiales] = useState<any>(null);
    const [selectionMode, setSelectionMode] = useState(false);
    const [tripDuration, setTripDuration] = useState(4);
    const [rangeStart, setRangeStart] = useState<string | null>(null);
    const [rangeEnd, setRangeEnd] = useState<string | null>(null);

    // Dashboard & Wallet
    const [searchQuery, setSearchQuery] = useState("Tapas");
    const [searchRadius, setSearchRadius] = useState(1500);
    const [cityCoords, setCityCoords] = useState<[number, number]>([43.36, -8.41]);
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isWalletOpen, setIsWalletOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'bote' | 'privado'>('bote');
    const [walletData, setWalletData] = useState<any>({ saldoBote: 0, usuarios: [] });
    const [misGastos, setMisGastos] = useState<any[]>([]);
    const [modalAction, setModalAction] = useState<any>(null);
    const [inputValue, setInputValue] = useState('');
    const [inputValue2, setInputValue2] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    // --- EFECTOS (Hooks) ---
    useEffect(() => {
        const savedUser = localStorage.getItem('travelSphereUser');
        if (savedUser) {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setView('dashboard');
            if (parsed.destino && !parsed.destino.startsWith("PENDIENTE")) {
                fetchCityCoords(parsed.destino);
            }
        }
    }, []);

    useEffect(() => {
        if (user) localStorage.setItem('travelSphereUser', JSON.stringify(user));
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const syncInterval = setInterval(() => {
            if (view === 'voting_room') refreshCandidates();
            if (view === 'calendar_room') refreshCalendar();
            if (view === 'dashboard' || isWalletOpen) refreshWallet();
            checkMyRoles();
        }, 2000);
        return () => clearInterval(syncInterval);
    }, [user, view, isWalletOpen]);

    // --- FUNCIONES AUXILIARES ---
    const showAlert = (msg: string) => setAlertConfig({ type: 'alert', msg, action: () => setAlertConfig(null) });
    const showConfirm = (msg: string, action: () => void) => setAlertConfig({ type: 'confirm', msg, action, onCancel: () => setAlertConfig(null) });

    const checkMyRoles = async () => {
        if (!user) return;
        try {
            const res = await fetch(`http://localhost:3001/api/roles/lista?viajeId=${user.viajeId}`);
            const data = await res.json();
            const me = data.usuarios.find((u: any) => u.id === user.id);
            if (me && (me.es_admin !== user.esAdmin || me.es_tesorero !== user.esTesorero)) {
                const updatedUser = { ...user, esAdmin: me.es_admin, esTesorero: me.es_tesorero };
                setUser(updatedUser);
                localStorage.setItem('travelSphereUser', JSON.stringify(updatedUser));
            }
        } catch (e) { console.error("Error sync roles"); }
    };

    const handleCreateTrip = async (isVoting: boolean) => {
        const destinoFinal = isVoting ? `PENDIENTE: ${lobbyForm.destino}` : lobbyForm.destino;
        if (!lobbyForm.nombre || !destinoFinal) return setLobbyError("Faltan datos.");
        try {
            const res = await fetch('http://localhost:3001/api/lobby/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombreAdmin: lobbyForm.nombre, destino: destinoFinal }) });
            const data = await res.json();
            if (data.success) {
                const newUser = { id: data.userId, nombre: lobbyForm.nombre, esAdmin: 1, esTesorero: 1, viajeId: data.viajeId, viajeCodigo: data.codigo, destino: destinoFinal };
                setUser(newUser);
                setView('dashboard');
                if (!isVoting) fetchCityCoords(lobbyForm.destino);
            }
        } catch (e) { setLobbyError("Error conexión"); }
    };

    const handleJoinTrip = async () => {
        if (!lobbyForm.nombre || !lobbyForm.codigo) return setLobbyError("Faltan datos.");
        try {
            const res = await fetch('http://localhost:3001/api/lobby/unirse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: lobbyForm.nombre, codigo: lobbyForm.codigo }) });
            const data = await res.json();
            if (data.success) {
                const newUser = { id: data.userId, nombre: lobbyForm.nombre, esAdmin: 0, esTesorero: 0, viajeId: data.viajeId, viajeCodigo: lobbyForm.codigo, destino: data.destino };
                setUser(newUser);
                if (data.fechas?.inicio) setFechasOficiales(data.fechas);
                setView('dashboard');
                if (!data.destino.startsWith("PENDIENTE")) fetchCityCoords(data.destino);
            } else { setLobbyError(data.error || "Código incorrecto"); }
        } catch (e) { setLobbyError("Error conexión"); }
    };

    const refreshCandidates = async () => {
        if (!user) return;
        const res = await fetch(`http://localhost:3001/api/voting/candidaturas?viajeId=${user.viajeId}&usuarioId=${user.id}`);
        const data = await res.json();

        if (JSON.stringify(data.candidaturas) !== JSON.stringify(candidaturas)) {
            setCandidaturas(data.candidaturas || []);
        }
        setHasVoted(data.yaVoto);

        if (!user.destino.startsWith("PENDIENTE") && !winnerData) {
            setWinnerData(user.destino);
        }

        if (!data.yaVoto && data.candidaturas.length > 0 && myRanking.length === 0) {
            setMyRanking(data.candidaturas);
        }
    };

    const handlePropose = async () => {
        if (!newProposal) return;
        await fetch('http://localhost:3001/api/voting/proponer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viajeId: user.viajeId, usuarioId: user.id, ciudad: newProposal }) });
        setNewProposal(''); setModalAction(null); refreshCandidates();
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setMyRanking((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const submitRanking = async () => {
        const rankingIds = myRanking.map(c => c.id);
        const res = await fetch('http://localhost:3001/api/voting/enviar-ranking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viajeId: user.viajeId, usuarioId: user.id, rankingIds }) });
        if (res.ok) { refreshCandidates(); showAlert("¡Voto registrado! Esperando resultados..."); }
    };

    const handleCloseVoting = async () => {
        if (candidaturas.length === 0) return showAlert("¡No hay candidaturas!");

        showConfirm("Esta acción cerrará la votación para siempre. ¿Proceder?", async () => {
            try {
                const res = await fetch('http://localhost:3001/api/voting/cerrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viajeId: user.viajeId }) });
                const data = await res.json();
                setAlertConfig(null);
                if (data.success) {
                    setWinnerData(data.nuevoDestino);
                    const newUser = { ...user, destino: data.nuevoDestino };
                    setUser(newUser);
                    localStorage.setItem('travelSphereUser', JSON.stringify(newUser));
                    fetchCityCoords(data.nuevoDestino);
                } else { showAlert("Error: " + data.error); }
            } catch (e) { showAlert("Error de conexión."); }
        });
    };

    const openRolesModal = async () => {
        if (!user?.esAdmin) return;
        const res = await fetch(`http://localhost:3001/api/roles/lista?viajeId=${user.viajeId}`);
        const data = await res.json();
        setUsersList(data.usuarios);
        setShowRolesModal(true);
    };

    const toggleRole = async (targetUserId: number, role: 'es_admin' | 'es_tesorero', currentValue: boolean) => {
        setUsersList(usersList.map(u => u.id === targetUserId ? { ...u, [role === 'es_admin' ? 'es_admin' : 'es_tesorero']: !currentValue ? 1 : 0 } : u));
        await fetch('http://localhost:3001/api/roles/actualizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuarioId: targetUserId, rol: role, valor: !currentValue }) });

        if (targetUserId === user.id) {
            const updatedUser = { ...user, [role === 'es_admin' ? 'esAdmin' : 'esTesorero']: !currentValue ? 1 : 0 };
            setUser(updatedUser);
            localStorage.setItem('travelSphereUser', JSON.stringify(updatedUser));
        }
    };

    const refreshCalendar = async () => { if (!user) return; const res = await fetch(`http://localhost:3001/api/calendar/heat?viajeId=${user.viajeId}`); const data = await res.json(); setHeatmap(data.mapaCalor || {}); setTotalUsers(data.totalUsuarios || 1); setFechasOficiales(data.fechasOficiales); };

    const handleDateClick = async (day: number) => {
        const year = currentMonth.getFullYear(); const month = String(currentMonth.getMonth() + 1).padStart(2, '0'); const dayStr = String(day).padStart(2, '0'); const fecha = `${year}-${month}-${dayStr}`;
        if (selectionMode) {
            setRangeStart(fecha);
            const startDate = new Date(year, currentMonth.getMonth(), day);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + (tripDuration - 1));
            const endYear = endDate.getFullYear(); const endMonth = String(endDate.getMonth() + 1).padStart(2, '0'); const endDay = String(endDate.getDate()).padStart(2, '0');
            setRangeEnd(`${endYear}-${endMonth}-${endDay}`);
        } else {
            await fetch('http://localhost:3001/api/calendar/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viajeId: user.viajeId, usuarioId: user.id, fecha }) });
            refreshCalendar();
        }
    };

    const confirmFechas = async () => { if (!rangeStart || !rangeEnd) return; showConfirm(`¿Fijar viaje del ${rangeStart} al ${rangeEnd}?`, async () => { await fetch('http://localhost:3001/api/calendar/fijar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ viajeId: user.viajeId, fechaInicio: rangeStart, fechaFin: rangeEnd }) }); setAlertConfig(null); refreshCalendar(); setSelectionMode(false); }); };

    const fetchCityCoords = async (city: string) => {
        if (!city) return;
        setIsLoadingMap(true);
        try { const res = await fetch(`http://localhost:3001/api/info-ciudad?city=${encodeURIComponent(city)}&country=`); const data = await res.json(); if (data.coords) setCityCoords([data.coords.lat, data.coords.lng]); } catch (e) { console.error("Error mapa"); } finally { setIsLoadingMap(false); }
    };

    const refreshWallet = async () => { if (!user) return; try { const resBote = await fetch(`http://localhost:3001/api/wallet/estado?viajeId=${user.viajeId}`); const dataBote = await resBote.json(); setWalletData(dataBote); const resGastos = await fetch(`http://localhost:3001/api/wallet/mis-gastos?usuarioId=${user.id}`); const dataGastos = await resGastos.json(); setMisGastos(dataGastos.gastos || []); const yo = dataBote.usuarios.find((u: any) => u.id === user.id); if (yo) setUser((prev: any) => ({ ...prev, esTesorero: yo.es_tesorero })); } catch (error) { console.error("Error wallet"); } };

    useEffect(() => { if ((view === 'dashboard' || view === 'calendar_room') && isWalletOpen) refreshWallet(); }, [isWalletOpen, view]);

    const ejecutarAccion = async () => { if (!inputValue) return; const monto = Number(inputValue); const headers = { 'Content-Type': 'application/json' }; if (modalAction.type === 'crearRonda') await fetch('http://localhost:3001/api/wallet/nueva-ronda', { method: 'POST', headers, body: JSON.stringify({ viajeId: user.viajeId, monto }) }); else if (modalAction.type === 'pagar') await fetch('http://localhost:3001/api/wallet/pagar', { method: 'POST', headers, body: JSON.stringify({ usuarioId: modalAction.data.id, cantidad: monto }) }); else if (modalAction.type === 'adelantar') await fetch('http://localhost:3001/api/wallet/adelantar', { method: 'POST', headers, body: JSON.stringify({ usuarioId: user.id, monto, concepto: inputValue2 || 'Varios' }) }); else if (modalAction.type === 'gastoPersonal') await fetch('http://localhost:3001/api/wallet/nuevo-gasto-personal', { method: 'POST', headers, body: JSON.stringify({ usuarioId: user.id, monto, concepto: inputValue2 || 'Capricho' }) }); else if (modalAction.type === 'cambiarTesorero') { await fetch('http://localhost:3001/api/wallet/cambiar-tesorero', { method: 'POST', headers, body: JSON.stringify({ viajeId: user.viajeId, nuevoTesoreroId: monto }) }); showAlert("Cargo cedido."); } setModalAction(null); setInputValue(''); setInputValue2(''); refreshWallet(); };

    const handleSearch = async () => { if (!searchQuery) return; setIsLoadingMap(true); setRecommendations([]); try { const res = await fetch(`http://localhost:3001/api/buscar-sitios?busqueda=${encodeURIComponent(searchQuery)}&lat=${cityCoords[0]}&lng=${cityCoords[1]}&radio=${searchRadius}`); const data = await res.json(); if (data.sitios?.length > 0) setRecommendations(data.sitios); else alert(`Sin resultados.`); } catch (error) { console.error(error); } finally { setIsLoadingMap(false); } };

    const getDaysInMonth = (date: Date) => { const year = date.getFullYear(); const month = date.getMonth(); const days = new Date(year, month + 1, 0).getDate(); const firstDay = new Date(year, month, 1).getDay(); const emptyDays = firstDay === 0 ? 6 : firstDay - 1; return { days, emptyDays }; };
    const { days, emptyDays } = getDaysInMonth(currentMonth);

    // --- RENDERIZADO DE VISTAS ---

    // 1. LOBBY
    if (view === 'lobby') {
        return (<div className="fixed inset-0 z-[5000] bg-[#F8F5F2] flex items-center justify-center p-6"><div className="w-full max-w-md bg-white p-12 rounded-[2rem] shadow-xl animate-enter relative overflow-hidden border border-[#E7E5E4]"><div className="absolute top-0 left-0 w-full h-2 bg-[#1B4332]"></div><div className="flex justify-center mb-6"><div className="bg-[#E8F5E9] p-4 rounded-full"><Compass size={40} className="text-[#1B4332]" strokeWidth={1.5} /></div></div><h1 className="text-3xl serif-font text-center text-[#1B4332] mb-2">{lobbyMode === 'start' ? 'TravelSphere' : lobbyMode === 'create_choice' ? 'Diseña tu Viaje' : lobbyMode === 'create_voting' ? 'Misión Democrática' : 'Comenzar Aventura'}</h1><p className="text-center text-[#78716C] mb-8 text-sm tracking-wide">{lobbyMode === 'start' ? 'El arte de viajar en compañía.' : lobbyMode === 'create_choice' ? '¿Tenéis claro el rumbo?' : lobbyMode === 'create_voting' ? 'El grupo decidirá el destino.' : 'Configura los detalles finales.'}</p>{lobbyMode === 'start' && (<div className="space-y-4"><button onClick={() => setLobbyMode('create_choice')} className="w-full py-5 btn-primary text-lg flex items-center justify-center gap-3 shadow-lg shadow-[#1B4332]/10"><Plus size={20} /> Crear Experiencia</button><button onClick={() => setLobbyMode('join')} className="w-full py-5 btn-secondary text-lg font-medium flex items-center justify-center gap-3"><LogIn size={20} /> Unirse al Grupo</button></div>)}{lobbyMode === 'create_choice' && (<div className="space-y-4 animate-enter"><button onClick={() => setLobbyMode('create_fixed')} className="w-full p-6 bg-[#F8F5F2] border border-[#E7E5E4] rounded-2xl hover:border-[#1B4332] hover:bg-[#E8F5E9] transition-all group text-left flex items-center gap-4"><div className="bg-white p-3 rounded-full text-[#1B4332] group-hover:scale-110 transition-transform"><MapPin size={24} /></div><div><h3 className="font-bold text-[#1B4332] text-lg">Destino Definido</h3><p className="text-xs text-[#78716C]">Ya sabemos a dónde vamos.</p></div></button><button onClick={() => setLobbyMode('create_voting')} className="w-full p-6 bg-[#F8F5F2] border border-[#E7E5E4] rounded-2xl hover:border-[#1B4332] hover:bg-[#E8F5E9] transition-all group text-left flex items-center gap-4"><div className="bg-white p-3 rounded-full text-[#1B4332] group-hover:scale-110 transition-transform"><Vote size={24} /></div><div><h3 className="font-bold text-[#1B4332] text-lg">Someter a Votación</h3><p className="text-xs text-[#78716C]">Decidiremos el destino juntos.</p></div></button><button onClick={() => setLobbyMode('start')} className="w-full py-3 text-sm text-[#78716C] hover:text-[#1B4332] flex items-center justify-center gap-2 mt-4"><ArrowRight className="rotate-180" size={16} /> Volver</button></div>)}{(lobbyMode === 'create_fixed' || lobbyMode === 'create_voting' || lobbyMode === 'join') && (<div className="space-y-6 animate-enter"><div><label className="text-[10px] font-bold text-[#78716C] uppercase ml-1 tracking-widest">{lobbyMode === 'create_fixed' ? 'Destino' : lobbyMode === 'join' ? 'Código de Acceso' : 'Nombre del Grupo'}</label><input type="text" autoFocus className="w-full bg-[#F8F5F2] p-4 rounded-xl text-xl text-[#1B4332] serif-font outline-none focus:ring-1 ring-[#1B4332] transition-all placeholder:text-[#D6D3D1]" placeholder={lobbyMode === 'create_fixed' ? "Ej: París" : lobbyMode === 'join' ? "ABCD" : "Ej: Verano 2026"} maxLength={lobbyMode === 'join' ? 4 : 50} value={lobbyMode === 'join' ? lobbyForm.codigo : lobbyForm.destino} onChange={e => lobbyMode === 'join' ? setLobbyForm({ ...lobbyForm, codigo: e.target.value.toUpperCase() }) : setLobbyForm({ ...lobbyForm, destino: e.target.value })} /></div><div><label className="text-[10px] font-bold text-[#78716C] uppercase ml-1 tracking-widest">Tu Nombre</label><input type="text" className="w-full bg-[#F8F5F2] p-4 rounded-xl text-xl text-[#1B4332] serif-font outline-none focus:ring-1 ring-[#1B4332] transition-all placeholder:text-[#D6D3D1]" placeholder="Ej: Ana" value={lobbyForm.nombre} onChange={e => setLobbyForm({ ...lobbyForm, nombre: e.target.value })} /></div>{lobbyError && <p className="text-[#9B2226] text-xs font-medium text-center bg-[#FEF2F2] py-2 rounded-lg">{lobbyError}</p>}<div className="flex gap-4 pt-4"><button onClick={() => { setLobbyMode('start'); setLobbyError('') }} className="p-4 rounded-full bg-[#F8F5F2] text-[#78716C] hover:bg-gray-200 transition-colors"><ArrowRight size={24} className="rotate-180" /></button><button onClick={() => lobbyMode === 'join' ? handleJoinTrip() : handleCreateTrip(lobbyMode === 'create_voting')} className="flex-1 py-4 btn-primary text-lg shadow-xl shadow-[#1B4332]/20">{lobbyMode === 'create_voting' ? 'Abrir Votación' : lobbyMode === 'create_fixed' ? 'Comenzar' : 'Entrar'}</button></div></div>)}</div></div>);
    }

    // 2. VOTING ROOM
    if (view === 'voting_room') {
        return (
            <div className="relative h-full bg-[#F8F5F2] p-6 pb-32 overflow-y-auto">
                {winnerData && (<div className="fixed inset-0 z-[6000] bg-[#1B4332] flex flex-col items-center justify-center p-6 animate-enter text-white"><div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mb-8 animate-bounce"><Trophy size={64} className="text-[#D08C60]" /></div><h2 className="text-xl font-bold uppercase tracking-widest text-[#A7D7C5] mb-2">¡Habemus Destinum!</h2><h1 className="text-6xl serif-font mb-4 text-center leading-tight">{winnerData}</h1><p className="text-white/60 mb-12 max-w-xs text-center">La democracia ha hablado. Preparad las maletas.</p><button onClick={() => { setWinnerData(null); setView('dashboard'); }} className="px-10 py-4 bg-white text-[#1B4332] rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-2xl">Ir al Mapa</button></div>)}

                <div className="flex justify-between items-center mb-8">
                    <div><button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-[#78716C] mb-2 font-medium hover:text-[#1B4332]"><ArrowRight className="rotate-180" size={16} /> Volver al Panel</button><h1 className="text-3xl serif-font text-[#1B4332]">Sistema de Votación</h1><p className="text-sm text-[#78716C]">Arrastra para ordenar tus preferencias (1º = más puntos).</p></div>
                    {!hasVoted && <button onClick={() => setModalAction({ type: 'proponer' })} className="bg-[#1B4332] text-white px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 transition-transform"><Plus size={16} /><span className="text-xs font-bold uppercase tracking-wider">Añadir</span></button>}
                </div>

                {hasVoted ? (
                    <div className="text-center p-12 bg-white rounded-3xl border border-[#E7E5E4] shadow-sm"><div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4 text-[#166534]"><Check size={40} /></div><h2 className="text-2xl serif-font text-[#1B4332]">¡Voto Registrado!</h2><p className="text-[#78716C] mt-2 mb-6 max-w-md mx-auto">Tus preferencias están guardadas. Por transparencia, los resultados globales permanecerán ocultos hasta que el Administrador cierre la votación.</p><div className="bg-[#F8F5F2] p-4 rounded-xl inline-block"><p className="text-xs font-bold text-[#1B4332] uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Estado: Esperando al grupo...</p></div></div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        <div className="bg-[#E8F5E9]/50 p-6 rounded-3xl border border-[#1B4332]/10 flex flex-col min-h-[300px]">
                            <div className="flex justify-between items-center mb-6"><h3 className="text-sm font-bold text-[#1B4332] uppercase tracking-widest flex items-center gap-2"><Trophy size={16} /> Tu Papeleta de Voto</h3><span className="text-xs bg-white text-[#1B4332] px-2 py-1 rounded border border-[#1B4332]/10">{myRanking.length} Destinos</span></div>
                            {myRanking.length === 0 && (<div className="text-center py-12 text-[#A8A29E] italic"><p>No hay destinos propuestos aún.</p><button onClick={() => setModalAction({ type: 'proponer' })} className="mt-4 text-[#1B4332] font-bold underline">Sé el primero en proponer</button></div>)}
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <SortableContext items={myRanking.map(c => c.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3 flex-1">{myRanking.map((c, index) => (<SortableItem key={c.id} id={c.id}>{(attributes: any, listeners: any) => (<div className="bg-white p-4 rounded-xl shadow-md border border-[#1B4332]/20 flex items-center gap-4 animate-enter group hover:shadow-lg transition-shadow"><div {...attributes} {...listeners} className="text-[#A8A29E] cursor-grab active:cursor-grabbing p-2 hover:bg-slate-100 rounded focus:outline-none"><GripVertical size={20} /></div><div className="bg-[#1B4332] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm z-10">{index + 1}</div><div className="flex-1 cursor-pointer select-none" onClick={() => { setSelectedCandidate(c); setDossierTab('general'); }}><p className="font-bold text-[#1B4332] text-lg">{c.ciudad}</p><div className="flex gap-3 text-xs text-[#78716C]"><span className="flex items-center gap-1"><Plane size={12} /> {c.datos?.logistica?.precio_total_vuelos || '---'}€</span><span className="flex items-center gap-1 border-b border-dashed border-[#78716C]"><Info size={12} /> Ver Informe</span></div></div></div>)}</SortableItem>))}</div></SortableContext></DndContext>
                            {myRanking.length > 0 && <button onClick={submitRanking} className="w-full py-4 mt-8 btn-primary shadow-xl text-lg font-bold tracking-wide">CONFIRMAR ESTE ORDEN</button>}
                        </div>
                    </div>
                )}

                {user?.esAdmin && (<div className="fixed bottom-6 right-6 z-[100] animate-bounce"><button onClick={handleCloseVoting} disabled={candidaturas.length === 0} className={`bg-[#1B4332] text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-all ${candidaturas.length === 0 ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:bg-[#2D6A4F]'}`}><Trophy size={20} /> FINALIZAR VIAJE</button></div>)}

                {/* SIDE PANEL DOSSIER */}
                {selectedCandidate && (
                    <div className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex justify-end animate-enter">
                        <div className="bg-white w-full max-w-lg h-full shadow-2xl overflow-y-auto flex flex-col">
                            {/* HERO IMAGE */}
                            <div className="h-64 relative bg-gray-900">
                                <img src={selectedCandidate.foto_url || FALLBACK_IMAGE} className="w-full h-full object-cover opacity-80" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                <div className="absolute bottom-6 left-6 text-white"><h2 className="text-5xl serif-font mb-2">{selectedCandidate.ciudad}</h2><div className="flex gap-2"><span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><User size={12} /> {selectedCandidate.propuesto_por}</span>{selectedCandidate.datos?.score_global && <span className="bg-[#4ADE80] text-[#064E3B] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Score: {selectedCandidate.datos.score_global}/100</span>}</div></div>
                                <button onClick={() => setSelectedCandidate(null)} className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all"><X /></button>
                            </div>

                            {/* TABS */}
                            <div className="flex border-b border-gray-100 px-6 pt-4 sticky top-0 bg-white z-10">
                                <button onClick={() => setDossierTab('general')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${dossierTab === 'general' ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Resumen</button>
                                <button onClick={() => setDossierTab('logistica')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${dossierTab === 'logistica' ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Logística</button>
                                <button onClick={() => setDossierTab('alojamiento')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${dossierTab === 'alojamiento' ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Alojamiento</button>
                                <button onClick={() => setDossierTab('costes')} className={`pb-4 px-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all ${dossierTab === 'costes' ? 'border-[#1B4332] text-[#1B4332]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Costes</button>
                            </div>

                            {/* CONTENT */}
                            <div className="p-8 flex-1 bg-[#FAFAFA]">
                                {dossierTab === 'general' && (
                                    <div className="space-y-8 animate-enter">
                                        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"><h4 className="text-xs font-bold text-[#1B4332] uppercase tracking-widest mb-3 flex items-center gap-2"><Star size={14} /> Análisis de IA</h4><p className="text-[#57534E] text-lg font-serif italic leading-relaxed">"{selectedCandidate.datos?.resumen_ia || 'Analizando viabilidad del destino...'}"</p></div>
                                        <div className="grid grid-cols-2 gap-4"><div className="bg-[#FFF7ED] p-5 rounded-2xl border border-[#FFEDD5]"><div className="flex items-center gap-2 text-[#9A3412] mb-1"><Sun size={18} /> <span className="font-bold text-xs uppercase">Clima</span></div><p className="text-xl font-bold text-[#7C2D12]">{selectedCandidate.datos?.salud_viaje?.temperatura || '--'}</p><p className="text-xs text-[#9A3412]/80">{selectedCandidate.datos?.salud_viaje?.clima || 'Sin datos'}</p></div><div className="bg-[#F0FDF4] p-5 rounded-2xl border border-[#DCFCE7]"><div className="flex items-center gap-2 text-[#166534] mb-1"><Users size={18} /> <span className="font-bold text-xs uppercase">Saturación</span></div><p className="text-xl font-bold text-[#14532D]">{selectedCandidate.datos?.salud_viaje?.saturacion || 'Media'}</p><p className="text-xs text-[#166534]/80">Nivel turístico</p></div></div>
                                    </div>
                                )}
                                {dossierTab === 'logistica' && (
                                    <div className="space-y-6 animate-enter">
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-6"><h3 className="text-[#1B4332] font-bold text-lg flex items-center gap-2"><PlaneTakeoff /> Ida (Origen ➝ Destino)</h3></div><div className="bg-[#F0FDF4] p-4 rounded-xl mb-4 border border-[#DCFCE7]"><p className="text-xs text-[#166534] uppercase font-bold mb-1">Tiempo Total (Puerta a Puerta)</p><p className="text-3xl font-serif text-[#14532D]">{selectedCandidate.datos?.logistica?.ida?.tiempo_total}</p><p className="text-xs text-[#166534]/70 mt-1">{selectedCandidate.datos?.logistica?.ida?.detalle_tiempos}</p></div></div>
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-6"><h3 className="text-[#1B4332] font-bold text-lg flex items-center gap-2"><PlaneLanding /> Vuelta (Destino ➝ Origen)</h3></div><div className="bg-[#FEF2F2] p-4 rounded-xl mb-4 border border-[#FECACA]"><p className="text-xs text-[#991B1B] uppercase font-bold mb-1">Tiempo Total (Puerta a Puerta)</p><p className="text-3xl font-serif text-[#7F1D1D]">{selectedCandidate.datos?.logistica?.vuelta?.tiempo_total}</p><p className="text-xs text-[#991B1B]/70 mt-1">{selectedCandidate.datos?.logistica?.vuelta?.detalle_tiempos}</p></div></div>
                                    </div>
                                )}
                                {dossierTab === 'alojamiento' && (
                                    <div className="space-y-4 animate-enter"><div className="bg-[#1B4332] text-white p-6 rounded-2xl mb-6"><p className="text-xs text-[#A7D7C5] uppercase font-bold mb-1">Precio Medio / Noche</p><p className="text-4xl serif-font">{selectedCandidate.datos?.alojamiento?.precio_medio_global || '85'}€</p><p className="text-[10px] opacity-60">Media de la ciudad</p></div><h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Mejores Zonas</h4>{selectedCandidate.datos?.alojamiento?.zonas_recomendadas?.map((zona: any, i: number) => (<div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><div className="flex justify-between items-center mb-1"><p className="font-bold text-[#1B4332]">{zona.nombre}</p><div className="bg-gray-100 px-3 py-1 rounded text-xs font-bold text-gray-600">{zona.precio}</div></div><p className="text-xs text-gray-500 leading-snug">{zona.descripcion}</p></div>)) || <p className="text-sm text-gray-400 italic p-4">Datos de zonas no disponibles.</p>}</div>
                                )}
                                {dossierTab === 'costes' && (
                                    <div className="space-y-6 animate-enter"><div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center"><div className="w-16 h-16 bg-[#F0FDF4] rounded-full flex items-center justify-center mx-auto mb-4 text-[#166534]"><DollarSign size={32} /></div><p className="text-xs text-gray-400 uppercase font-bold mb-2">Presupuesto Diario Sugerido</p><p className="text-5xl font-bold text-[#1B4332]">{selectedCandidate.datos?.presupuesto_diario_estimado || '60'}€</p><p className="text-xs text-gray-400 mt-2">Por persona (Comida + Ocio)</p></div></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <Modal isOpen={modalAction?.type === 'proponer'} title="Nueva Propuesta" onClose={() => setModalAction(null)}><div className="space-y-4"><div><label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Ciudad</label><input type="text" autoFocus className="w-full bg-[#F8F5F2] p-4 rounded-xl text-xl text-[#1B4332] serif-font outline-none focus:ring-1 ring-[#1B4332]" placeholder="Ej: Kioto" value={newProposal} onChange={e => setNewProposal(e.target.value)} /></div><button onClick={handlePropose} className="w-full py-4 btn-primary text-sm uppercase tracking-widest mt-2">Lanzar Propuesta</button></div></Modal>
            </div>
        );
    }

    // 3. CALENDAR ROOM
    if (view === 'calendar_room') {
        const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

        if (fechasOficiales) return (<div className="relative h-full bg-[#1B4332] flex flex-col items-center justify-center text-white p-8"><button onClick={() => setView('dashboard')} className="absolute top-8 left-8 p-2 bg-white/10 rounded-full hover:bg-white/20"><ChevronLeft /></button><div className="mb-8 animate-bounce"><Calendar size={64} className="text-[#D08C60]" /></div><h2 className="text-xl font-bold uppercase tracking-[0.2em] text-[#A7D7C5] mb-2">Fechas Oficiales</h2><h1 className="text-5xl font-serif mb-6 text-center">{fechasOficiales.inicio} <br /><span className="text-2xl text-white/50">al</span><br /> {fechasOficiales.fin}</h1><p className="text-center text-white/70 max-w-xs">El viaje está bloqueado. Ya podéis proceder a la compra de vuelos.</p></div>);

        return (
            <div className="relative h-full bg-[#F8F5F2] p-6 pb-32 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div><button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-[#78716C] mb-2 font-medium hover:text-[#1B4332]"><ArrowRight className="rotate-180" size={16} /> Volver al Panel</button><h1 className="text-3xl serif-font text-[#1B4332]">Disponibilidad</h1><p className="text-sm text-[#78716C]">{selectionMode ? 'Modo Admin: Elige la fecha de INICIO del viaje.' : 'Marca los días que puedes viajar.'}</p></div>
                    {user?.esAdmin && !selectionMode && (<button onClick={() => setSelectionMode(true)} className="bg-[#D08C60] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg">Definir Fechas</button>)}
                </div>

                {selectionMode && (
                    <div className="bg-[#FFF7ED] p-4 rounded-xl mb-6 border border-[#FFEDD5] flex items-center justify-between">
                        <div><p className="text-xs font-bold text-[#9A3412] uppercase">Duración del Viaje</p><p className="text-xs text-[#C2410C]">Se seleccionarán {tripDuration} días automáticamente.</p></div>
                        <div className="flex items-center gap-2"><button onClick={() => setTripDuration(Math.max(1, tripDuration - 1))} className="w-8 h-8 bg-white rounded-lg border border-[#E7E5E4] flex items-center justify-center">-</button><span className="font-bold text-lg w-8 text-center">{tripDuration}</span><button onClick={() => setTripDuration(tripDuration + 1)} className="w-8 h-8 bg-white rounded-lg border border-[#E7E5E4] flex items-center justify-center">+</button></div>
                    </div>
                )}

                <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-[#E7E5E4] mb-6"><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="text-[#1B4332]" /></button><h2 className="text-xl serif-font text-[#1B4332] capitalize">{monthName}</h2><button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight className="text-[#1B4332]" /></button></div>
                <div className={`bg-white rounded-[24px] p-6 shadow-xl border ${selectionMode ? 'border-[#D08C60] border-2' : 'border-[#E7E5E4]'}`}>
                    <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-[#78716C] uppercase"><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div></div>
                    <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: emptyDays }).map((_, i) => <div key={`empty-${i}`} />)}
                        {Array.from({ length: days }).map((_, i) => {
                            const day = i + 1;
                            const year = currentMonth.getFullYear();
                            const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
                            const dayStr = String(day).padStart(2, '0');
                            const fecha = `${year}-${month}-${dayStr}`;

                            const data = heatmap[fecha] || { count: 0, users: [] };
                            const intensity = data.count / totalUsers;

                            let bg = selectionMode ? '#F8F5F2' : (data.count > 0 ? `rgba(27, 67, 50, ${intensity * 0.8 + 0.1})` : '#F8F5F2');
                            let color = selectionMode ? '#1C1917' : (intensity > 0.7 ? 'white' : '#1B4332');

                            const isRangeStart = fecha === rangeStart;
                            const isRangeEnd = fecha === rangeEnd;
                            const isInRange = rangeStart && rangeEnd && fecha > rangeStart && fecha < rangeEnd;

                            if (selectionMode) {
                                if (isRangeStart || isRangeEnd) { bg = '#D08C60'; color = 'white'; }
                                else if (isInRange) { bg = '#FFEDD5'; }
                            }

                            return (<button key={day} onClick={() => handleDateClick(day)} className={`h-14 rounded-xl flex flex-col items-center justify-center transition-all relative border ${selectionMode && (isRangeStart || isRangeEnd) ? 'scale-110 shadow-lg z-10' : 'border-transparent'}`} style={{ backgroundColor: bg, color: color }}> <span className="text-sm font-bold">{day}</span> {!selectionMode && data.count === totalUsers && totalUsers > 1 && (<div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm"><Check size={10} strokeWidth={4} /></div>)} </button>);
                        })}
                    </div>
                </div>
                {selectionMode && rangeStart && rangeEnd && (<div className="fixed bottom-6 inset-x-6 z-[100] animate-enter"><button onClick={confirmFechas} className="w-full bg-[#D08C60] text-white py-4 rounded-xl font-bold text-lg shadow-2xl flex items-center justify-center gap-2"><Check size={24} /> CONFIRMAR FECHAS</button></div>)}
                {!selectionMode && (<div className="mt-6 bg-[#E8F5E9] p-4 rounded-xl border border-[#1B4332]/10 text-sm text-[#1B4332] flex gap-3"><Users size={20} /><p>Total: <strong>{totalUsers}</strong> personas.<br />Verde oscuro = Coincidencia total.</p></div>)}
            </div>
        );
    }

    // 4. MAIN DASHBOARD (MAPA + WALLET)
    return (
        <div className="relative h-full bg-[#F8F5F2]">
            <div className={`p-6 space-y-6 pb-32 overflow-y-auto h-full no-scrollbar transition-all duration-500 ${isWalletOpen ? 'opacity-50 blur-[2px]' : ''}`}>

                {/* HEADER */}
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-3 cursor-pointer group" onClick={onCityClick}>
                        <div className="w-10 h-10 rounded-full bg-white border border-[#E7E5E4] flex items-center justify-center shadow-sm"><MapPin size={20} className="text-[#1B4332]" /></div>
                        <div><h1 className="text-2xl serif-font text-[#1C1917]">{user?.destino?.replace('PENDIENTE: ', '') || currentCity}</h1><p className="text-[10px] font-bold text-[#78716C] tracking-widest uppercase mt-0.5">Código: <span className="text-[#D08C60]">{user?.viajeCodigo}</span></p></div>
                    </div>
                    <div className="flex gap-2">
                        {user?.esAdmin ? (<button onClick={openRolesModal} className="w-10 h-10 bg-[#1B4332] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#2D6A4F] transition-colors"><Settings size={18} /></button>) : null}
                        <div onClick={onParticipantsClick} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-[#E7E5E4] cursor-pointer"><div className="w-6 h-6 rounded-full bg-[#1B4332] text-white flex items-center justify-center text-xs font-serif">{user?.nombre.charAt(0)}</div><span className="text-xs font-medium text-[#78716C]">{user?.esAdmin ? 'Admin' : 'Guest'}</span></div>
                    </div>
                </div>

                {/* CONTENIDO CONDICIONAL: ¿PENDIENTE O MAPA? */}
                {user?.destino?.startsWith("PENDIENTE") ? (
                    <div className="grid grid-cols-2 gap-4">
                        <div onClick={() => setView('voting_room')} className="bg-white p-6 rounded-[24px] border border-[#E7E5E4] shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-[#1B4332] hover:bg-[#F0FDF4] transition-all group"><div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B4332] group-hover:scale-110 transition-transform"><Vote size={24} /></div><h3 className="serif-font text-lg text-[#1B4332]">Votar Destino</h3></div>
                        <div onClick={() => setView('calendar_room')} className="bg-white p-6 rounded-[24px] border border-[#E7E5E4] shadow-sm flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:border-[#1B4332] hover:bg-[#F0FDF4] transition-all group"><div className="w-12 h-12 bg-[#E8F5E9] rounded-full flex items-center justify-center text-[#1B4332] group-hover:scale-110 transition-transform"><Calendar size={24} /></div><h3 className="serif-font text-lg text-[#1B4332]">Fechas</h3></div>
                    </div>
                ) : (
                    <>
                        <div onClick={() => setIsWalletOpen(true)} className="relative overflow-hidden bg-[#1B4332] rounded-[24px] p-8 text-white shadow-xl cursor-pointer transition-transform active:scale-[0.98]"><div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3"><Compass size={180} /></div><div className="relative z-10"><div className="flex justify-between items-start mb-6"><p className="text-[#A7D7C5] text-[10px] font-bold uppercase tracking-[0.2em]">Fondos del Grupo</p><div className="bg-white/10 p-2 rounded-full"><Wallet size={20} /></div></div><p className="text-5xl serif-font tracking-tight mb-2">{Number(walletData.saldoBote).toFixed(2)}€</p><div className="flex items-center gap-2 text-xs text-[#A7D7C5]"><span className="w-1.5 h-1.5 bg-[#4ADE80] rounded-full"></span> <span>Balance activo</span></div></div></div>
                        <div className="card-premium p-3 h-[450px] relative flex flex-col"><div className="absolute top-6 left-6 right-6 z-[1000]"><div className="bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-1 flex items-center border border-[#E7E5E4]"><div className="p-3 text-[#78716C]"><Search size={18} /></div><input type="text" placeholder="Descubrir lugares..." className="flex-1 bg-transparent outline-none text-[#1C1917] placeholder:text-[#A8A29E] text-sm font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} /></div></div><div className="flex-1 rounded-xl overflow-hidden relative z-0"><MapContainer center={cityCoords} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='© CartoDB' /><Marker position={cityCoords}><Popup><b>📍 Centro</b></Popup></Marker>{recommendations.map((site: any) => (<Marker key={site.id} position={[site.coords.lat, site.coords.lng]} icon={redIcon}><Popup>{site.nombre}</Popup></Marker>))}<MapUpdater center={cityCoords} /></MapContainer></div><div className="absolute bottom-6 left-6 right-6 z-[1000]"><div className="bg-white/90 backdrop-blur-md shadow-lg rounded-xl p-4 border border-[#E7E5E4]"><div className="flex justify-between items-center text-[10px] font-bold text-[#78716C] uppercase tracking-widest mb-2"><span className="flex items-center gap-2"><Target size={12} /> Exploración</span><span className="text-[#1B4332]">{searchRadius >= 1000 ? `${searchRadius / 1000} km` : `${searchRadius} m`}</span></div><input type="range" min="500" max="5000" step="100" value={searchRadius} onChange={(e) => setSearchRadius(Number(e.target.value))} className="w-full accent-[#1B4332] h-1 bg-[#E7E5E4] rounded-lg appearance-none cursor-pointer" /></div></div></div>
                    </>
                )}
            </div>

            {/* PANEL WALLET INFERIOR */}
            <div className={`fixed inset-x-0 bottom-0 z-[2000] bg-[#FFFFFF] rounded-t-[2.5rem] shadow-[0_-10px_60px_rgba(27,67,50,0.15)] transition-transform duration-500 h-[92%] ${isWalletOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-8 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-8"><div><h2 className="text-3xl serif-font text-[#1B4332]">Finanzas</h2><p className="text-xs text-[#78716C] mt-1">Gestión transparente</p></div><button onClick={() => setIsWalletOpen(false)} className="p-3 bg-[#F8F5F2] rounded-full hover:bg-gray-200"><X size={24} className="text-[#1B4332]" /></button></div>
                    <div className="flex p-1.5 bg-[#F8F5F2] rounded-xl mb-8"><button onClick={() => setActiveTab('bote')} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'bote' ? 'bg-white text-[#1B4332] shadow-sm' : 'text-[#A8A29E]'}`}>Grupo</button><button onClick={() => setActiveTab('privado')} className={`flex-1 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'privado' ? 'bg-white text-[#1B4332] shadow-sm' : 'text-[#A8A29E]'}`}>Mis Gastos</button></div>
                    {activeTab === 'bote' ? (
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                            {user?.esTesorero && (
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button onClick={() => setModalAction({ type: 'crearRonda' })} className="py-4 btn-primary rounded-xl font-medium text-sm flex flex-col items-center gap-2"><Plus size={20} /> Solicitar</button>
                                    <button onClick={() => setModalAction({ type: 'cambiarTesorero' })} className="py-4 btn-secondary rounded-xl font-medium text-sm flex flex-col items-center gap-2"><User size={20} /> Ceder Cargo</button>
                                </div>
                            )}
                            {walletData.usuarios.map((u: any) => (
                                <div key={u.id} className="flex items-center justify-between py-4 border-b border-[#F8F5F2]">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center serif-font text-lg ${u.es_tesorero ? 'bg-[#1B4332] text-white' : 'bg-[#F8F5F2] text-[#78716C]'}`}>{u.nombre.charAt(0)}</div>
                                        <div><p className="font-bold text-[#1C1917] text-lg">{u.nombre}</p><p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">{u.es_tesorero ? 'Admin' : 'Viajero'}</p></div>
                                    </div>
                                    <div className="text-right">
                                        {u.credito > 0 ? <span className="text-[#40916C] font-bold text-lg">+{u.balance.toFixed(2)}€</span> : u.debe ? <span className="text-[#9B2226] font-bold text-lg">{u.balance.toFixed(2)}€</span> : <span className="text-gray-300 font-bold text-lg">0.00€</span>}
                                        {user?.esTesorero && u.debe && <button onClick={() => setModalAction({ type: 'pagar', data: u })} className="block mt-1 text-[10px] font-bold text-[#1B4332] underline ml-auto">COBRAR</button>}
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setModalAction({ type: 'adelantar' })} className="w-full mt-4 py-3 text-[#D08C60] text-xs font-bold uppercase tracking-widest hover:text-[#b0734c]">Registrar Pago Urgente</button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                            <button onClick={() => setModalAction({ type: 'gastoPersonal' })} className="w-full py-4 border border-dashed border-[#D6D3D1] rounded-xl text-[#78716C] hover:border-[#1B4332] hover:text-[#1B4332] font-medium text-sm transition-all flex items-center justify-center gap-2 mb-4"><Plus size={18} /> Nuevo Ticket Personal</button>
                            {misGastos.map((g: any) => (<div key={g.id} className="flex justify-between items-center py-4 border-b border-[#F8F5F2]"><span className="font-medium text-[#57534E]">{g.concepto}</span><span className="font-bold text-[#1C1917]">-{g.monto.toFixed(2)}€</span></div>))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS GESTIÓN */}
            <Modal isOpen={showRolesModal} title="Gestión de Equipo" onClose={() => setShowRolesModal(false)}>
                <div className="space-y-4">
                    <p className="text-sm text-[#78716C] mb-4">Delega responsabilidades. Puedes tener múltiples administradores.</p>
                    {usersList.map((u: any) => (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-[#F8F5F2] rounded-xl">
                            <span className="font-bold text-[#1B4332]">{u.nombre}</span>
                            <div className="flex gap-2">
                                <button onClick={() => toggleRole(u.id, 'es_admin', u.es_admin)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${u.es_admin ? 'bg-[#1B4332] text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>ADMIN</button>
                                <button onClick={() => toggleRole(u.id, 'es_tesorero', u.es_tesorero)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${u.es_tesorero ? 'bg-[#D08C60] text-white shadow-md' : 'bg-white text-gray-400 border border-gray-200'}`}>TESORERO</button>
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>

            <Modal isOpen={!!modalAction && modalAction.type !== 'proponer'} title={modalAction?.type === 'crearRonda' ? 'Aportación Grupo' : modalAction?.type === 'pagar' ? `Cobro a ${modalAction?.data?.nombre}` : modalAction?.type === 'adelantar' ? 'Pago de Urgencia' : modalAction?.type === 'cambiarTesorero' ? 'Relevo Admin' : 'Gasto Personal'} onClose={() => { setModalAction(null); setInputValue(''); setInputValue2(''); }}>
                <div className="space-y-6">
                    {modalAction?.type === 'cambiarTesorero' ? (
                        <div className="space-y-2">{walletData.usuarios.filter((u: any) => u.id !== user.id).map((u: any) => (<button key={u.id} onClick={() => { setInputValue(u.id); setTimeout(ejecutarAccion, 100); }} className="w-full p-4 border-b border-[#F8F5F2] hover:bg-[#F8F5F2] serif-font text-xl text-[#1B4332] text-left transition-all">{u.nombre}</button>))}</div>
                    ) : (
                        <>
                            <div><label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Importe</label><div className="flex items-center border-b border-[#E7E5E4] py-2"><span className="text-2xl text-[#1B4332] serif-font mr-2">€</span><input type="number" autoFocus className="w-full bg-transparent text-3xl text-[#1B4332] serif-font outline-none placeholder:text-[#E7E5E4]" placeholder="0.00" value={inputValue} onChange={e => setInputValue(e.target.value)} /></div></div>
                            {(modalAction?.type === 'adelantar' || modalAction?.type === 'gastoPersonal') && (<div><label className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Concepto</label><input type="text" className="w-full bg-[#F8F5F2] p-3 rounded-lg text-lg text-[#1C1917] outline-none focus:ring-1 ring-[#1B4332]" placeholder="Ej: Cena..." value={inputValue2} onChange={e => setInputValue2(e.target.value)} /></div>)}
                            <button onClick={ejecutarAccion} className="w-full py-4 btn-primary text-sm uppercase tracking-widest mt-2">Confirmar</button>
                        </>
                    )}
                </div>
            </Modal>

            <CustomAlert {...alertConfig} />
        </div>
    );
};