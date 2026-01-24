// 2. VOTING ROOM (SISTEMA OLÍMPICO / PORCOS BRAVOS)
if (view === 'voting_room') {
    const isVotingActive = tripPhase === 'VOTING' && votingStartDate && new Date() >= new Date(votingStartDate);

    // A) FASE DE ELIMINACIÓN ACTIVA (GUERRA)
    if (isVotingActive) {
        return (
            <div className="relative h-full bg-[#F8F5F2] p-6 pb-32 overflow-y-auto">
                <EliminationScreen
                    candidaturas={candidaturas}
                    user={user}
                    onVote={refreshCandidates}
                />
            </div>
        );
    }

    // B) FASE DE PLANNING / CUENTA ATRÁS
    return (
        <div className="relative h-full bg-[#F8F5F2] flex flex-col">
            {/* Cabecera */}
            <div className="pt-6 px-6 pb-2 shrink-0">
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-[#78716C] font-bold text-xs uppercase tracking-widest hover:text-[#1B4332] transition-colors">
                    <ArrowRight className="rotate-180" size={14} /> Volver al Mapa
                </button>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto px-6 pb-40">

                {/* Lógica: ¿Cuenta Atrás o Lista de Espera? */}
                {tripPhase === 'VOTING' && votingStartDate ? (
                    <div className="mb-8 mt-4 animate-in fade-in">
                        <VotingCountdown
                            votingDate={votingStartDate}
                            isAdmin={!!user?.esAdmin}
                            candidatesCount={candidaturas.length}
                            onStartVoting={async () => {
                                // Admin fuerza inicio inmediato
                                await supabase.from('proposals').update({ voting_start_date: new Date().toISOString() }).eq('id', user.viajeId);
                                refreshCandidates();
                            }}
                            onDateUpdate={async (date: string) => {
                                const { error } = await supabase.from('proposals').update({ voting_start_date: date }).eq('id', user.viajeId);
                                if (!error) { setVotingStartDate(date); }
                            }}
                        />
                    </div>
                ) : (
                    <div className="mb-8 mt-4 text-center">
                        <h2 className="text-3xl serif-font text-[#1B4332] mb-2">Destinos Candidatos</h2>
                        <p className="text-sm text-[#78716C]">
                            {user?.esAdmin ? 'Propón destinos y programa la votación.' : 'Esperando a que se abran las urnas.'}
                        </p>
                    </div>
                )}

                {/* LISTA DE CANDIDATURAS */}
                <div className="space-y-3">
                    {candidaturas.length > 0 ? (
                        candidaturas.map((c: any, index: number) => (
                            <div key={c.id} onClick={() => setSelectedCandidate(c)} className="bg-white p-4 rounded-2xl shadow-sm border border-[#E7E5E4] flex items-center gap-4 cursor-pointer hover:border-[#1B4332] relative group">
                                <div className="bg-[#F2EFE9] text-[#1B4332] w-10 h-10 rounded-full flex items-center justify-center font-bold serif-font text-lg group-hover:bg-[#1B4332] group-hover:text-white transition-colors">{index + 1}</div>
                                <div className="flex-1">
                                    <p className="font-bold text-[#1B4332] text-lg">{c.ciudad}</p>
                                    <p className="text-[10px] uppercase tracking-wider text-[#A8A29E]">Por: {c.propuesto_por}</p>
                                </div>
                                <div className="text-[#D6D3D1]"><Info size={20} /></div>

                                {/* Botón Borrar (Solo Admin en Planning) */}
                                {user?.esAdmin && tripPhase === 'PLANNING' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="absolute top-2 right-2 p-2 text-red-200 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed border-[#E7E5E4] rounded-3xl bg-[#F9FAFB]/50">
                            <p className="text-[#A8A29E]">Aún no hay propuestas.</p>
                        </div>
                    )}
                </div>

                {/* BOTÓN PROGRAMAR (Solo Admin) */}
                {user?.esAdmin && tripPhase === 'PLANNING' && candidaturas.length >= 3 && (
                    <div className="mt-10 mb-20 text-center">
                        <button onClick={() => setShowDatePicker(true)} className="bg-[#1B4332] text-white px-8 py-4 rounded-full font-bold shadow-xl hover:bg-[#2D6A4F] flex items-center gap-3 mx-auto uppercase tracking-wider text-xs">
                            <Calendar size={18} /> Programar Votación
                        </button>
                    </div>
                )}
            </div>

            {/* BARRA INFERIOR */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl border border-white/50">
                <button onClick={() => setView('dashboard')} className="text-[#A8A29E] hover:text-[#1B4332]"><ArrowRight className="rotate-180" size={20} /></button>
                {tripPhase === 'PLANNING' && (
                    <button onClick={() => setModalAction({ type: 'proponer' })} className="w-16 h-16 -mt-10 bg-[#1B4332] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 border-4 border-[#F8F5F2]"><Plus size={32} strokeWidth={2} /></button>
                )}
                <button className="text-[#A8A29E] hover:text-[#1B4332]"><ListOrdered size={20} /></button>
            </div>

            <CustomAlert {...alertConfig} />
        </div>
    );
}
