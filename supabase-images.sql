-- Crear bucket para imágenes (ejecutar en SQL Editor)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imagenes', 'imagenes', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir subir archivos
CREATE POLICY "Permitir subir imagenes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'imagenes');

-- Política para permitir ver archivos
CREATE POLICY "Permitir ver imagenes" ON storage.objects
  FOR SELECT USING (bucket_id = 'imagenes');

-- Política para permitir eliminar archivos
CREATE POLICY "Permitir eliminar imagenes" ON storage.objects
  FOR DELETE USING (bucket_id = 'imagenes');