# SOLUCIÓN DEFINITIVA - Usar Supabase Realtime

## Problema
El polling cada 3 segundos NO es confiable. Los invitados deben refrescar manualmente.

## Solución
Usar **Supabase Realtime Subscriptions** para que los cambios se propaguen INSTANTÁNEAMENTE.

## Implementación

### 1. En Dashboard.tsx, reemplazar polling con suscripción:

```typescript
// DESPUÉS de línea 175 (useEffect de syncVotingState)
// Agregar ESTE useEffect NUEVO:

// 🔥 SUSCRIPCIÓN EN TIEMPO REAL a cambios de votación
useEffect(() => {
    if (!user?.viajeId) return;

    // Obtener código del viaje
    const getCode = async () => {
        const res = await fetch(`http://localhost:3005/api/viaje/${user.viajeId}`);
        const data = await res.json();
        return data.codigo;
    };

    let subscription: any = null;

    const setupRealtimeSubscription = async () => {
        const codigo = await getCode();
        if (!codigo) return;

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY
        );

        subscription = supabase
            .channel(`trip-${codigo}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'trips',
                filter: `code=eq.${codigo}`
            }, (payload: any) => {
                console.log('🔥 REALTIME UPDATE:', payload.new);
                
                if (payload.new.voting_start_date) {
                    setVotingStartDate(new Date(payload.new.voting_start_date));
                }
                setIsVotingOpen(payload.new.is_voting_open || false);
            })
            .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
        if (subscription) {
            subscription.unsubscribe();
        }
    };
}, [user?.viajeId]);
```

### 2. Resultado
- Cuando admin establece fecha → actualiza Supabase → TODOS los clientes reciben cambio INSTANTÁNEAMENTE
- NO más polling
- NO más refrescar manual
- Funciona SIEMPRE

## Alternativa MÁS SIMPLE (si Realtime no funciona)

Usar **Server-Sent Events (SSE)** o simplemente hacer que el polling sea MÁS AGRESIVO y en TODAS las vistas.

---

**DAME 5 MINUTOS** para implementar la solución definitiva con Realtime.
