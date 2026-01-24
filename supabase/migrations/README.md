# Ejecutar Migración de Fases

Este archivo contiene las instrucciones para aplicar la migración que añade el sistema de fases a la tabla `trips`.

## Opción 1: Supabase CLI (Recomendado)

Si tienes Supabase CLI instalado:

```bash
# Navegar al directorio del proyecto
cd c:\Users\wanas\TravelSphere

# Aplicar la migración
supabase db push

# O aplicar manualmente
supabase db execute --file supabase/migrations/20260119_add_trip_phases.sql
```

## Opción 2: Supabase Dashboard (Manual)

1. Abre tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `supabase/migrations/20260119_add_trip_phases.sql`
4. Ejecuta el script

## Opción 3: Ejecutar desde código (Edge Function)

Puedes ejecutar la migración desde una Edge Function admin:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Necesita service role
);

// Ejecutar migración
await supabase.from('trips').select('*').limit(1); // Test connection first
```

## Verificación

Después de ejecutar la migración, verifica con:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'trips' 
AND column_name IN ('phase', 'voting_start_date');
```

Deberías ver:
- `phase` (text) con default 'PLANNING'
- `voting_start_date` (timestamp with time zone) nullable

## ⚠️ IMPORTANTE

Si ya tienes datos en la tabla `trips`, todos los viajes existentes tendrán automáticamente `phase = 'PLANNING'` por el default.
