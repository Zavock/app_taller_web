"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  async function buscar() {
    setCargando(true);

    // Consulta base
    const baseQuery = supabase
      .from("presupuestos")
      .select("id, numero, fecha, propietario, placa, total")
      .order("fecha", { ascending: false })
      .limit(50);

    // Si hay texto en placa, filtramos; si no, traemos últimos 50
    const finalQuery =
      placa.trim() === ""
        ? baseQuery
        : baseQuery.ilike("placa", `%${placa.trim()}%`);

    const { data, error } = await finalQuery;

    if (error) {
      console.error("Error cargando historial:", error);
    }

    if (!error && data) {
      setResultados(data as Presupuesto[]);
    }
    setCargando(false);
  }

  useEffect(() => {
    // Al entrar a la página, cargamos últimos presupuestos
    buscar();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Historial de presupuestos</h1>

      {/* Buscador por placa */}
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Buscar por placa (ej: ABC123)"
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
        />
        <button
          onClick={buscar}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold"
        >
          {cargando ? "Buscando..." : "Buscar"}
        </button>
      </div>

      {/* Tabla de resultados */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">N°</th>
            <th className="border px-2 py-1">Fecha</th>
            <th className="border px-2 py-1">Propietario</th>
            <th className="border px-2 py-1">Placa</th>
            <th className="border px-2 py-1">Total (COP)</th>
            <th className="border px-2 py-1">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {resultados.map((p) => (
            <tr key={p.id}>
              <td className="border px-2 py-1 text-center">{p.numero}</td>
              <td className="border px-2 py-1">
                {new Date(p.fecha).toLocaleDateString("es-CO")}
              </td>
              <td className="border px-2 py-1">{p.propietario}</td>
              <td className="border px-2 py-1 text-center">{p.placa}</td>
              <td className="border px-2 py-1 text-right">
                {Number(p.total).toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                })}
              </td>
              <td className="border px-2 py-1 text-center">
                <Link
                  href={`/presupuestos/${p.id}`}
                  className="text-blue-600 text-xs underline"
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
                className="border px-2 py-4 text-center text-gray-500"
              >
                No hay presupuestos para mostrar.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
