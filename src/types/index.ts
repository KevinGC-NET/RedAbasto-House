export interface Cliente {
  id: string
  nombre: string
  created_at: string
}

export interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
}

export interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  stock: number
  categoria_id: string | null
  imagen_url: string | null
  created_at: string
  categoria?: Categoria
}

export interface Venta {
  id: string
  cliente_nombre: string
  total: number
  notas: string | null
  created_at: string
  // Nuevos campos para tasas y pagos
  tasa_usd_cop: number
  tasa_usd_ves: number
  moneda_venta: string
  total_pagado: number
  estado: 'pendiente' | 'parcial' | 'pagada'
  items?: VentaItem[]
  pagos?: Pago[]
}

export interface VentaItem {
  id: string
  venta_id: string
  producto_id: string | null
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Pago {
  id: string
  venta_id: string
  monto: number
  moneda: string
  tasa_momento: number
  monto_usd: number
  metodo_pago: string
  referencia: string | null
  created_at: string
}

export interface TasaCambio {
  id: string
  moneda: string
  nombre: string
  simbolo: string
  tasa: number
  activa: boolean
  updated_at: string
}

export interface Configuracion {
  id: string
  clave: string
  valor: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      clientes: {
        Row: Cliente
        Insert: Omit<Cliente, 'id' | 'created_at'>
        Update: Partial<Omit<Cliente, 'id' | 'created_at'>>
      }
      categorias: {
        Row: Categoria
        Insert: Omit<Categoria, 'id' | 'created_at'>
        Update: Partial<Omit<Categoria, 'id' | 'created_at'>>
      }
      productos: {
        Row: Producto
        Insert: Omit<Producto, 'id' | 'created_at' | 'categoria'>
        Update: Partial<Omit<Producto, 'id' | 'created_at' | 'categoria'>>
      }
      ventas: {
        Row: Venta
        Insert: Omit<Venta, 'id' | 'created_at' | 'items' | 'pagos'>
        Update: Partial<Omit<Venta, 'id' | 'created_at' | 'items' | 'pagos'>>
      }
      venta_items: {
        Row: VentaItem
        Insert: Omit<VentaItem, 'id'>
        Update: Partial<Omit<VentaItem, 'id'>>
      }
      pagos: {
        Row: Pago
        Insert: Omit<Pago, 'id' | 'created_at'>
        Update: Partial<Omit<Pago, 'id' | 'created_at'>>
      }
    }
  }
}
