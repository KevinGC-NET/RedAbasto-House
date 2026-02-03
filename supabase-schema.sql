-- =====================================================
-- RedAbasto House - Schema SQL para Supabase
-- =====================================================
-- Ejecutar este script en el SQL Editor de Supabase
-- https://supabase.com/dashboard/project/[tu-proyecto]/sql
-- =====================================================

-- Clientes (se crean automáticamente al registrar una venta)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorías
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Productos
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  imagen_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ventas (cliente solo con nombre)
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre VARCHAR(200) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detalle de ventas
CREATE TABLE IF NOT EXISTS venta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  producto_nombre VARCHAR(200) NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- =====================================================
-- Habilitar Row Level Security (RLS)
-- =====================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Políticas de acceso (Uso personal - Acceso completo)
-- =====================================================

-- Clientes
CREATE POLICY "Permitir lectura de clientes" ON clientes
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de clientes" ON clientes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de clientes" ON clientes
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de clientes" ON clientes
  FOR DELETE USING (true);

-- Categorías
CREATE POLICY "Permitir lectura de categorias" ON categorias
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de categorias" ON categorias
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de categorias" ON categorias
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de categorias" ON categorias
  FOR DELETE USING (true);

-- Productos
CREATE POLICY "Permitir lectura de productos" ON productos
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de productos" ON productos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de productos" ON productos
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de productos" ON productos
  FOR DELETE USING (true);

-- Ventas
CREATE POLICY "Permitir lectura de ventas" ON ventas
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de ventas" ON ventas
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de ventas" ON ventas
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de ventas" ON ventas
  FOR DELETE USING (true);

-- Venta Items
CREATE POLICY "Permitir lectura de venta_items" ON venta_items
  FOR SELECT USING (true);

CREATE POLICY "Permitir insercion de venta_items" ON venta_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualizacion de venta_items" ON venta_items
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Permitir eliminacion de venta_items" ON venta_items
  FOR DELETE USING (true);

-- =====================================================
-- Índices para mejorar el rendimiento
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON productos(nombre);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_nombre);
CREATE INDEX IF NOT EXISTS idx_venta_items_venta ON venta_items(venta_id);
