'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Plus } from 'lucide-react'
import type { Cliente } from '@/types'

interface ClienteSearchProps {
  clientes: Cliente[]
  value: string
  onChange: (nombre: string) => void
  placeholder?: string
}

export function ClienteSearch({
  clientes,
  value,
  onChange,
  placeholder = 'Buscar o escribir nombre del cliente...'
}: ClienteSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filtrar clientes según el texto ingresado
  const clientesFiltrados = value.trim()
    ? clientes.filter(c =>
        c.nombre.toLowerCase().includes(value.toLowerCase().trim())
      )
    : clientes

  // Verificar si el valor actual ya existe exactamente
  const clienteExiste = clientes.some(
    c => c.nombre.toLowerCase() === value.toLowerCase().trim()
  )

  // Mostrar sugerencia de crear nuevo si no existe y hay texto
  const mostrarCrearNuevo = value.trim() && !clienteExiste

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalItems = clientesFiltrados.length + (mostrarCrearNuevo ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex(prev => (prev + 1) % totalItems)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIsOpen(true)
      setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems)
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault()
      if (mostrarCrearNuevo && highlightedIndex === 0) {
        // Seleccionar el nuevo nombre (crear nuevo cliente)
        setIsOpen(false)
      } else {
        const clienteIndex = mostrarCrearNuevo ? highlightedIndex - 1 : highlightedIndex
        if (clientesFiltrados[clienteIndex]) {
          onChange(clientesFiltrados[clienteIndex].nombre)
          setIsOpen(false)
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  function selectCliente(nombre: string) {
    onChange(nombre)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Dropdown de sugerencias */}
      {isOpen && (clientesFiltrados.length > 0 || mostrarCrearNuevo) && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {/* Opción de crear nuevo cliente */}
          {mostrarCrearNuevo && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
              }}
              className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border-b border-slate-700 ${
                highlightedIndex === 0
                  ? 'bg-blue-600/30'
                  : 'hover:bg-slate-700/50'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-green-600/30 flex items-center justify-center flex-shrink-0">
                <Plus className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-green-400 font-medium">
                  Crear nuevo cliente
                </p>
                <p className="text-slate-300 font-medium">
                  "{value.trim()}"
                </p>
              </div>
            </button>
          )}

          {/* Lista de clientes existentes */}
          {clientesFiltrados.map((cliente, index) => {
            const itemIndex = mostrarCrearNuevo ? index + 1 : index
            return (
              <button
                key={cliente.id}
                type="button"
                onClick={() => selectCliente(cliente.nombre)}
                className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                  highlightedIndex === itemIndex
                    ? 'bg-slate-700'
                    : 'hover:bg-slate-700/50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate">
                    {cliente.nombre}
                  </p>
                  <p className="text-xs text-slate-400">
                    Cliente registrado
                  </p>
                </div>
              </button>
            )
          })}

          {/* Mensaje cuando no hay resultados */}
          {clientesFiltrados.length === 0 && !mostrarCrearNuevo && (
            <div className="px-4 py-3 text-center text-slate-400 text-sm">
              No se encontraron clientes
            </div>
          )}
        </div>
      )}
    </div>
  )
}
