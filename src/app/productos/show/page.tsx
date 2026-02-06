"use client";

import { useMoneda } from "@/context/MonedaContext";
import { supabase } from "@/lib/supabase";
import { Producto } from "@/types";
import { Loader2, Package } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

export function ProductShowContent() {
  const [producto, setProducto] = useState<Producto | null>(null);
  const { formatearPrecio } = useMoneda();

  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const getProduct = async () => {
    const [productoRes] = await Promise.all([
      supabase
        .from("productos")
        .select("*, categoria:categorias(*)")
        .eq("id", id)
        .single(),
    ]);

    if (productoRes.error) {
      console.error("Error fetching producto:", productoRes.error);
      return;
    }
    setProducto(productoRes.data);
  };

  useEffect(() => {
    if (id) {
      getProduct();
    }
  }, [id]);

  return producto ? (
    <div
      key={producto.id}
      className="bg-slate-800 w-full md:w-140 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-all hover:shadow-lg hover:shadow-slate-900/50 group"
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
      </div>
    </div>
  ) : (
    <div className="flex flex-col min-h-screen items-center justify-center animate-pulse">
      <Loader2 size={50} className="animate-spin" />
      <div className="text-slate-400 text-2xl ">Cargando producto...</div>
    </div>
  );
}
export default function ProductShow() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col min-h-screen items-center justify-center">
          <Loader2 size={50} className="animate-spin text-slate-400" />
        </div>
      }
    >
      <ProductShowContent />
    </Suspense>
  );
}
