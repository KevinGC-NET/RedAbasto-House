-- =====================================================
-- RedAbasto House - Sistema de Pagos y Tasas por Venta
-- =====================================================
-- Ejecutar DESPUÉS de los schemas anteriores
-- =====================================================

-- Agregar campos a la tabla ventas
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS tasa_usd_cop DECIMAL(15,4) DEFAULT 1,
ADD COLUMN IF NOT EXISTS tasa_usd_ves DECIMAL(15,4) DEFAULT 1,
ADD COLUMN IF NOT EXISTS moneda_venta VARCHAR(10) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS total_pagado DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'pendiente';

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  monto DECIMAL(10,2) NOT NULL,
  moneda VARCHAR(10) NOT NULL DEFAULT 'USD',
  tasa_momento DECIMAL(15,4) NOT NULL DEFAULT 1,
  monto_usd DECIMAL(10,2) NOT NULL,
  metodo_pago VARCHAR(50) DEFAULT 'efectivo',
  referencia TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para pagos
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas para pagos
CREATE POLICY "Permitir lectura de pagos" ON pagos
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de pagos" ON pagos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de pagos" ON pagos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de pagos" ON pagos
  FOR DELETE USING (true);

-- Índice para búsqueda por venta
CREATE INDEX IF NOT EXISTS idx_pagos_venta ON pagos(venta_id);

-- Función para actualizar el total pagado y estado de una venta
CREATE OR REPLACE FUNCTION actualizar_total_pagado()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ventas
  SET
    total_pagado = (
      SELECT COALESCE(SUM(monto_usd), 0)
      FROM pagos
      WHERE venta_id = COALESCE(NEW.venta_id, OLD.venta_id)
    ),
    estado = CASE
      WHEN (SELECT COALESCE(SUM(monto_usd), 0) FROM pagos WHERE venta_id = COALESCE(NEW.venta_id, OLD.venta_id)) >= total THEN 'pagada'
      WHEN (SELECT COALESCE(SUM(monto_usd), 0) FROM pagos WHERE venta_id = COALESCE(NEW.venta_id, OLD.venta_id)) > 0 THEN 'parcial'
      ELSE 'pendiente'
    END
  WHERE id = COALESCE(NEW.venta_id, OLD.venta_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_total_pagado ON pagos;
CREATE TRIGGER trigger_actualizar_total_pagado
AFTER INSERT OR UPDATE OR DELETE ON pagos
FOR EACH ROW
EXECUTE FUNCTION actualizar_total_pagado();
