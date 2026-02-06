"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Input,
  Modal,
  Card,
  CardContent,
  Select,
  ImageUpload,
} from "@/components/ui";
import { useMoneda } from "@/context/MonedaContext";
import type { Producto, Categoria } from "@/types";
import Image from "next/image";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRouter, useSearchParams } from "next/navigation";
import { WhatsappButton } from "@/components/ui/whatsapp-button";

type ViewMode = "grid" | "table";

export function ProductosPageContent() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    categoria_id: "",
    imagen_url: "",
  });

  const { formatearPrecio } = useMoneda();

  const filteredProducts = useMemo(() => {
    let filter = productos;
    if (filtroEstado === "all") {
      filter = productos;
    }

    if (filtroEstado !== "all") {
      filter = [...productos].sort((a, b) => {
        const aMatches =
          filtroEstado === "pendiente" ? a.stock > 0 : a.stock <= 0;
        const bMatches =
          filtroEstado === "pendiente" ? b.stock > 0 : b.stock <= 0;

        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    if (filterCategory !== "all") {
      filter = filter.filter((producto) => {
        if (!producto.categoria) return false;
        return producto.categoria.id === filterCategory;
      });
    }

    if (filterCategory === "all") {
      filter = filter.filter((producto) => {
        if (!producto.categoria) return true;
        return producto.categoria.id !== filterCategory;
      });
    }

    return filter;
  }, [filtroEstado, productos, filterCategory]);

  useEffect(() => {
    // Recuperar preferencia de vista
    fetchData();

    const savedView = localStorage.getItem("productos-view") as ViewMode;
    if (savedView) setViewMode(savedView);
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("productos-view", mode);
  }

  async function fetchData() {
    const [productosRes, categoriasRes] = await Promise.all([
      supabase
        .from("productos")
        .select("*, categoria:categorias(*)")
        .order("stock", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("categorias").select("*").order("nombre"),
    ]);

    if (productosRes.error)
      console.error("Error fetching productos:", productosRes.error);
    else setProductos(productosRes.data || []);

    if (categoriasRes.error)
      console.error("Error fetching categorias:", categoriasRes.error);
    else setCategorias(categoriasRes.data || []);

    setLoading(false);
  }

  function openModal(producto?: Producto) {
    if (producto) {
      setEditingProducto(producto);
      setFormData({
        nombre: producto.nombre,
        descripcion: producto.descripcion || "",
        precio: producto.precio.toString(),
        stock: producto.stock.toString(),
        categoria_id: producto.categoria_id || "",
        imagen_url: producto.imagen_url || "",
      });
    } else {
      setEditingProducto(null);
      setFormData({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "0",
        categoria_id: "",
        imagen_url: "",
      });
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProducto(null);
    setFormData({
      nombre: "",
      descripcion: "",
      precio: "",
      stock: "0",
      categoria_id: "",
      imagen_url: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const productoData = {
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      precio: parseFloat(formData.precio),
      stock: parseInt(formData.stock),
      categoria_id: formData.categoria_id || null,
      imagen_url: formData.imagen_url || null,
    };

    if (editingProducto) {
      const { error } = await supabase
        .from("productos")
        .update(productoData)
        .eq("id", editingProducto.id);

      if (error) {
        console.error("Error updating producto:", error);
        return;
      }
    } else {
      const { error } = await supabase.from("productos").insert(productoData);

      if (error) {
        console.error("Error creating producto:", error);
        return;
      }
    }

    closeModal();
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    const { error } = await supabase.from("productos").delete().eq("id", id);

    if (error) {
      console.error("Error deleting producto:", error);
      return;
    }

    fetchData();
  }

  useEffect(() => {
    setFilterCategory(
      categorias.find((c) => c.nombre === categoryParam)?.id || "all",
    );
  }, [categoryParam, categorias]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-slate-400 text-sm sm:text-base">
          Gestiona tu inventario de productos (precios en USD)
        </p>
        <div className="grid grid-cols-2 items-center gap-2 w-full sm:w-auto">
          <div className="w-full">
            <Select
              label="Filtrar por categoría"
              value={filterCategory}
              onChange={(e) => {
                const value = e.target.value;
                const params = new URLSearchParams(searchParams.toString());
                if (value !== "all") {
                  params.set(
                    "category",
                    categorias.find((c) => c.id === value)?.nombre || "",
                  );
                } else {
                  params.delete("category");
                }
                router.push(`?${params.toString()}`);
              }}
              options={[
                { value: "all", label: "Todas las categorías" },
                ...categorias.map((c) => ({
                  value: c.id,
                  label: c.nombre,
                })),
              ]}
            />
          </div>
          <div className="w-full">
            <Select
              label="Filtrar por disponibilidad"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              options={[
                { value: "all", label: "Todos los estados" },
                { value: "pendiente", label: "Disponibles" },
                { value: "parcial", label: "Vendidos" },
              ]}
            />
          </div>
          {/* Toggle de vista */}
          {isAdmin && (
            <div className="flex items-center w-20 bg-slate-800 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => changeViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Vista de cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeViewMode("table")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Vista de tabla"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
          {isAdmin && (
            <Button onClick={() => openModal()} className="flex-1 sm:flex-none">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No hay productos registrados</p>
            <Button onClick={() => openModal()} className="mt-4">
              Crear primer producto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista de Grid tipo Ecommerce (desktop) */}
          {viewMode === "grid" && (
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((producto) => (
                <div
                  key={producto.id}
                  className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50 group"
                >
                  {/* Imagen del producto */}
                  <div className="relative aspect-[1/1.3] bg-slate-700/50 overflow-hidden">
                    {producto.imagen_url ? (
                      <Image
                        src={producto.imagen_url}
                        alt={producto.nombre}
                        width={400}
                        height={400}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          producto.stock <= 0 ? "opacity-50 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center ${
                          producto.stock <= 0 ? "opacity-50" : ""
                        }`}
                      >
                        <Package className="w-16 h-16 text-slate-600" />
                      </div>
                    )}

                    {/* Sello AGOTADO estilo stamp */}
                    {producto.stock <= 0 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="px-4 py-2 border-4 border-red-600 rounded-sm -rotate-12 shadow-lg">
                          <span className="text-2xl font-black text-red-600 tracking-widest uppercase">
                            AGOTADO
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Badge de stock (solo si hay stock) */}
                    {producto.stock > 0 && (
                      <div className="absolute top-2 right-2">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium ${
                            producto.stock > 10
                              ? "bg-green-900/80 text-green-400"
                              : "bg-yellow-900/80 text-yellow-400"
                          }`}
                        >
                          {producto.stock} en stock
                        </span>
                      </div>
                    )}
                    {/* Categoría */}
                    {producto.categoria && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-slate-900/80 rounded-md text-xs text-slate-300">
                          {producto.categoria.nombre}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info del producto */}
                  <div className="p-4">
                    <h3
                      className="font-semibold text-slate-100 truncate mb-1"
                      title={producto.nombre}
                    >
                      {producto.nombre}
                    </h3>
                    {producto.descripcion && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3 min-h-10">
                        {producto.descripcion}
                      </p>
                    )}
                    {!producto.descripcion && <div className="mb-3 min-h-10" />}

                    {/* Precio */}
                    <div className="mb-4">
                      <p className="text-xl font-bold text-green-400">
                        {formatearPrecio(producto.precio)}
                      </p>
                      <p className="text-xs text-slate-300">
                        $ {producto.precio.toFixed(2)} USD
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      {isAdmin ? (
                        <>
                          <button
                            onClick={() => openModal(producto)}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id)}
                            className="p-2 bg-slate-700 hover:bg-red-900/50 rounded-lg transition-colors group/btn"
                          >
                            <Trash2 className="w-4 h-4 text-slate-400 group-hover/btn:text-red-400" />
                          </button>
                        </>
                      ) : (
                        producto.stock > 0 && (
                          <WhatsappButton
                            productName={producto.nombre}
                            productId={producto.id}
                            price={`$ ${producto.precio} al cambio BCV`}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vista de tabla para desktop */}
          {viewMode === "table" && (
            <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                      Producto
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                      Categoría
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                      Precio
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                      Stock
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => (
                    <tr
                      key={producto.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {producto.imagen_url ? (
                            <Image
                              src={producto.imagen_url}
                              alt={producto.nombre}
                              width={400}
                              height={400}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-100">
                              {producto.nombre}
                            </p>
                            {producto.descripcion && (
                              <p className="text-sm text-slate-400 truncate max-w-xs">
                                {producto.descripcion}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {producto.categoria ? (
                          <span className="px-2 py-1 bg-slate-700 rounded-md text-sm text-slate-300">
                            {producto.categoria.nombre}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-sm">
                            Sin categoría
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <p className="font-medium text-slate-100">
                            {formatearPrecio(producto.precio)}
                          </p>
                          <p className="text-xs text-slate-500">
                            $ {producto.precio.toFixed(2)} USD
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`px-2 py-1 rounded-md text-sm ${
                            producto.stock > 10
                              ? "bg-green-900/50 text-green-400"
                              : producto.stock > 0
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {producto.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(producto)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id)}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Vista de cards para móvil */}
          <div className="md:hidden space-y-4">
            {viewMode === "table" ? (
              filteredProducts.map((producto) => (
                <Card key={producto.id}>
                  <CardContent>
                    <div className="flex items-start gap-3">
                      {producto.imagen_url ? (
                        <Image
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          width={400}
                          height={400}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                          <Package className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-100 truncate">
                              {producto.nombre}
                            </p>
                            {producto.categoria && (
                              <span className="inline-block px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300 mt-1">
                                {producto.categoria.nombre}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            <button
                              onClick={() => openModal(producto)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(producto.id)}
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div>
                            <p className="font-semibold text-slate-100">
                              {formatearPrecio(producto.precio)}
                            </p>
                            <p className="text-xs text-slate-300">
                              $ {producto.precio.toFixed(2)} USD
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 rounded-md text-sm ${
                              producto.stock > 10
                                ? "bg-green-900/50 text-green-400"
                                : producto.stock > 0
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-red-900/50 text-red-400"
                            }`}
                          >
                            Stock: {producto.stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="grid gap-4">
                {filteredProducts.map((producto) => (
                  <div
                    key={producto.id}
                    className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50 group"
                  >
                    {/* Imagen del producto */}
                    <div className="relative aspect-[1/1.2] bg-slate-700/50 overflow-hidden">
                      {producto.imagen_url ? (
                        <Image
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          width={400}
                          height={400}
                          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                            producto.stock <= 0 ? "opacity-50 grayscale" : ""
                          }`}
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${
                            producto.stock <= 0 ? "opacity-50" : ""
                          }`}
                        >
                          <Package className="w-16 h-16 text-slate-600" />
                        </div>
                      )}

                      {/* Sello AGOTADO estilo stamp */}
                      {producto.stock <= 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="px-4 py-2 border-4 border-red-600 rounded-sm -rotate-12 shadow-lg">
                            <span className="text-2xl font-black text-red-600 tracking-widest uppercase">
                              AGOTADO
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Badge de stock (solo si hay stock) */}
                      {producto.stock > 0 && (
                        <div className="absolute top-2 right-2">
                          <span
                            className={`px-2 py-1 rounded-md text-xs font-medium ${
                              producto.stock > 10
                                ? "bg-green-900/80 text-green-400"
                                : "bg-yellow-900/80 text-yellow-400"
                            }`}
                          >
                            {producto.stock} en stock
                          </span>
                        </div>
                      )}
                      {/* Categoría */}
                      {producto.categoria && (
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-1 bg-slate-900/80 rounded-md text-xs text-slate-300">
                            {producto.categoria.nombre}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info del producto */}
                    <div className="p-4">
                      <h3
                        className="font-semibold text-slate-100 truncate mb-1"
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </h3>
                      {producto.descripcion && (
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3 min-h-10">
                          {producto.descripcion}
                        </p>
                      )}
                      {!producto.descripcion && (
                        <div className="mb-3 min-h-10" />
                      )}

                      {/* Precio */}
                      <div className="mb-4">
                        <p className="text-xl font-bold text-green-400">
                          {formatearPrecio(producto.precio)}
                        </p>
                        <p className="text-xs text-slate-300">
                          $ {producto.precio.toFixed(2)} USD
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex gap-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => openModal(producto)}
                              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(producto.id)}
                              className="p-2 bg-slate-700 hover:bg-red-900/50 rounded-lg transition-colors group/btn"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 group-hover/btn:text-red-400" />
                            </button>
                          </>
                        ) : (
                          producto.stock > 0 && (
                            <WhatsappButton
                              productName={producto.nombre}
                              productId={producto.id}
                              price={`$ ${producto.precio} al cambio BCV`}
                            />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {isAdmin && (
        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editingProducto ? "Editar Producto" : "Nuevo Producto"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              required
            />
            <Input
              label="Descripción (opcional)"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Precio (USD)"
                type="number"
                step="0.01"
                min="0"
                value={formData.precio}
                onChange={(e) =>
                  setFormData({ ...formData, precio: e.target.value })
                }
                required
              />
              <Input
                label="Stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                required
              />
            </div>
            <Select
              label="Categoría"
              value={formData.categoria_id}
              onChange={(e) =>
                setFormData({ ...formData, categoria_id: e.target.value })
              }
              options={categorias.map((c) => ({
                value: c.id,
                label: c.nombre,
              }))}
            />
            <ImageUpload
              value={formData.imagen_url}
              onChange={(url) => setFormData({ ...formData, imagen_url: url })}
            />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal}>
                Cancelar
              </Button>
              <Button type="submit" variant="success">
                {editingProducto ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function ProductosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen items-center justify-center">
          <Loader2 size={50} className="animate-spin text-slate-400" />
        </div>
      }
    >
      <ProductosPageContent />
    </Suspense>
  );
}
