-- Habilitar Realtime para la tabla 'trips'
BEGIN;

-- 1. Habilitar la publicación de Supabase Realtime para la tabla 'trips'
-- Esto permite que Supabase envíe eventos cuando hay cambios
alter publication supabase_realtime add table trips;

-- 2. Configurar permisos RLS (Row Level Security) para permitir LECTURA a todos
-- Es necesario para que los usuarios (incluso anónimos o invitados) puedan suscribirse
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir lectura pública de viajes
CREATE POLICY "Permitir lectura pública de trips"
ON trips FOR SELECT
USING (true);

-- Si la política ya existe, no dará error fatal, pero por si acaso intenta borrarla antes (comentado por seguridad)
-- DROP POLICY IF EXISTS "Permitir lectura pública de trips" ON trips;

COMMIT;
