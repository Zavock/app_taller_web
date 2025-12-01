"use client";

import * as React from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type Presupuesto = {
  id: string;
  numero: number;
  fecha: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
  propietario: string;
  kilometraje: string | null;
  vin: string | null;
  descripcion: string | null;
  observaciones: string | null;
  subtotal_repuestos: number;
  subtotal_servicios: number;
  total: number;
};

type Item = {
  id: string;
  tipo: "repuesto" | "servicio";
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
};

function formatFechaISO(fecha: string | null | undefined) {
  if (!fecha) return "-";
  const [year, month, day] = fecha.split("-"); // "2025-12-01"
  return `${day}/${month}/${year}`;           // "01/12/2025"
}

export default function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15: params es Promise
  const { id } = React.use(params);

  const [presupuesto, setPresupuesto] = React.useState<Presupuesto | null>(
    null
  );
  const [items, setItems] = React.useState<Item[]>([]);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = React.useState(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    async function cargarDatos() {
      setCargando(true);
      setError(null);

      const { data: p, error: errP } = await supabase
        .from("presupuestos")
        .select("*")
        .eq("id", id)
        .single();

      if (errP || !p) {
        console.error(errP);
        setError("No se encontró el presupuesto.");
        setCargando(false);
        return;
      }

      const { data: itemsData, error: errItems } = await supabase
        .from("items_presupuesto")
        .select("*")
        .eq("presupuesto_id", id)
        .order("tipo", { ascending: true });

      if (errItems) {
        console.error(errItems);
        setError("Error cargando los ítems.");
        setCargando(false);
        return;
      }

      setPresupuesto(p as Presupuesto);
      setItems((itemsData || []) as Item[]);
      setCargando(false);
    }

    cargarDatos();
  }, [id]);

  function formatKilometraje(value: number | string | null | undefined) {
    if (value === null || value === undefined || value === "") return "-";
    return Number(value).toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  async function handleGenerarPdf() {
    if (!contentRef.current || !presupuesto) return;

    try {
      setGenerandoPdf(true);

      const original = contentRef.current;

      // 🔁 Clonamos el contenido para el PDF
      const cloned = original.cloneNode(true) as HTMLElement;
      cloned.style.width = "794px"; // ancho fijo A4
      cloned.style.padding = "24px";
      cloned.style.background = "#ffffff";
      cloned.style.position = "fixed";
      cloned.style.left = "-10000px"; // lo escondemos fuera de pantalla
      cloned.style.top = "0";
      cloned.style.zIndex = "-1";

      document.body.appendChild(cloned);

      // Capturamos el CLON, no el original
      const canvas = await html2canvas(cloned, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(cloned);

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`presupuesto-${presupuesto.numero}.pdf`);
    } finally {
      setGenerandoPdf(false);
    }
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-gray-600">Cargando presupuesto...</div>
      </main>
    );
  }

  if (error || !presupuesto) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-sm text-red-600">
          {error || "Ocurrió un error inesperado."}
        </div>
      </main>
    );
  }

  const repuestos = items.filter((it) => it.tipo === "repuesto");
  const servicios = items.filter((it) => it.tipo === "servicio");

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center px-3 py-6 md:py-8">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header fuera del PDF */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">
              Presupuesto{" "}
              <span className="text-brand">#{presupuesto.numero}</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleGenerarPdf}
              disabled={generandoPdf}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold disabled:opacity-60 hover:bg-brand/90"
            >
              {generandoPdf ? "Generando PDF..." : "Descargar PDF"}
            </button>

            <Link
              href="/historial"
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
            >
              Volver al historial
            </Link>
          </div>
        </header>

        {/* Tarjeta que contiene el contenido a capturar */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <div
            ref={contentRef}
            className="mx-auto w-full max-w-[794px] bg-white text-xs sm:text-sm text-[#111827]"
          >
            {/* Encabezado con logo alineado con el texto de la derecha */}
            <header className="mb-4">
              <div className="flex items-center justify-between gap-4">
                {/* Logo */}
                <div className="flex items-center">
                  <img
                    src="/logo-taller.svg"
                    alt="Motoren Haus"
                    className="h-20 w-auto"
                  />
                </div>

                {/* Bloque "Presupuesto / Fecha / Km" */}
                <div className="text-right text-[10px] sm:text-xs text-[#6b7280]">
                  <div className="font-semibold text-[#111827]">Presupuesto</div>
                  <div>N° {presupuesto.numero}</div>
                  <div>
                    Fecha:{" "}
                    {formatFechaISO(presupuesto.fecha)}
                  </div>
                  {presupuesto.kilometraje && (
                    <div>
                      Kilometraje:{" "}
                      {formatKilometraje(presupuesto.kilometraje)}
                    </div>
                  )}
                </div>
              </div>
            </header>

            <hr className="my-2 border-[#e5e7eb]" />

            {/* Datos vehículo / propietario */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4 text-[11px] sm:text-xs mb-3">
              <div>
                <span className="font-semibold">Propietario: </span>
                {presupuesto.propietario}
              </div>
              <div>
                <span className="font-semibold">Placa: </span>
                {presupuesto.placa}
              </div>
              <div>
                <span className="font-semibold">Marca / Modelo: </span>
                {presupuesto.marca || "-"} {presupuesto.modelo || ""}
              </div>
              <div>
                <span className="font-semibold">Kilometraje: </span>
                {formatKilometraje(presupuesto.kilometraje)}
              </div>
              <div>
                <span className="font-semibold">VIN: </span>
                {presupuesto.vin || "-"}
              </div>
            </section>

            {/* Descripción */}
            {presupuesto.descripcion && (
              <section className="mb-3">
                <div className="font-semibold text-[11px] sm:text-xs mb-1">
                  Descripción / diagnóstico
                </div>
                <div className="border border-[#e5e7eb] rounded px-2 py-1 min-h-[40px] text-[11px] sm:text-xs whitespace-pre-wrap">
                  {presupuesto.descripcion}
                </div>
              </section>
            )}

            {/* Repuestos */}
            {repuestos.length > 0 && (
              <section className="mb-3">
                <div className="font-semibold text-[11px] sm:text-xs mb-1">
                  Repuestos
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px] sm:text-xs">
                    <thead>
                      <tr className="bg-[#e5f0ff]">
                        <th className="border border-[#e5e7eb] px-2 py-1 text-left">
                          Repuesto
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-center w-12">
                          Cant.
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-right w-24">
                          Precio
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-right w-28">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {repuestos.map((r) => (
                        <tr key={r.id}>
                          <td className="border border-[#e5e7eb] px-2 py-1">
                            {r.nombre}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-center">
                            {r.cantidad}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                            {Number(r.precio_unitario).toLocaleString("es-CO")}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                            {Number(r.total).toLocaleString("es-CO")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td
                          className="border border-[#e5e7eb] px-2 py-1"
                          colSpan={3}
                        >
                          Subtotal repuestos
                        </td>
                        <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                          {Number(
                            presupuesto.subtotal_repuestos
                          ).toLocaleString("es-CO")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Servicios */}
            {servicios.length > 0 && (
              <section className="mb-3">
                <div className="font-semibold text-[11px] sm:text-xs mb-1">
                  Servicios
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px] sm:text-xs">
                    <thead>
                      <tr className="bg-[#e5f0ff]">
                        <th className="border border-[#e5e7eb] px-2 py-1 text-left">
                          Servicio
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-center w-12">
                          Cant.
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-right w-24">
                          Precio
                        </th>
                        <th className="border border-[#e5e7eb] px-2 py-1 text-right w-28">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicios.map((s) => (
                        <tr key={s.id}>
                          <td className="border border-[#e5e7eb] px-2 py-1">
                            {s.nombre}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-center">
                            {s.cantidad}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                            {Number(
                              s.precio_unitario
                            ).toLocaleString("es-CO")}
                          </td>
                          <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                            {Number(s.total).toLocaleString("es-CO")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold">
                        <td
                          className="border border-[#e5e7eb] px-2 py-1"
                          colSpan={3}
                        >
                          Subtotal servicios
                        </td>
                        <td className="border border-[#e5e7eb] px-2 py-1 text-right">
                          {Number(
                            presupuesto.subtotal_servicios
                          ).toLocaleString("es-CO")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Observaciones + totales */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                {presupuesto.observaciones && (
                  <>
                    <div className="font-semibold text-[11px] sm:text-xs mb-1">
                      Observaciones
                    </div>
                    <div className="border border-[#e5e7eb] rounded px-2 py-1 min-h-[40px] text-[11px] sm:text-xs whitespace-pre-wrap">
                      {presupuesto.observaciones}
                    </div>
                  </>
                )}
              </div>
              <div className="text-right text-[11px] sm:text-xs space-y-1">
                <div>
                  Subtotal repuestos:{" "}
                  {Number(
                    presupuesto.subtotal_repuestos
                  ).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </div>
                <div>
                  Subtotal servicios:{" "}
                  {Number(
                    presupuesto.subtotal_servicios
                  ).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </div>
                <div className="font-bold text-sm sm:text-base mt-1">
                  Total:{" "}
                  {Number(presupuesto.total).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                  })}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
