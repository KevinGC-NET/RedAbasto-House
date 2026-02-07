"use client";
import { CreditCard, X } from "lucide-react";
import { useEffect, useState } from "react";

const FinancingModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem("financing-modal-seen");
    const today = new Date().toDateString();

    if (lastSeen !== today) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("financing-modal-seen", new Date().toDateString());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay: Fondo oscuro con desenfoque */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      ></div>

      {/* Contenedor del Modal */}
      <div className="relative w-full max-w-sm overflow-hidden bg-slate-950 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="p-8 text-center">
          {/* Icono Principal */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 mb-4">
            <CreditCard className="h-8 w-8 text-blue-500" />
          </div>

          <h3 className="text-2xl font-bold text-blue-400 mb-2">
            ¡Compra ahora, paga después!
          </h3>

          <p className="text-md text-white mb-6">
            Todos los productos pueden ser adquiridos hoy mismo. Paga en{" "}
            <span className="font-semibold text-blue-500"> 4 cuotas</span>{" "}
            semanales o{" "}
            <span className="font-semibold text-blue-500"> 2 cuotas</span>{" "}
            quincenales.
            <span className="font-semibold text-blue-500">
              <br /> ¡Tú eres quien decide!
            </span>
          </p>

          {/* Botones de Acción */}
          <div className="space-y-3">
            <button
              onClick={handleClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98]"
            >
              Ver Productos
            </button>
          </div>
        </div>

        {/* Detalle decorativo inferior */}
        <div className="h-1.5 w-full bg-line-to-r from-blue-400 via-blue-600 to-blue-400"></div>
      </div>
    </div>
  );
};

export default FinancingModal;
