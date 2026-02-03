-- =====================================================
-- RedAbasto House - Tasas de Cambio
-- =====================================================
-- Ejecutar este script DESPUÉS del schema principal
-- =====================================================

-- Tabla de tasas de cambio
CREATE TABLE IF NOT EXISTS tasas_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moneda VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(50) NOT NULL,
  simbolo VARCHAR(10) NOT NULL,
  tasa DECIMAL(15,4) NOT NULL DEFAULT 1,
  activa BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE tasas_cambio ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir lectura de tasas" ON tasas_cambio
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de tasas" ON tasas_cambio
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de tasas" ON tasas_cambio
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de tasas" ON tasas_cambio
  FOR DELETE USING (true);

-- Insertar monedas por defecto (USD como base = 1)
INSERT INTO tasas_cambio (moneda, nombre, simbolo, tasa, activa) VALUES
  ('USD', 'Dólar Estadounidense', '$', 1, true),
  ('COP', 'Peso Colombiano', '$', 4150, true),
  ('VES', 'Bolívar Venezolano', 'Bs.', 52, true)
ON CONFLICT (moneda) DO NOTHING;

-- Tabla de configuración general
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(50) NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Permitir lectura de config" ON configuracion
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de config" ON configuracion
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de config" ON configuracion
  FOR UPDATE USING (true) WITH CHECK (true);

-- Configuración por defecto
INSERT INTO configuracion (clave, valor) VALUES
  ('moneda_principal', 'USD'),
  ('moneda_visualizacion', 'COP')
ON CONFLICT (clave) DO NOTHING;
