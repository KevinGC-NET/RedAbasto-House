'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Save, DollarSign, TrendingUp, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Card, CardHeader, CardContent } from '@/components/ui'
import { useMoneda } from '@/context/MonedaContext'
import type { TasaCambio } from '@/types'

export default function ConfiguracionPage() {
  const { tasas, refetchTasas, monedaActual, setMonedaActual } = useMoneda()
  const [editTasas, setEditTasas] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [fetchingApi, setFetchingApi] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'success' | 'error', texto: string } | null>(null)

  useEffect(() => {
    // Inicializar valores de edición
    const inicial: Record<string, string> = {}
    tasas.forEach(t => {
      inicial[t.moneda] = t.tasa.toString()
    })
    setEditTasas(inicial)
  }, [tasas])

  async function handleSave() {
    setSaving(true)
    setMensaje(null)

    try {
      for (const tasa of tasas) {
        const nuevaTasa = parseFloat(editTasas[tasa.moneda] || tasa.tasa.toString())
        if (nuevaTasa !== tasa.tasa) {
          const { error } = await supabase
            .from('tasas_cambio')
            .update({ tasa: nuevaTasa, updated_at: new Date().toISOString() })
            .eq('moneda', tasa.moneda)

          if (error) throw error
        }
      }

      await refetchTasas()
      setMensaje({ tipo: 'success', texto: 'Tasas actualizadas correctamente' })
    } catch (error) {
      console.error('Error saving tasas:', error)
      setMensaje({ tipo: 'error', texto: 'Error al guardar las tasas' })
    } finally {
      setSaving(false)
    }
  }

  async function fetchFromApi() {
    setFetchingApi(true)
    setMensaje(null)

    try {
      // Usar API gratuita de tasas de cambio
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')

      if (!response.ok) throw new Error('Error al consultar API')

      const data = await response.json()

      // Actualizar tasas locales
      const nuevasTasas: Record<string, string> = { ...editTasas }

      if (data.rates.COP) nuevasTasas['COP'] = data.rates.COP.toFixed(2)
      if (data.rates.VES) nuevasTasas['VES'] = data.rates.VES.toFixed(2)

      setEditTasas(nuevasTasas)
      setMensaje({ tipo: 'success', texto: 'Tasas obtenidas de la API. Haz clic en Guardar para aplicar los cambios.' })
    } catch (error) {
      console.error('Error fetching from API:', error)
      setMensaje({ tipo: 'error', texto: 'Error al consultar la API. Puedes ingresar las tasas manualmente.' })
    } finally {
      setFetchingApi(false)
    }
  }

  function formatLastUpdate(dateStr: string) {
    if (!dateStr) return 'Nunca'
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-slate-400 text-sm sm:text-base">Configura las tasas de cambio para tu negocio</p>
        <Button onClick={fetchFromApi} disabled={fetchingApi} variant="secondary" className="w-full sm:w-auto">
          {fetchingApi ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Obtener de API
        </Button>
      </div>

      {mensaje && (
        <div className={`p-4 rounded-lg ${mensaje.tipo === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Selector de moneda de visualización */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Moneda de Visualización
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">
            Selecciona en qué moneda quieres ver los precios en la aplicación.
            Los precios base siempre se guardan en USD.
          </p>
          <div className="flex flex-wrap gap-3">
            {tasas.map((tasa) => (
              <button
                key={tasa.moneda}
                onClick={() => setMonedaActual(tasa.moneda)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  monedaActual === tasa.moneda
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {tasa.simbolo} {tasa.moneda}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tasas de cambio */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Tasas de Cambio (Base: 1 USD)
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasas.map((tasa) => (
              <div key={tasa.moneda} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-slate-700/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-100">{tasa.moneda}</span>
                    <span className="text-slate-400">-</span>
                    <span className="text-slate-300">{tasa.nombre}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Última actualización: {formatLastUpdate(tasa.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 sm:w-48">
                    {tasa.moneda === 'USD' ? (
                      <div className="px-3 py-2 bg-slate-600 rounded-lg text-slate-300 text-right">
                        1.00 (Base)
                      </div>
                    ) : (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editTasas[tasa.moneda] || ''}
                        onChange={(e) => setEditTasas({ ...editTasas, [tasa.moneda]: e.target.value })}
                        className="text-right"
                      />
                    )}
                  </div>
                  <div className="text-slate-400 text-sm w-20 sm:w-24 text-right flex-shrink-0">
                    {tasa.simbolo} por USD
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} variant="success" className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Información */}
      <Card>
        <CardContent>
          <div className="text-sm text-slate-400 space-y-2">
            <p><strong className="text-slate-300">Nota:</strong> Los precios de los productos se almacenan en USD (dólares).</p>
            <p>Las tasas de cambio se usan para mostrar los precios en la moneda que selecciones.</p>
            <p>Puedes obtener las tasas actualizadas automáticamente desde la API o ingresarlas manualmente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
