'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Modal, Card, CardContent } from '@/components/ui'
import type { Categoria } from '@/types'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    fetchCategorias()
  }, [])

  async function fetchCategorias() {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching categorias:', error)
    } else {
      setCategorias(data || [])
    }
    setLoading(false)
  }

  function openModal(categoria?: Categoria) {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormData({ nombre: categoria.nombre, descripcion: categoria.descripcion || '' })
    } else {
      setEditingCategoria(null)
      setFormData({ nombre: '', descripcion: '' })
    }
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingCategoria(null)
    setFormData({ nombre: '', descripcion: '' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (editingCategoria) {
      const { error } = await supabase
        .from('categorias')
        .update({ nombre: formData.nombre, descripcion: formData.descripcion || null })
        .eq('id', editingCategoria.id)

      if (error) {
        console.error('Error updating categoria:', error)
        return
      }
    } else {
      const { error } = await supabase
        .from('categorias')
        .insert({ nombre: formData.nombre, descripcion: formData.descripcion || null })

      if (error) {
        console.error('Error creating categoria:', error)
        return
      }
    }

    closeModal()
    fetchCategorias()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return

    const { error } = await supabase.from('categorias').delete().eq('id', id)

    if (error) {
      console.error('Error deleting categoria:', error)
      return
    }

    fetchCategorias()
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
      <div className="flex justify-between items-center">
        <p className="text-slate-400">Gestiona las categorías de tus productos</p>
        <Button onClick={() => openModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Categoría
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categorias.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-slate-400">No hay categorías registradas</p>
              <Button onClick={() => openModal()} className="mt-4">
                Crear primera categoría
              </Button>
            </CardContent>
          </Card>
        ) : (
          categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardContent>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">
                      {categoria.nombre}
                    </h3>
                    {categoria.descripcion && (
                      <p className="text-sm text-slate-400 mt-1">
                        {categoria.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(categoria)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(categoria.id)}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingCategoria ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            required
          />
          <Input
            label="Descripción (opcional)"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="success">
              {editingCategoria ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
