import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-xl bg-white rounded-xl shadow p-8">
        <header className="text-center mb-8 flex flex-col items-center gap-2">
          <Image
            src="/logo-taller.svg"
            alt="Taller de Vehículos"
            width={380}
            height={150}
            priority
          />
          <h1 className="text-3xl font-bold text-blue-700">
            Presupuestos del taller
          </h1>
          <p className="text-sm text-gray-500">
            Crear y consultar presupuestos de servicios y repuestos
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          {/* Nuevo Presupuesto */}
          <Link
            href="/nuevo"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition p-6 text-center"
          >
            <span className="text-4xl">📄</span>
            <span className="font-semibold text-blue-800">
              Nuevo presupuesto
            </span>
            <span className="text-xs text-blue-700">
              Crear registro para un vehículo
            </span>
          </Link>

          {/* Historial */}
          <Link
            href="/historial"
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition p-6 text-center"
          >
            <span className="text-4xl">📂</span>
            <span className="font-semibold text-gray-800">Historial</span>
            <span className="text-xs text-gray-600">
              Consultar presupuestos por placa
            </span>
          </Link>
        </section>

        <footer className="mt-8 text-center text-[11px] text-gray-400">
          Versión 1.0 · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  );
}
