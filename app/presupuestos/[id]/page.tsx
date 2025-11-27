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

export default function PresupuestoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15: params viene como Promise
  const { id } = React.use(params);

  const [presupuesto, setPresupuesto] = React.useState<Presupuesto | null>(
    null
  );
  const [items, setItems] = React.useState<Item[]>([]);
  const [cargando, setCargando] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [generandoPdf, setGenerandoPdf] = React.useState(false);

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

  async function handleGenerarPdf() {
    if (!contentRef.current || !presupuesto) return;

    try {
      setGenerandoPdf(true);

      const element = contentRef.current;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Ajustamos la imagen al ANCHO de la página, manteniendo proporción
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // La colocamos arriba; si el contenido no llena la altura,
      // queda un margen inferior (como cualquier factura corta).
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

      pdf.save(`presupuesto-${presupuesto.numero}.pdf`);
    } finally {
      setGenerandoPdf(false);
    }
  }


  if (cargando) {
    return (
      <div className="max-w-3xl mx-auto p-4">Cargando presupuesto...</div>
    );
  }

  if (error || !presupuesto) {
    return (
      <div className="max-w-3xl mx-auto p-4 text-red-600">
        {error || "Ocurrió un error inesperado."}
      </div>
    );
  }

  const repuestos = items.filter((it) => it.tipo === "repuesto");
  const servicios = items.filter((it) => it.tipo === "servicio");

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      {/* Encabezado superior fuera del PDF */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">
          Presupuesto #{presupuesto.numero}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={handleGenerarPdf}
            disabled={generandoPdf}
            className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold disabled:opacity-60"
          >
            {generandoPdf ? "Generando PDF..." : "Descargar PDF"}
          </button>

          <Link
            href="/historial"
            className="px-4 py-2 rounded border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Volver al historial
          </Link>
        </div>
      </div>

      {/* CONTENIDO QUE SE CONVIERTE A PDF */}
      <div
        ref={contentRef}
        className="bg-[#ffffff] p-6 text-sm text-[#111827] mx-auto"
        style={{
          width: "794px",       // ancho aproximado de A4 a 96dpi
          minHeight: "1000px",  // un poco menos que el alto completo
        }}
      >
        {/* Encabezado con logo y datos básicos */}
        <header className="flex justify-between items-start mb-3">
          <div className="flex flex-col">
            {/* Cambia el src si tu SVG se llama distinto */}
            <img
              src="/logo-taller.svg"
              alt="Motoren Haus"
              style={{ height: 90 }}
            />
          </div>

          <div className="text-right text-xs text-[#6b7280]">
            <div className="font-semibold text-[#111827]">Presupuesto</div>
            <div>N° {presupuesto.numero}</div>
            <div>
              Fecha:{" "}
              {new Date(presupuesto.fecha).toLocaleDateString("es-CO")}
            </div>
            {presupuesto.kilometraje && (
              <div>Kilometraje: {presupuesto.kilometraje}</div>
            )}
          </div>
        </header>

        <hr className="my-2 border-[#e5e7eb]" />

        {/* Datos vehículo / propietario */}
        <section className="grid grid-cols-2 gap-y-1 gap-x-4 text-xs mb-3">
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
            {presupuesto.kilometraje || "-"}
          </div>
          <div>
            <span className="font-semibold">VIN: </span>
            {presupuesto.vin || "-"}
          </div>
        </section>

        {/* Descripción */}
        {presupuesto.descripcion && (
          <section className="mb-3">
            <div className="font-semibold text-xs mb-1">
              Descripción / diagnóstico
            </div>
            <div className="border border-[#e5e7eb] rounded px-2 py-1 min-h-[40px] text-xs whitespace-pre-wrap">
              {presupuesto.descripcion}
            </div>
          </section>
        )}

        {/* Repuestos */}
        {repuestos.length > 0 && (
          <section className="mb-3">
            <div className="font-semibold text-xs mb-1">Repuestos</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#e5f0ff]">
                  <th className="border border-[#e5e7eb] px-2 py-1 text-left">
                    Repuesto
                  </th>
                  <th className="border border-[#e5e7eb] px-2 py-1 text-center w-16">
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
          </section>
        )}

        {/* Servicios */}
        {servicios.length > 0 && (
          <section className="mb-3">
            <div className="font-semibold text-xs mb-1">Servicios</div>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#e5f0ff]">
                  <th className="border border-[#e5e7eb] px-2 py-1 text-left">
                    Servicio
                  </th>
                  <th className="border border-[#e5e7eb] px-2 py-1 text-center w-16">
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
                      {Number(s.precio_unitario).toLocaleString("es-CO")}
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
          </section>
        )}

        {/* Observaciones + totales */}
        <section className="grid grid-cols-2 gap-4 mt-4">
          <div>
            {presupuesto.observaciones && (
              <>
                <div className="font-semibold text-xs mb-1">
                  Observaciones
                </div>
                <div className="border border-[#e5e7eb] rounded px-2 py-1 min-h-[40px] text-xs whitespace-pre-wrap">
                  {presupuesto.observaciones}
                </div>
              </>
            )}
          </div>
          <div className="text-right text-xs space-y-1">
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
            <div className="font-bold text-base mt-1">
              Total:{" "}
              {Number(presupuesto.total).toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
