'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImageUploadProps {
  value?: string
  onChange: (url: string) => void
  onRemove?: () => void
}

export function ImageUpload({ value, onChange, onRemove }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes')
      return
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar 5MB')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `productos/${fileName}`

      // Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('imagenes')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      // Obtener URL pública
      const { data } = supabase.storage
        .from('imagenes')
        .getPublicUrl(filePath)

      onChange(data.publicUrl)
    } catch (err: any) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  async function handleRemove() {
    if (!value) return

    // Extraer el path del archivo de la URL
    const urlParts = value.split('/imagenes/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('imagenes').remove([filePath])
    }

    onRemove?.()
    onChange('')
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-slate-300 mb-1">
        Imagen del producto
      </label>

      {value ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-slate-600">
          <img
            src={value}
            alt="Producto"
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-slate-800/50 transition-colors ${
            uploading ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-2" />
              <span className="text-sm text-slate-400">Subiendo imagen...</span>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-700 rounded-full mb-3">
                <Upload className="w-6 h-6 text-slate-400" />
              </div>
              <span className="text-sm text-slate-300 font-medium">
                Clic para subir imagen
              </span>
              <span className="text-xs text-slate-500 mt-1">
                PNG, JPG hasta 5MB
              </span>
            </>
          )}
        </label>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
