'use client'

import { usePathname } from 'next/navigation'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/productos': 'Productos',
  '/categorias': 'Categorías',
  '/ventas': 'Ventas',
  '/clientes': 'Clientes',
  '/configuracion': 'Configuración',
}

export function Header() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || 'RedAbasto House'

  return (
    <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center px-6 pl-16 lg:pl-6">
      <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
    </header>
  )
}
