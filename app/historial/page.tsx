"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Presupuesto = {
  id: string;
  numero: number;
  fecha: string;
  propietario: string;
  placa: string;
  total: number;
};

export default function HistorialPage() {
  const [placa, setPlaca] = useState("");
  const [resultados, setResultados] = useState<Presupuesto[]>([]);
  const [cargando, setCargando] = useState(false);
  const router = useRouter();

  async function buscar() {
    setCargando(true);

    let query = supabase
      .from("presupuestos")
      .select("id, numero, fecha, propietario, placa, total")
      .order("fecha", { ascending: false })
      .limit(50);

    if (placa.trim() !== "") {
      query = query.ilike("placa", `%${placa.trim()}%`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setResultados(data as Presupuesto[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    buscar();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center px-4 py-8">
      <div className="w-full max-w-5xl space-y-5">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo-taller.svg"
              alt="Motoren Haus"
              className="h-20"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Historial de presupuestos
              </h1>
              <p className="text-xs text-gray-500">
                Consulta los presupuestos creados y filtra por placa.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver al inicio
            </Link>
          </div>
        </header>

        {/* Buscador */}
        <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="flex-1">
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Buscar por placa (ej: ABC123)"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscar();
                  }
                }}
              />
            </div>
            <button
              onClick={buscar}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={cargando}
            >
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </section>

        {/* Tabla de resultados */}
        <section className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-700">
                  <th className="border border-gray-200 px-2 py-2 text-center w-16">
                    N°
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-left">
                    Fecha
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-left">
                    Propietario
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center">
                    Placa
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-right">
                    Total (COP)
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center w-28">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {resultados.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/presupuestos/${p.id}`)}
                  >
                    <td className="border border-gray-200 px-2 py-2 text-center">
                      {p.numero}
                    </td>
                    <td className="border border-gray-200 px-2 py-2">
                      {new Date(p.fecha).toLocaleDateString("es-CO")}
                    </td>
                    <td className="border border-gray-200 px-2 py-2">
                      {p.propietario}
                    </td>
                    <td className="border border-gray-200 px-2 py-2 text-center">
                      {p.placa}
                    </td>
                    <td className="border border-gray-200 px-2 py-2 text-right">
                      {Number(p.total).toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                      })}
                    </td>
                    <td
                      className="border border-gray-200 px-2 py-2 text-center"
                      onClick={(e) => e.stopPropagation()} // para que no dispare el click de la fila
                    >
                      <Link
                        href={`/presupuestos/${p.id}`}
                        className="inline-flex items-center justify-center rounded-lg border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                      >
                        Ver / PDF
                      </Link>
                    </td>
                  </tr>
                ))}

                {resultados.length === 0 && !cargando && (
                  <tr>
                    <td
                      colSpan={6}
                      className="border border-gray-200 px-2 py-6 text-center text-gray-500"
                    >
                      No hay presupuestos para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
