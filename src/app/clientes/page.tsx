"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui";
import { useMoneda } from "@/context/MonedaContext";
import type { Cliente } from "@/types";

interface ClienteConEstadisticas extends Cliente {
  total_compras: number;
  total_facturado: number; // Total de todas las ventas
  total_pagado: number; // Total realmente pagado
  deuda_pendiente: number; // Diferencia (facturado - pagado)
  tiene_deuda: boolean; // Si tiene pagos pendientes
  ultima_compra: string | null;
}

const ITEMS_PER_PAGE = 15;

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteConEstadisticas[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { formatearPrecio } = useMoneda();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    // Obtener clientes y ventas con información de pagos
    const [clientesRes, ventasRes] = await Promise.all([
      supabase.from("clientes").select("*").order("nombre"),
      supabase
        .from("ventas")
        .select("cliente_nombre, total, total_pagado, estado, created_at")
        .order("created_at", { ascending: false }),
    ]);

    if (clientesRes.error) {
      console.error("Error fetching clientes:", clientesRes.error);
      setLoading(false);
      return;
    }

    const clientesData = clientesRes.data || [];
    const ventasData = ventasRes.data || [];

    // Calcular estadísticas por cliente incluyendo pagos
    const estadisticasPorCliente: Record<
      string,
      {
        total_compras: number;
        total_facturado: number;
        total_pagado: number;
        ultima_compra: string | null;
      }
    > = {};

    ventasData.forEach(
      (venta: {
        cliente_nombre: string;
        total: number;
        total_pagado: number;
        estado: string;
        created_at: string;
      }) => {
        const nombreNormalizado = venta.cliente_nombre.toLowerCase();

        if (!estadisticasPorCliente[nombreNormalizado]) {
          estadisticasPorCliente[nombreNormalizado] = {
            total_compras: 0,
            total_facturado: 0,
            total_pagado: 0,
            ultima_compra: null,
          };
        }

        estadisticasPorCliente[nombreNormalizado].total_compras++;
        estadisticasPorCliente[nombreNormalizado].total_facturado +=
          venta.total;
        estadisticasPorCliente[nombreNormalizado].total_pagado +=
          venta.total_pagado || 0;

        // La primera venta que encontramos es la más reciente (ordenadas descendente)
        if (!estadisticasPorCliente[nombreNormalizado].ultima_compra) {
          estadisticasPorCliente[nombreNormalizado].ultima_compra =
            venta.created_at;
        }
      },
    );

    // Combinar clientes con sus estadísticas
    const clientesConEstadisticas: ClienteConEstadisticas[] = clientesData.map(
      (cliente) => {
        const stats = estadisticasPorCliente[cliente.nombre.toLowerCase()] || {
          total_compras: 0,
          total_facturado: 0,
          total_pagado: 0,
          ultima_compra: null,
        };

        const deuda_pendiente = stats.total_facturado - stats.total_pagado;

        return {
          ...cliente,
          total_compras: stats.total_compras,
          total_facturado: stats.total_facturado,
          total_pagado: stats.total_pagado,
          deuda_pendiente: deuda_pendiente,
          tiene_deuda: deuda_pendiente > 0,
          ultima_compra: stats.ultima_compra,
        };
      },
    );

    // Ordenar por deuda pendiente primero, luego por total facturado
    clientesConEstadisticas.sort((a, b) => {
      // Primero los que tienen deuda
      if (a.tiene_deuda && !b.tiene_deuda) return -1;
      if (!a.tiene_deuda && b.tiene_deuda) return 1;
      // Luego por monto de deuda (mayor primero)
      if (a.deuda_pendiente !== b.deuda_pendiente)
        return b.deuda_pendiente - a.deuda_pendiente;
      // Finalmente por total facturado
      return b.total_facturado - a.total_facturado;
    });

    setClientes(clientesConEstadisticas);
    setLoading(false);
  }

  // Filtrar clientes
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;

    const termino = busqueda.toLowerCase().trim();
    return clientes.filter((c) => c.nombre.toLowerCase().includes(termino));
  }, [clientes, busqueda]);

  // Paginación
  const totalPages = Math.ceil(clientesFiltrados.length / ITEMS_PER_PAGE);
  const clientesPaginados = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return clientesFiltrados.slice(start, start + ITEMS_PER_PAGE);
  }, [clientesFiltrados, currentPage]);

  // Resetear página al buscar
  useEffect(() => {
    setCurrentPage(1);
  }, [busqueda]);

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Sin compras";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateRegistro(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Estadísticas generales
  const totalClientes = clientes.length;
  const totalVentas = clientes.reduce((sum, c) => sum + c.total_compras, 0);
  const totalFacturado = clientes.reduce(
    (sum, c) => sum + c.total_facturado,
    0,
  );
  const totalCobrado = clientes.reduce((sum, c) => sum + c.total_pagado, 0);
  const totalPendiente = clientes.reduce(
    (sum, c) => sum + c.deuda_pendiente,
    0,
  );
  const clientesConDeuda = clientes.filter((c) => c.tiene_deuda).length;

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
          Clientes registrados automáticamente al realizar ventas
        </p>
      </div>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {totalClientes}
                </p>
                <p className="text-sm text-slate-400">Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">
                  {totalVentas}
                </p>
                <p className="text-sm text-slate-400">Ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-600/20 flex items-center justify-center">
                <span className="text-slate-400 font-bold">$</span>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">
                  {formatearPrecio(totalFacturado)}
                </p>
                <p className="text-sm text-slate-400">Facturado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <span className="text-green-400 font-bold">$</span>
              </div>
              <div>
                <p className="text-xl font-bold text-green-400">
                  {formatearPrecio(totalCobrado)}
                </p>
                <p className="text-sm text-slate-400">Cobrado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={totalPendiente > 0 ? "border-red-500/50" : ""}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-400">
                  {formatearPrecio(totalPendiente)}
                </p>
                <p className="text-sm text-slate-400">
                  Pendiente ({clientesConDeuda})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Mostrando {clientesFiltrados.length} de {clientes.length} clientes
          </div>
        </CardContent>
      </Card>

      {clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">
              {clientes.length === 0
                ? "No hay clientes registrados. Se crearán automáticamente al registrar ventas."
                : "No se encontraron clientes con ese nombre"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Vista de tabla para desktop */}
          <div className="hidden lg:block bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left px-6 py-4 text-sm font-medium text-slate-400">
                    Cliente
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-slate-400">
                    Compras
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                    Facturado
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                    Pagado
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                    Pendiente
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-slate-400">
                    Última compra
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientesPaginados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                      cliente.tiene_deuda ? "bg-red-900/10" : ""
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            cliente.tiene_deuda
                              ? "bg-red-900/50"
                              : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`font-medium text-sm ${
                              cliente.tiene_deuda
                                ? "text-red-300"
                                : "text-slate-300"
                            }`}
                          >
                            {cliente.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-100">
                            {cliente.nombre}
                          </p>
                          {cliente.tiene_deuda && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Tiene deuda pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-md text-sm ${
                          cliente.total_compras > 5
                            ? "bg-green-900/50 text-green-400"
                            : cliente.total_compras > 0
                            ? "bg-blue-900/50 text-blue-400"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        {cliente.total_compras}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-slate-300">
                        {formatearPrecio(cliente.total_facturado)}
                      </p>
                      <p className="text-xs text-slate-500">
                        $ {cliente.total_facturado.toFixed(2)} USD
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-semibold text-green-400">
                        {formatearPrecio(cliente.total_pagado)}
                      </p>
                      <p className="text-xs text-slate-500">
                        $ {cliente.total_pagado.toFixed(2)} USD
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {cliente.tiene_deuda ? (
                        <>
                          <p className="font-semibold text-red-400">
                            {formatearPrecio(cliente.deuda_pendiente)}
                          </p>
                          <p className="text-xs text-red-500">
                            $ {cliente.deuda_pendiente.toFixed(2)} USD
                          </p>
                        </>
                      ) : (
                        <span className="px-2 py-1 rounded-md text-xs bg-green-900/50 text-green-400">
                          Al día
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300 text-sm">
                      {formatDate(cliente.ultima_compra)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista de cards para móvil y tablet */}
          <div className="lg:hidden space-y-4">
            {clientesPaginados.map((cliente) => (
              <Card
                key={cliente.id}
                className={cliente.tiene_deuda ? "border-red-500/50" : ""}
              >
                <CardContent>
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        cliente.tiene_deuda ? "bg-red-900/50" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`font-medium text-lg ${
                          cliente.tiene_deuda
                            ? "text-red-300"
                            : "text-slate-300"
                        }`}
                      >
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-100 truncate">
                        {cliente.nombre}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateRegistro(cliente.created_at)}
                      </p>
                      {cliente.tiene_deuda && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs bg-red-900/50 text-red-400">
                          <AlertCircle className="w-3 h-3" />
                          Deuda pendiente
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-700 items-center">
                    <div className="text-center w-full h-full">
                      <p className="text-sm font-bold text-blue-400">
                        {cliente.total_compras}
                      </p>
                      <p className="text-xs text-slate-400">Compras</p>
                    </div>
                    <div className="text-center w-full h-full">
                      <p className="text-sm font-bold text-slate-300">
                        {formatearPrecio(cliente.total_facturado)}
                      </p>
                      <p className="text-xs text-slate-400">Facturado</p>
                    </div>
                    <div className="text-center w-full h-full">
                      <p className="text-sm font-bold text-green-400">
                        {formatearPrecio(cliente.total_pagado)}
                      </p>
                      <p className="text-xs text-slate-400">Pagado</p>
                    </div>
                    <div className="text-center w-full h-full">
                      {cliente.tiene_deuda ? (
                        <>
                          <p className="text-sm font-bold text-red-400">
                            {formatearPrecio(cliente.deuda_pendiente)}
                          </p>
                          <p className="text-xs text-red-400">Debe</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-green-400">✓</p>
                          <p className="text-xs text-green-400">Al día</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-slate-700 rounded-lg text-slate-300 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Números de página */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
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
    </div>
  );
}
