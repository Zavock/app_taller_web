"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  loading = false,
  danger = true,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3"
      aria-modal="true"
      role="dialog"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-100">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${
                danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
              }`}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-gray-900">{title}</h2>
              {description && (
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => !loading && onClose()}
            className="rounded-lg p-2 hover:bg-gray-50 text-gray-500"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="p-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand/90"
            }`}
          >
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
