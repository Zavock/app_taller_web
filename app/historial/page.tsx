"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import ConfirmModal from "@/components/ConfirmModal";
import { FileText, Pencil, Trash2 } from "lucide-react";

type Presupuesto = {
  id: string;
  numero: number;
  fecha: string;
  propietario: string;
  placa: string;
  total: number;
};

function formatFechaISO(fecha: string | null | undefined) {
  if (!fecha) return "-";
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year}`;
}

export default function HistorialPage() {
  const [placa, setPlaca] = useState("");
  const [resultados, setResultados] = useState<Presupuesto[]>([]);
  const [cargando, setCargando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [hayMas, setHayMas] = useState(false);

  // ✅ Modal eliminar
  const [modalOpen, setModalOpen] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [presupuestoAEliminar, setPresupuestoAEliminar] = useState<{
    id: string;
    numero: number;
  } | null>(null);

  async function buscar(pagina = 0) {
    setCargando(true);
    setErrorMsg(null);

    const desde = pagina * PAGE_SIZE;
    const hasta = desde + PAGE_SIZE - 1;

    let query = supabase
      .from("presupuestos")
      .select("id, numero, fecha, propietario, placa, total", { count: "exact" })
      .order("fecha", { ascending: false })
      .range(desde, hasta);

    const placaLimpia = placa.trim().toUpperCase();
    if (placaLimpia !== "") {
      query = query.ilike("placa", `%${placaLimpia}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error(error);
      setResultados([]);
      setHayMas(false);
      setErrorMsg("Error consultando el historial.");
    } else if (data) {
      setResultados(data as Presupuesto[]);
      setPage(pagina);
      setHayMas(count !== null ? hasta + 1 < count : false);
    }

    setCargando(false);
  }

  async function eliminarPresupuesto(id: string) {
    try {
      setEliminando(true);
      setErrorMsg(null);

      // ✅ 1) borrar items primero
      const { error: errItems } = await supabase
        .from("items_presupuesto")
        .delete()
        .eq("presupuesto_id", id);

      if (errItems) {
        console.error(errItems);
        setErrorMsg("Error eliminando los ítems del presupuesto.");
        return;
      }

      // ✅ 2) borrar presupuesto
      const { error: errP } = await supabase
        .from("presupuestos")
        .delete()
        .eq("id", id);

      if (errP) {
        console.error(errP);
        setErrorMsg("Error eliminando el presupuesto.");
        return;
      }

      // ✅ refrescar página actual
      await buscar(page);
    } finally {
      setEliminando(false);
    }
  }

  useEffect(() => {
    buscar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center px-3 py-6">
      <div className="w-full max-w-4xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center md:flex-row md:items-center md:gap-3">
            {/* ✅ Logo nuevo */}
            <Logo className="text-2xl md:text-3xl" />

            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-brand">
                Historial de presupuestos
              </h1>
              <p className="text-xs text-gray-500">
                Consulta los presupuestos creados y filtra por placa.
              </p>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
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
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                placeholder="Buscar por placa (ej: ABC123)"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscar(0);
                  }
                }}
              />
            </div>

            <button
              onClick={() => buscar(0)}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-60"
              disabled={cargando}
            >
              {cargando ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {errorMsg && <p className="mt-2 text-xs text-red-600">{errorMsg}</p>}
        </section>

        {/* Resultados */}
        <section className="bg-white rounded-xl border border-gray-100 p-3 md:p-4 shadow-sm">
          {/* Vista móvil: tarjetas */}
          <div className="space-y-3 md:hidden">
            {resultados.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-sm"
                onClick={() => router.push(`/presupuestos/${p.id}`)}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-gray-500">
                    Presupuesto #{p.numero}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatFechaISO(p.fecha)}
                  </span>
                </div>

                <div className="text-sm font-medium text-gray-800">
                  {p.propietario}
                </div>

                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Placa: {p.placa}</span>
                  <span>
                    {Number(p.total).toLocaleString("es-CO", {
                      style: "currency",
                      currency: "COP",
                    })}
                  </span>
                </div>

                {/* ✅ Acciones móvil */}
                <div
                  className="mt-3 flex items-center justify-end gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/5"
                    onClick={() => router.push(`/presupuestos/${p.id}`)}
                    title="Ver / PDF"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Ver
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    onClick={() => router.push(`/presupuestos/${p.id}/editar`)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </button>

                  <button
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    title="Eliminar"
                    onClick={() => {
                      setPresupuestoAEliminar({ id: p.id, numero: p.numero });
                      setModalOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {resultados.length === 0 && !cargando && (
              <div className="text-center text-xs text-gray-500 py-4">
                No hay presupuestos para mostrar.
              </div>
            )}
          </div>

          {/* Vista escritorio/tablet: tabla */}
          <div className="hidden md:block overflow-x-auto">
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
                  <th className="border border-gray-200 px-2 py-2 text-center w-44">
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
                      {formatFechaISO(p.fecha)}
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

                    {/* Acciones escritorio */}
                    <td
                      className="border border-gray-200 px-2 py-2 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center items-center gap-2">
                        <Link
                          href={`/presupuestos/${p.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/5"
                          title="Ver / PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Link>

                        <Link
                          href={`/presupuestos/${p.id}/editar`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>

                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                          title="Eliminar"
                          onClick={() => {
                            setPresupuestoAEliminar({
                              id: p.id,
                              numero: p.numero,
                            });
                            setModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

          {/* Paginación */}
          <div className="mt-4 flex items-center justify-between text-xs md:text-sm">
            <button
              onClick={() => buscar(page - 1)}
              disabled={page === 0 || cargando}
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>

            <span className="text-gray-600">
              Página <span className="font-semibold">{page + 1}</span>
            </span>

            <button
              onClick={() => buscar(page + 1)}
              disabled={!hayMas || cargando}
              className="px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </section>
      </div>

      {/* Modal eliminar */}
      <ConfirmModal
        open={modalOpen}
        title={`Eliminar presupuesto #${presupuestoAEliminar?.numero ?? ""}`}
        description="Esta acción eliminará también los repuestos y servicios del presupuesto. No se puede deshacer."
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        loading={eliminando}
        danger
        onClose={() => {
          if (eliminando) return;
          setModalOpen(false);
          setPresupuestoAEliminar(null);
        }}
        onConfirm={async () => {
          if (!presupuestoAEliminar) return;
          await eliminarPresupuesto(presupuestoAEliminar.id);
          setModalOpen(false);
          setPresupuestoAEliminar(null);
        }}
      />
    </main>
  );
}
