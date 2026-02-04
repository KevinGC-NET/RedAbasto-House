'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, ShoppingCart, Eye, Trash2, Minus, DollarSign, CreditCard, CheckCircle, Clock, AlertCircle, Search, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Modal, Card, CardContent, Select, ProductSearch, ClienteSearch } from '@/components/ui'
import { useMoneda } from '@/context/MonedaContext'
import type { Producto, Venta, Cliente } from '@/types'

interface CartItem {
  producto: Producto
  cantidad: number
}

type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'

const ITEMS_PER_PAGE = 10

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detalleModal, setDetalleModal] = useState<Venta | null>(null)
  const [pagoModal, setPagoModal] = useState<Venta | null>(null)
  const [clienteNombre, setClienteNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])

  // Campos para pago
  const [montoPago, setMontoPago] = useState('')
  const [monedaPago, setMonedaPago] = useState('USD')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [referenciaPago, setReferenciaPago] = useState('')

  // Filtros
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<string>('all')
  const [filtroFecha, setFiltroFecha] = useState<DateFilter>('all')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)

  // Cache de items de ventas para filtrar por producto
  const [ventasItems, setVentasItems] = useState<Record<string, string[]>>({})

  const { formatearPrecio, tasas, getTasa } = useMoneda()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [ventasRes, productosRes, itemsRes, clientesRes] = await Promise.all([
      supabase
        .from('ventas')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('productos').select('*').order('nombre'),
      supabase.from('venta_items').select('venta_id, producto_nombre'),
      supabase.from('clientes').select('*').order('nombre')
    ])

    if (ventasRes.error) console.error('Error fetching ventas:', ventasRes.error)
    else setVentas(ventasRes.data || [])

    if (productosRes.error) console.error('Error fetching productos:', productosRes.error)
    else setProductos(productosRes.data || [])

    if (clientesRes.error) console.error('Error fetching clientes:', clientesRes.error)
    else setClientes(clientesRes.data || [])

    // Crear mapa de venta_id -> productos
    if (itemsRes.data) {
      const itemsMap: Record<string, string[]> = {}
      itemsRes.data.forEach((item: { venta_id: string; producto_nombre: string }) => {
        if (!itemsMap[item.venta_id]) {
          itemsMap[item.venta_id] = []
        }
        itemsMap[item.venta_id].push(item.producto_nombre.toLowerCase())
      })
      setVentasItems(itemsMap)
    }

    setLoading(false)
  }

  // Función para obtener rango de fechas según el filtro
  function getDateRange(filter: DateFilter): { start: Date | null; end: Date | null } {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    switch (filter) {
      case 'today':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      case 'week': {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        return { start: weekStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }
      case 'month': {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return { start: monthStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }
      case 'year': {
        const yearStart = new Date(today.getFullYear(), 0, 1)
        return { start: yearStart, end: new Date(today.getTime() + 24 * 60 * 60 * 1000) }
      }
      case 'custom':
        return {
          start: fechaInicio ? new Date(fechaInicio) : null,
          end: fechaFin ? new Date(new Date(fechaFin).getTime() + 24 * 60 * 60 * 1000) : null
        }
      default:
        return { start: null, end: null }
    }
  }

  // Ventas filtradas
  const ventasFiltradas = useMemo(() => {
    let resultado = [...ventas]

    // Filtro por cliente
    if (filtroCliente.trim()) {
      const termino = filtroCliente.toLowerCase().trim()
      resultado = resultado.filter(v =>
        v.cliente_nombre.toLowerCase().includes(termino)
      )
    }

    // Filtro por producto
    if (filtroProducto.trim()) {
      const termino = filtroProducto.toLowerCase().trim()
      resultado = resultado.filter(v => {
        const productosVenta = ventasItems[v.id] || []
        return productosVenta.some(p => p.includes(termino))
      })
    }

    // Filtro por estado
    if (filtroEstado !== 'all') {
      resultado = resultado.filter(v => (v.estado || 'pendiente') === filtroEstado)
    }

    // Filtro por fecha
    if (filtroFecha !== 'all') {
      const { start, end } = getDateRange(filtroFecha)
      if (start) {
        resultado = resultado.filter(v => new Date(v.created_at) >= start)
      }
      if (end) {
        resultado = resultado.filter(v => new Date(v.created_at) < end)
      }
    }

    return resultado
  }, [ventas, filtroCliente, filtroProducto, filtroEstado, filtroFecha, fechaInicio, fechaFin, ventasItems])

  // Paginación
  const totalPages = Math.ceil(ventasFiltradas.length / ITEMS_PER_PAGE)
  const ventasPaginadas = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return ventasFiltradas.slice(start, start + ITEMS_PER_PAGE)
  }, [ventasFiltradas, currentPage])

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [filtroCliente, filtroProducto, filtroEstado, filtroFecha, fechaInicio, fechaFin])

  function clearFilters() {
    setFiltroCliente('')
    setFiltroProducto('')
    setFiltroEstado('all')
    setFiltroFecha('all')
    setFechaInicio('')
    setFechaFin('')
  }

  const hasActiveFilters = filtroCliente || filtroProducto || filtroEstado !== 'all' || filtroFecha !== 'all'

  async function fetchVentaCompleta(ventaId: string): Promise<Venta | null> {
    const [ventaRes, itemsRes, pagosRes] = await Promise.all([
      supabase.from('ventas').select('*').eq('id', ventaId).single(),
      supabase.from('venta_items').select('*').eq('venta_id', ventaId),
      supabase.from('pagos').select('*').eq('venta_id', ventaId).order('created_at', { ascending: false })
    ])

    if (ventaRes.error) {
      console.error('Error fetching venta:', ventaRes.error)
      return null
    }

    return {
      ...ventaRes.data,
      items: itemsRes.data || [],
      pagos: pagosRes.data || []
    }
  }

  async function openDetalleModal(venta: Venta) {
    const ventaCompleta = await fetchVentaCompleta(venta.id)
    if (ventaCompleta) setDetalleModal(ventaCompleta)
  }

  async function openPagoModal(venta: Venta) {
    const ventaCompleta = await fetchVentaCompleta(venta.id)
    if (ventaCompleta) {
      setPagoModal(ventaCompleta)
      setMontoPago('')
      setMonedaPago('USD')
      setMetodoPago('efectivo')
      setReferenciaPago('')
    }
  }

  function addToCart(producto: Producto) {
    const existingItem = cart.find((item) => item.producto.id === producto.id)
    const cantidadEnCarrito = existingItem?.cantidad || 0
    const cantidadTotal = cantidadEnCarrito + 1

    if (cantidadTotal > producto.stock) {
      alert(`Stock insuficiente. Solo hay ${producto.stock} unidades disponibles${cantidadEnCarrito > 0 ? ` (ya tienes ${cantidadEnCarrito} en el carrito)` : ''}.`)
      return
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: cantidadTotal }
            : item
        )
      )
    } else {
      setCart([...cart, { producto, cantidad: 1 }])
    }
  }

  function removeFromCart(productoId: string) {
    setCart(cart.filter((item) => item.producto.id !== productoId))
  }

  function updateCartQuantity(productoId: string, newCantidad: number) {
    if (newCantidad < 1) {
      removeFromCart(productoId)
      return
    }

    const item = cart.find((i) => i.producto.id === productoId)
    if (!item) return

    if (newCantidad > item.producto.stock) {
      alert(`Stock insuficiente. Solo hay ${item.producto.stock} unidades disponibles.`)
      return
    }

    setCart(
      cart.map((i) =>
        i.producto.id === productoId ? { ...i, cantidad: newCantidad } : i
      )
    )
  }

  function getTotal() {
    return cart.reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0)
  }

  function closeModal() {
    setModalOpen(false)
    setClienteNombre('')
    setNotas('')
    setCart([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (cart.length === 0 || !clienteNombre.trim()) return

    const total = getTotal()
    const nombreCliente = clienteNombre.trim()

    // Verificar si el cliente ya existe, si no, crearlo
    const clienteExiste = clientes.some(
      c => c.nombre.toLowerCase() === nombreCliente.toLowerCase()
    )

    if (!clienteExiste) {
      const { error: clienteError } = await supabase
        .from('clientes')
        .insert({ nombre: nombreCliente })

      if (clienteError && !clienteError.message.includes('duplicate')) {
        console.error('Error creating cliente:', clienteError)
      }
    }

    // Obtener tasas actuales
    const tasaCOP = getTasa('COP')?.tasa || 1
    const tasaVES = getTasa('VES')?.tasa || 1

    const { data: ventaData, error: ventaError } = await supabase
      .from('ventas')
      .insert({
        cliente_nombre: nombreCliente,
        total,
        notas: notas || null,
        tasa_usd_cop: tasaCOP,
        tasa_usd_ves: tasaVES,
        moneda_venta: 'USD',
        total_pagado: 0,
        estado: 'pendiente'
      })
      .select()
      .single()

    if (ventaError) {
      console.error('Error creating venta:', ventaError)
      return
    }

    const ventaItems = cart.map((item) => ({
      venta_id: ventaData.id,
      producto_id: item.producto.id,
      producto_nombre: item.producto.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.producto.precio,
      subtotal: item.producto.precio * item.cantidad
    }))

    const { error: itemsError } = await supabase.from('venta_items').insert(ventaItems)

    if (itemsError) {
      console.error('Error creating venta items:', itemsError)
      return
    }

    // Actualizar stock
    for (const item of cart) {
      await supabase
        .from('productos')
        .update({ stock: item.producto.stock - item.cantidad })
        .eq('id', item.producto.id)
    }

    closeModal()
    fetchData()
  }

  async function handlePago(e: React.FormEvent) {
    e.preventDefault()
    if (!pagoModal || !montoPago) return

    const monto = parseFloat(montoPago)
    const tasa = getTasa(monedaPago)?.tasa || 1
    const montoUSD = monedaPago === 'USD' ? monto : monto / tasa

    const { error } = await supabase.from('pagos').insert({
      venta_id: pagoModal.id,
      monto,
      moneda: monedaPago,
      tasa_momento: tasa,
      monto_usd: montoUSD,
      metodo_pago: metodoPago,
      referencia: referenciaPago || null
    })

    if (error) {
      console.error('Error registrando pago:', error)
      return
    }

    setPagoModal(null)
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta venta?')) return

    const { error } = await supabase.from('ventas').delete().eq('id', id)

    if (error) {
      console.error('Error deleting venta:', error)
      return
    }

    fetchData()
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatPrecioConTasa(precioUSD: number, moneda: string, tasaVenta: number) {
    if (moneda === 'USD') {
      return `$ ${precioUSD.toFixed(2)} USD`
    }
    const precio = precioUSD * tasaVenta
    const simbolo = getTasa(moneda)?.simbolo || '$'
    return `${simbolo} ${precio.toLocaleString('es-CO', { minimumFractionDigits: 0 })} ${moneda}`
  }

  function getEstadoBadge(estado: string) {
    switch (estado) {
      case 'pagada':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-900/50 text-green-400 rounded-md text-xs">
            <CheckCircle className="w-3 h-3" /> Pagada
          </span>
        )
      case 'parcial':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded-md text-xs">
            <Clock className="w-3 h-3" /> Parcial
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-900/50 text-red-400 rounded-md text-xs">
            <AlertCircle className="w-3 h-3" /> Pendiente
          </span>
        )
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-slate-400 text-sm sm:text-base">Registra y consulta tus ventas</p>
        <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Venta
        </Button>
      </div>

      {/* Barra de filtros */}
      <Card>
        <CardContent className="py-4">
          {/* Filtros principales - siempre visibles */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda por cliente */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente..."
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Búsqueda por producto */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por producto..."
                  value={filtroProducto}
                  onChange={(e) => setFiltroProducto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro de estado */}
            <div className="w-full lg:w-48">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="pagada">Pagada</option>
              </select>
            </div>

            {/* Botón mostrar más filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilters || filtroFecha !== 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Fechas</span>
              {filtroFecha !== 'all' && (
                <span className="w-2 h-2 bg-white rounded-full" />
              )}
            </button>
          </div>

          {/* Filtros de fecha expandibles */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'all', label: 'Todas' },
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: 'Esta semana' },
                  { value: 'month', label: 'Este mes' },
                  { value: 'year', label: 'Este año' },
                  { value: 'custom', label: 'Personalizado' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFiltroFecha(option.value as DateFilter)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      filtroFecha === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {filtroFecha === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">Desde</label>
                    <input
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm text-slate-400 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resumen de filtros activos */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-400">Filtros activos:</span>
              {filtroCliente && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                  Cliente: {filtroCliente}
                  <button onClick={() => setFiltroCliente('')} className="hover:text-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filtroProducto && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                  Producto: {filtroProducto}
                  <button onClick={() => setFiltroProducto('')} className="hover:text-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filtroEstado !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                  Estado: {filtroEstado}
                  <button onClick={() => setFiltroEstado('all')} className="hover:text-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filtroFecha !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                  Fecha: {filtroFecha === 'custom' ? 'Personalizado' : filtroFecha === 'today' ? 'Hoy' : filtroFecha === 'week' ? 'Esta semana' : filtroFecha === 'month' ? 'Este mes' : 'Este año'}
                  <button onClick={() => setFiltroFecha('all')} className="hover:text-blue-100">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-red-400 hover:text-red-300 ml-2"
              >
                Limpiar todos
              </button>
            </div>
          )}

          {/* Contador de resultados */}
          <div className="mt-3 text-sm text-slate-400">
            Mostrando {ventasFiltradas.length} de {ventas.length} ventas
          </div>
        </CardContent>
      </Card>

      {ventasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {ventas.length === 0
                ? 'No hay ventas registradas'
                : 'No se encontraron ventas con los filtros aplicados'}
            </p>
            {ventas.length === 0 ? (
              <Button onClick={() => setModalOpen(true)} className="mt-4">
                Registrar primera venta
              </Button>
            ) : (
              <Button onClick={clearFilters} variant="secondary" className="mt-4">
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista de tabla para desktop */}
          <div className="hidden lg:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Fecha</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">Cliente</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Total</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Pagado</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-slate-400">Estado</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasPaginadas.map((venta) => {
                  const restante = venta.total - (venta.total_pagado || 0)
                  return (
                    <tr
                      key={venta.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-300 text-sm">
                        {formatDate(venta.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-100">{venta.cliente_nombre}</p>
                        {venta.notas && (
                          <p className="text-sm text-slate-400 truncate max-w-xs">{venta.notas}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-slate-100">
                          {formatearPrecio(venta.total)}
                        </p>
                        <p className="text-xs text-slate-500">$ {venta.total.toFixed(2)} USD</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-semibold text-green-400">
                          $ {(venta.total_pagado || 0).toFixed(2)}
                        </p>
                        {restante > 0 && (
                          <p className="text-xs text-red-400">Debe: $ {restante.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getEstadoBadge(venta.estado || 'pendiente')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-1">
                          {venta.estado !== 'pagada' && (
                            <button
                              onClick={() => openPagoModal(venta)}
                              className="p-2 hover:bg-green-700/50 rounded-lg transition-colors"
                              title="Registrar pago"
                            >
                              <DollarSign className="w-4 h-4 text-green-400" />
                            </button>
                          )}
                          <button
                            onClick={() => openDetalleModal(venta)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(venta.id)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Vista de cards para móvil y tablet */}
          <div className="lg:hidden space-y-4">
            {ventasPaginadas.map((venta) => {
              const restante = venta.total - (venta.total_pagado || 0)
              return (
                <Card key={venta.id}>
                  <CardContent>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium text-slate-100">{venta.cliente_nombre}</p>
                        <p className="text-xs text-slate-400">{formatDate(venta.created_at)}</p>
                      </div>
                      {getEstadoBadge(venta.estado || 'pendiente')}
                    </div>

                    {venta.notas && (
                      <p className="text-sm text-slate-400 mb-3 truncate">{venta.notas}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-slate-400">Total</p>
                        <p className="font-semibold text-slate-100">{formatearPrecio(venta.total)}</p>
                        <p className="text-xs text-slate-500">$ {venta.total.toFixed(2)} USD</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Pagado</p>
                        <p className="font-semibold text-green-400">$ {(venta.total_pagado || 0).toFixed(2)}</p>
                        {restante > 0 && (
                          <p className="text-xs text-red-400">Debe: $ {restante.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                      {venta.estado !== 'pagada' && (
                        <button
                          onClick={() => openPagoModal(venta)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-700/30 hover:bg-green-700/50 text-green-400 rounded-lg text-sm transition-colors"
                        >
                          <DollarSign className="w-4 h-4" />
                          Pagar
                        </button>
                      )}
                      <button
                        onClick={() => openDetalleModal(venta)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                      <button
                        onClick={() => handleDelete(venta.id)}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <p className="text-sm text-slate-400">
                Página {currentPage} de {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Primera
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Números de página */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Última
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Nueva Venta */}
      <Modal isOpen={modalOpen} onClose={closeModal} title="Nueva Venta">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nombre del Cliente
            </label>
            <ClienteSearch
              clientes={clientes}
              value={clienteNombre}
              onChange={setClienteNombre}
              placeholder="Buscar o escribir nombre del cliente..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Si el cliente no existe, se creará automáticamente
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Agregar Productos
            </label>
            <ProductSearch
              productos={productos}
              onSelect={addToCart}
              formatearPrecio={formatearPrecio}
            />
            <p className="text-xs text-slate-500 mt-2">
              Busca y selecciona productos para agregar al carrito
            </p>
          </div>

          {cart.length > 0 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="text-left px-4 py-2 text-sm text-slate-400">Producto</th>
                    <th className="text-center px-4 py-2 text-sm text-slate-400">Cant.</th>
                    <th className="text-right px-4 py-2 text-sm text-slate-400">Subtotal</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.producto.id} className="border-t border-slate-700/50">
                      <td className="px-4 py-2 text-slate-200">{item.producto.nombre}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.producto.id, item.cantidad - 1)}
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            <Minus className="w-3 h-3 text-slate-400" />
                          </button>
                          <span className="w-8 text-center text-slate-200">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.producto.id, item.cantidad + 1)}
                            className="p-1 hover:bg-slate-700 rounded"
                          >
                            <Plus className="w-3 h-3 text-slate-400" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-200">
                        {formatearPrecio(item.producto.precio * item.cantidad)}
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.producto.id)}
                          className="p-1 hover:bg-slate-700 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-600 bg-slate-700/30">
                    <td colSpan={1} className="px-4 py-3 text-right font-medium text-slate-300">
                      Total:
                    </td>
                    <td colSpan={2} className="px-4 py-3 text-right font-bold text-green-400">
                      {formatearPrecio(getTotal())}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <Input
            label="Notas (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />

          <div className="bg-slate-700/30 p-3 rounded-lg text-sm text-slate-400">
            <p>Las tasas de cambio actuales se guardarán con esta venta:</p>
            <div className="flex gap-4 mt-1">
              <span>USD: {getTasa('USD')?.tasa?.toLocaleString() || 'N/A'}</span>
              <span>VES: {getTasa('VES')?.tasa?.toLocaleString() || 'N/A'}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={cart.length === 0}>
              Registrar Venta
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Detalle Venta */}
      <Modal
        isOpen={!!detalleModal}
        onClose={() => setDetalleModal(null)}
        title="Detalle de Venta"
      >
        {detalleModal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Cliente</p>
                <p className="text-slate-100 font-medium">{detalleModal.cliente_nombre}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Fecha</p>
                <p className="text-slate-100">{formatDate(detalleModal.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Estado</p>
                {getEstadoBadge(detalleModal.estado || 'pendiente')}
              </div>
              <div>
                <p className="text-sm text-slate-400">Tasas al momento</p>
                <p className="text-xs text-slate-300">
                  COP: {detalleModal.tasa_usd_cop?.toLocaleString()} | VES: {detalleModal.tasa_usd_ves?.toLocaleString()}
                </p>
              </div>
            </div>

            {detalleModal.notas && (
              <div>
                <p className="text-sm text-slate-400">Notas</p>
                <p className="text-slate-300">{detalleModal.notas}</p>
              </div>
            )}

            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">Productos</p>
              <div className="space-y-2">
                {detalleModal.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b border-slate-700/50"
                  >
                    <div>
                      <p className="text-slate-200">{item.producto_nombre}</p>
                      <p className="text-sm text-slate-400">
                        {item.cantidad} x $ {item.precio_unitario.toFixed(2)} USD
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-200">$ {item.subtotal.toFixed(2)} USD</p>
                      <p className="text-xs text-slate-400">
                        {formatPrecioConTasa(item.subtotal, 'COP', detalleModal.tasa_usd_cop || 1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sección de pagos */}
            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm font-medium text-slate-400 mb-2">Historial de Pagos</p>
              {detalleModal.pagos && detalleModal.pagos.length > 0 ? (
                <div className="space-y-2">
                  {detalleModal.pagos.map((pago) => (
                    <div
                      key={pago.id}
                      className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg"
                    >
                      <div>
                        <p className="text-sm text-slate-200">
                          {pago.metodo_pago === 'efectivo' ? '💵' : '💳'} {pago.metodo_pago}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatDate(pago.created_at)}
                          {pago.referencia && ` - Ref: ${pago.referencia}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-400">
                          {getTasa(pago.moneda)?.simbolo} {pago.monto.toLocaleString()} {pago.moneda}
                        </p>
                        <p className="text-xs text-slate-400">
                          $ {pago.monto_usd.toFixed(2)} USD (tasa: {pago.tasa_momento})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-2">Sin pagos registrados</p>
              )}
            </div>

            {/* Resumen */}
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Total venta:</span>
                <span className="font-medium">$ {detalleModal.total.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-green-400">
                <span>Total pagado:</span>
                <span className="font-medium">$ {(detalleModal.total_pagado || 0).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-lg border-t border-slate-600 pt-2">
                <span className={detalleModal.total - (detalleModal.total_pagado || 0) > 0 ? 'text-red-400' : 'text-green-400'}>
                  {detalleModal.total - (detalleModal.total_pagado || 0) > 0 ? 'Pendiente:' : 'Saldo:'}
                </span>
                <span className={`font-bold ${detalleModal.total - (detalleModal.total_pagado || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  $ {Math.abs(detalleModal.total - (detalleModal.total_pagado || 0)).toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {detalleModal.estado !== 'pagada' && (
                <Button
                  variant="success"
                  onClick={() => {
                    setDetalleModal(null)
                    openPagoModal(detalleModal)
                  }}
                  className="flex-1"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Registrar Pago
                </Button>
              )}
              <Button variant="secondary" onClick={() => setDetalleModal(null)} className="flex-1">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Registrar Pago */}
      <Modal
        isOpen={!!pagoModal}
        onClose={() => setPagoModal(null)}
        title="Registrar Pago"
      >
        {pagoModal && (
          <form onSubmit={handlePago} className="space-y-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-400">Venta a: <span className="text-slate-100">{pagoModal.cliente_nombre}</span></p>
              <div className="flex justify-between mt-2">
                <span className="text-slate-400">Total:</span>
                <span className="text-slate-100">$ {pagoModal.total.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pagado:</span>
                <span className="text-green-400">$ {(pagoModal.total_pagado || 0).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-t border-slate-600 mt-2 pt-2">
                <span className="text-slate-300 font-medium">Pendiente:</span>
                <span className="text-red-400 font-bold">$ {(pagoModal.total - (pagoModal.total_pagado || 0)).toFixed(2)} USD</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Monto"
                type="number"
                step="0.01"
                min="0"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                required
              />
              <Select
                label="Moneda"
                value={monedaPago}
                onChange={(e) => setMonedaPago(e.target.value)}
                options={tasas.map(t => ({ value: t.moneda, label: `${t.simbolo} ${t.moneda}` }))}
              />
            </div>

            {/* Botón pagar todo */}
            <button
              type="button"
              onClick={() => {
                const restanteUSD = pagoModal.total - (pagoModal.total_pagado || 0)
                const tasa = getTasa(monedaPago)?.tasa || 1
                const montoEnMoneda = monedaPago === 'USD' ? restanteUSD : restanteUSD * tasa
                setMontoPago(montoEnMoneda.toFixed(2))
              }}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
            >
              💰 Pagar todo el restante ({monedaPago === 'USD'
                ? `$ ${(pagoModal.total - (pagoModal.total_pagado || 0)).toFixed(2)} USD`
                : `${getTasa(monedaPago)?.simbolo} ${((pagoModal.total - (pagoModal.total_pagado || 0)) * (getTasa(monedaPago)?.tasa || 1)).toLocaleString('es-CO', { minimumFractionDigits: 2 })} ${monedaPago}`
              })
            </button>

            {monedaPago !== 'USD' && montoPago && (
              <div className="bg-blue-900/30 p-3 rounded-lg text-sm">
                <p className="text-blue-400">
                  Equivale a: <strong>$ {(parseFloat(montoPago) / (getTasa(monedaPago)?.tasa || 1)).toFixed(2)} USD</strong>
                </p>
                <p className="text-blue-300/70 text-xs">
                  Tasa actual: 1 USD = {getTasa(monedaPago)?.tasa?.toLocaleString()} {monedaPago}
                </p>
              </div>
            )}

            <Select
              label="Método de pago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              options={[
                { value: 'efectivo', label: '💵 Efectivo' },
                { value: 'transferencia', label: '🏦 Transferencia' },
                { value: 'tarjeta', label: '💳 Tarjeta' },
                { value: 'pago_movil', label: '📱 Pago Móvil' },
                { value: 'zelle', label: '💸 Zelle' },
                { value: 'otro', label: '📝 Otro' },
              ]}
            />

            <Input
              label="Referencia (opcional)"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
              placeholder="Número de transacción, etc."
            />

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => setPagoModal(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="success" disabled={!montoPago}>
                <CreditCard className="w-4 h-4 mr-1" />
                Registrar Pago
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
