"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useMoneda } from "@/context/MonedaContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const navItemAdmin = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/categorias", label: "Categorías", icon: Tags },
  { href: "/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

const navItemPublic = [
  { href: "/productos", label: "Productos", icon: Package },
];

export function Sidebar() {
  const isAdmin = useIsAdmin();
  const navItems = isAdmin ? navItemAdmin : navItemPublic;

  const pathname = usePathname();
  const { monedaActual, getTasa } = useMoneda();
  const tasaActual = getTasa(monedaActual);
  const [isOpen, setIsOpen] = useState(false);

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Cerrar sidebar al hacer resize a desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {/* Botón hamburguesa para móvil */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-9 left-4 z-40 p-2 bg-slate-800 rounded-lg border border-slate-700"
      >
        <Menu className="w-6 h-6 text-slate-100" />
      </button>

      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-slate-800 border-r border-slate-700 flex flex-col z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="p-6 flex items-center justify-between">
          <div>
            <Image
              src="/text-logo-white.svg"
              width={200}
              height={200}
              alt="logo"
            />
          </div>
          {/* Botón cerrar para móvil */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1 hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <nav className="px-4 space-y-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Indicador de moneda actual */}
        <div className="p-4 border-t border-slate-700">
          <Link href={`${isAdmin ? "/configuracion" : "#"}`} className="block">
            <div className="px-4 py-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors">
              <p className="text-xs text-slate-400 mb-1">Moneda actual</p>
              <p className="text-lg font-bold text-green-400">
                {tasaActual?.simbolo} {monedaActual}
              </p>
              {monedaActual !== "USD" && tasaActual && (
                <p className="text-xs text-slate-500">
                  1 USD = {tasaActual.tasa.toLocaleString()} {monedaActual}
                </p>
              )}
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
