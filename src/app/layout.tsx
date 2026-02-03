import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { MonedaProvider } from "@/context/MonedaContext"

const inter = Inter({
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "RedAbasto House",
  description: "Sistema de gestión de productos y ventas",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-900 text-slate-100`}>
        <MonedaProvider>
          <Sidebar />
          <div className="lg:ml-64">
            <Header />
            <main className="p-4 pt-16 lg:pt-4 lg:p-6">{children}</main>
          </div>
        </MonedaProvider>
      </body>
    </html>
  )
}
