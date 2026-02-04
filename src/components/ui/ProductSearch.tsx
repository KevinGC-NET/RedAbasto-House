"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Package, X } from "lucide-react";
import type { Producto } from "@/types";

interface ProductSearchProps {
  productos: Producto[];
  onSelect: (producto: Producto) => void;
  formatearPrecio: (precio: number) => string;
}

export function ProductSearch({
  productos,
  onSelect,
  formatearPrecio,
}: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredProducts = query.trim()
    ? productos
        .filter(
          (p) =>
            p.nombre.toLowerCase().includes(query.toLowerCase()) ||
            p.descripcion?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 8)
    : productos.slice(0, 8);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredProducts.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

  function handleSelect(producto: Producto) {
    if (producto.stock <= 0) {
      return;
    }
    onSelect(producto);
    setQuery("");
    inputRef.current?.focus();
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar producto por nombre..."
          className="w-full pl-10 pr-10 py-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-600 rounded"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={listRef}
            className="absolute z-20 w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto"
          >
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                No se encontraron productos
              </div>
            ) : (
              filteredProducts.map((producto, index) => (
                <button
                  key={producto.id}
                  type="button"
                  onClick={() => handleSelect(producto)}
                  disabled={producto.stock <= 0}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                    index === highlightedIndex
                      ? "bg-blue-600/30"
                      : "hover:bg-slate-700/50"
                  } ${producto.stock <= 0 ? "opacity-50 cursor-not-allowed" : ""} ${
                    index !== filteredProducts.length - 1
                      ? "border-b border-slate-700/50"
                      : ""
                  }`}
                >
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Package className="w-6 h-6 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-100 truncate">
                      {producto.nombre}
                    </p>
                    {producto.descripcion && (
                      <p className="text-sm text-slate-400 truncate">
                        {producto.descripcion}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-green-400">
                        {formatearPrecio(producto.precio)}
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          producto.stock > 10
                            ? "bg-green-900/50 text-green-400"
                            : producto.stock > 0
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {producto.stock > 0
                          ? `Stock: ${producto.stock}`
                          : "Sin stock"}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
            {productos.length > 8 && !query && (
              <div className="p-2 text-center text-xs text-slate-500 border-t border-slate-700">
                Escribe para buscar entre {productos.length} productos
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
