'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { TasaCambio } from '@/types'

interface MonedaContextType {
  tasas: TasaCambio[]
  monedaActual: string
  setMonedaActual: (moneda: string) => void
  convertir: (precioUSD: number, moneda?: string) => number
  formatearPrecio: (precioUSD: number, moneda?: string) => string
  getTasa: (moneda: string) => TasaCambio | undefined
  loading: boolean
  refetchTasas: () => Promise<void>
}

const MonedaContext = createContext<MonedaContextType | undefined>(undefined)

export function MonedaProvider({ children }: { children: ReactNode }) {
  const [tasas, setTasas] = useState<TasaCambio[]>([])
  const [monedaActual, setMonedaActual] = useState<string>('USD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasas()
    fetchConfiguracion()
  }, [])

  async function fetchTasas() {
    const { data, error } = await supabase
      .from('tasas_cambio')
      .select('*')
      .eq('activa', true)
      .order('moneda')

    if (error) {
      console.error('Error fetching tasas:', error)
      // Tasas por defecto si no hay conexión
      setTasas([
        { id: '1', moneda: 'USD', nombre: 'Dólar', simbolo: '$', tasa: 1, activa: true, updated_at: '' },
        { id: '2', moneda: 'COP', nombre: 'Peso Colombiano', simbolo: '$', tasa: 4150, activa: true, updated_at: '' },
        { id: '3', moneda: 'VES', nombre: 'Bolívar', simbolo: 'Bs.', tasa: 52, activa: true, updated_at: '' },
      ])
    } else {
      setTasas(data || [])
    }
    setLoading(false)
  }

  async function fetchConfiguracion() {
    const { data } = await supabase
      .from('configuracion')
      .select('*')
      .eq('clave', 'moneda_visualizacion')
      .single()

    if (data) {
      setMonedaActual(data.valor)
    }
  }

  async function handleSetMonedaActual(moneda: string) {
    setMonedaActual(moneda)
    // Guardar preferencia en Supabase
    await supabase
      .from('configuracion')
      .upsert({ clave: 'moneda_visualizacion', valor: moneda, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
  }

  function getTasa(moneda: string): TasaCambio | undefined {
    return tasas.find(t => t.moneda === moneda)
  }

  function convertir(precioUSD: number, moneda?: string): number {
    const mon = moneda || monedaActual
    const tasa = getTasa(mon)
    if (!tasa) return precioUSD
    return precioUSD * tasa.tasa
  }

  function formatearPrecio(precioUSD: number, moneda?: string): string {
    const mon = moneda || monedaActual
    const tasa = getTasa(mon)
    const precio = convertir(precioUSD, mon)

    if (!tasa) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(precioUSD)
    }

    // Formatear según la moneda
    const opciones: Intl.NumberFormatOptions = {
      minimumFractionDigits: mon === 'USD' ? 2 : 0,
      maximumFractionDigits: mon === 'USD' ? 2 : 0
    }

    const numero = new Intl.NumberFormat('es-CO', opciones).format(precio)
    return `${tasa.simbolo} ${numero}`
  }

  return (
    <MonedaContext.Provider
      value={{
        tasas,
        monedaActual,
        setMonedaActual: handleSetMonedaActual,
        convertir,
        formatearPrecio,
        getTasa,
        loading,
        refetchTasas: fetchTasas
      }}
    >
      {children}
    </MonedaContext.Provider>
  )
}

export function useMoneda() {
  const context = useContext(MonedaContext)
  if (context === undefined) {
    throw new Error('useMoneda debe usarse dentro de MonedaProvider')
  }
  return context
}
