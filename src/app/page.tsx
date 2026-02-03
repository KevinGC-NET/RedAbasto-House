'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Tags, ShoppingCart, TrendingUp, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardContent } from '@/components/ui'
import type { Venta, Producto } from '@/types'

interface Stats {
  totalProductos: number
  totalCategorias: number
  totalVentas: number
  ventasHoy: number
  ingresosMes: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProductos: 0,
    totalCategorias: 0,
    totalVentas: 0,
    ventasHoy: 0,
    ingresosMes: 0
  })
  const [ventasRecientes, setVentasRecientes] = useState<Venta[]>([])
  const [productosLowStock, setProductosLowStock] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

    const [
      productosRes,
      categoriasRes,
      ventasRes,
      ventasHoyRes,
      ventasMesRes,
      lowStockRes
    ] = await Promise.all([
      supabase.from('productos').select('id', { count: 'exact' }),
      supabase.from('categorias').select('id', { count: 'exact' }),
      supabase.from('ventas').select('id', { count: 'exact' }),
      supabase
        .from('ventas')
        .select('id', { count: 'exact' })
        .gte('created_at', today.toISOString()),
      supabase
        .from('ventas')
        .select('total')
        .gte('created_at', firstDayOfMonth.toISOString()),
      supabase
        .from('productos')
        .select('*')
        .lte('stock', 5)
        .order('stock', { ascending: true })
        .limit(5)
    ])

    const ingresosMes = ventasMesRes.data?.reduce((sum, v) => sum + v.total, 0) || 0

    setStats({
      totalProductos: productosRes.count || 0,
      totalCategorias: categoriasRes.count || 0,
      totalVentas: ventasRes.count || 0,
      ventasHoy: ventasHoyRes.count || 0,
      ingresosMes
    })

    setProductosLowStock(lowStockRes.data || [])

    const { data: ventasData } = await supabase
      .from('ventas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    setVentasRecientes(ventasData || [])
    setLoading(false)
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(price)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Productos</p>
                <p className="text-3xl font-bold text-slate-100">{stats.totalProductos}</p>
              </div>
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <Package className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Categorías</p>
                <p className="text-3xl font-bold text-slate-100">{stats.totalCategorias}</p>
              </div>
              <div className="p-3 bg-purple-600/20 rounded-lg">
                <Tags className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ventas Hoy</p>
                <p className="text-3xl font-bold text-slate-100">{stats.ventasHoy}</p>
              </div>
              <div className="p-3 bg-green-600/20 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ingresos del Mes</p>
                <p className="text-2xl font-bold text-green-400">{formatPrice(stats.ingresosMes)}</p>
              </div>
              <div className="p-3 bg-emerald-600/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Recientes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Ventas Recientes</h3>
              <Link
                href="/ventas"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {ventasRecientes.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No hay ventas registradas
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {ventasRecientes.map((venta) => (
                  <div
                    key={venta.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{venta.cliente_nombre}</p>
                      <p className="text-sm text-slate-400">{formatDate(venta.created_at)}</p>
                    </div>
                    <p className="font-semibold text-green-400">{formatPrice(venta.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productos con Bajo Stock */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">Stock Bajo</h3>
              <Link
                href="/productos"
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Ver productos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {productosLowStock.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                Todos los productos tienen stock suficiente
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {productosLowStock.map((producto) => (
                  <div
                    key={producto.id}
                    className="px-6 py-3 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-200">{producto.nombre}</p>
                      <p className="text-sm text-slate-400">{formatPrice(producto.precio)}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-sm font-medium ${
                        producto.stock === 0
                          ? 'bg-red-900/50 text-red-400'
                          : 'bg-yellow-900/50 text-yellow-400'
                      }`}
                    >
                      {producto.stock} en stock
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-100">Acciones Rápidas</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/ventas"
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="p-2 bg-green-600/20 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Nueva Venta</p>
                <p className="text-sm text-slate-400">Registrar una venta</p>
              </div>
            </Link>

            <Link
              href="/productos"
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Nuevo Producto</p>
                <p className="text-sm text-slate-400">Agregar al inventario</p>
              </div>
            </Link>

            <Link
              href="/categorias"
              className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Tags className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-slate-200">Nueva Categoría</p>
                <p className="text-sm text-slate-400">Organizar productos</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
