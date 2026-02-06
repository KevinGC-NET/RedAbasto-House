import { getCookie } from "@/lib/get-cookies";
import { useSyncExternalStore } from "react";

export function useIsAdmin() {
  return useSyncExternalStore(
    () => {
      // escucha cambios si los necesitas, si no, noop
      return () => {};
    },
    () => getCookie("auth") === process.env.NEXT_PUBLIC_AUH, // cliente
    () => false, // servidor (evita hydration mismatch)
  );
}
