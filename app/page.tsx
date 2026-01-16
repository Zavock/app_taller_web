"use client";

import Link from "next/link";
import { FileText, Clock } from "lucide-react";
import Logo from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md border border-gray-100 p-5 md:p-8">
        {/* Logo + título */}
        <section className="flex flex-col items-center gap-3 mb-6">
          <Logo className="text-3xl md:text-4xl" />

          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold text-brand">
              Presupuestos del taller
            </h1>
            <p className="mt-1 text-xs md:text-sm text-gray-500">
              Crear y consultar presupuestos de servicios y repuestos
            </p>
          </div>
        </section>

        {/* Botones principales */}
        <section className="flex flex-col gap-3">
          {/* Nuevo presupuesto */}
          <Link
            href="/nuevo"
            className="group rounded-2xl border border-[#dbe5ff] bg-[#f5f8ff] px-4 py-4 md:py-5 flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#dbe5ff]">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm md:text-base font-semibold text-brand">
                Nuevo presupuesto
              </h2>
              <p className="text-[11px] md:text-xs text-gray-500">
                Crear registro para un vehículo
              </p>
            </div>
          </Link>

          {/* Historial */}
          <Link
            href="/historial"
            className="group rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 md:py-5 flex items-center gap-3 md:gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200">
              <Clock className="h-5 w-5 text-gray-700" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm md:text-base font-semibold text-gray-800">
                Historial
              </h2>
              <p className="text-[11px] md:text-xs text-gray-500">
                Consultar presupuestos por placa
              </p>
            </div>
          </Link>
        </section>

        {/* Footer */}
        <footer className="mt-6 text-center text-[11px] text-gray-400">
          Versión 2.0 · 2026
        </footer>
      </div>
    </main>
  );
}
