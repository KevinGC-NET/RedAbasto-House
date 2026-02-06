"use client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

interface Props {
  children: React.ReactNode;
}

export function BaseLayout({ children }: Props) {
  const isAdmin = useIsAdmin();
  const pathname = usePathname();
  const router = useRouter();

  // Define allowed paths for non-admins
  const isPublicPath =
    pathname === "/productos" || pathname.startsWith("/productos/show");
  const canAccess = isAdmin || isPublicPath;

  useEffect(() => {
    if (!canAccess) {
      const timer = setTimeout(() => {
        router.push("/productos");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [canAccess, router]);


  return (
    <main className="p-4 pt-16 lg:pt-4 lg:p-6">
      {canAccess ? (
        children
      ) : (
        <div className="flex items-center justify-center h-[60vh] text-slate-400">
          No tienes permisos para acceder a esta sección. Redirigiendo...
        </div>
      )}
    </main>
  );
}
