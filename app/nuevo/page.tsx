"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Car, FileText, Package, Wrench, Trash2 } from "lucide-react";

type Item = {
  nombre: string;
  cantidad: number;
  precio: number;
};

const initialDatos = {
  placa: "",
  marca: "",
  modelo: "",
  propietario: "",
  kilometraje: "",
  vin: "",
  descripcion: "",
  observaciones: "",
};

const createEmptyItem = (): Item => ({
  nombre: "",
  cantidad: 1,
  precio: 0,
});

export default function NuevoPresupuestoPage() {
  const [datos, setDatos] = useState(initialDatos);
  const [repuestos, setRepuestos] = useState<Item[]>([createEmptyItem()]);
  const [servicios, setServicios] = useState<Item[]>([createEmptyItem()]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [datosBloqueados, setDatosBloqueados] = useState(false);

  const subtotalRepuestos = repuestos.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio || 0),
    0
  );
  const subtotalServicios = servicios.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio || 0),
    0
  );
  const total = subtotalRepuestos + subtotalServicios;

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed";
  const labelClass = "text-xs font-semibold text-gray-600 uppercase";
  const sectionCardClass =
    "bg-white rounded-2xl border border-gray-100 p-4 md:p-5";

  function actualizarItem(
    tipo: "repuesto" | "servicio",
    index: number,
    campo: keyof Item,
    valor: any
  ) {
    const lista = tipo === "repuesto" ? [...repuestos] : [...servicios];
    // @ts-ignore
    lista[index][campo] =
      campo === "nombre" ? valor : Number(valor) || 0;

    if (tipo === "repuesto") setRepuestos(lista);
    else setServicios(lista);
  }

  function agregarItem(tipo: "repuesto" | "servicio") {
    const nuevo = createEmptyItem();
    if (tipo === "repuesto") setRepuestos((prev) => [...prev, nuevo]);
    else setServicios((prev) => [...prev, nuevo]);
  }

  function eliminarItem(tipo: "repuesto" | "servicio", index: number) {
    if (tipo === "repuesto") {
      setRepuestos((prev) => prev.filter((_, i) => i !== index));
    } else {
      setServicios((prev) => prev.filter((_, i) => i !== index));
    }
  }

  async function buscarVehiculoPorPlaca(placaInput?: string) {
    const placaLimpia = (placaInput ?? datos.placa).trim().toUpperCase();
    if (!placaLimpia) return;

    try {
      setMensaje(null);

      const { data, error } = await supabase
        .from("presupuestos")
        .select("marca, modelo, propietario, kilometraje, vin")
        .eq("placa", placaLimpia)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        const kmSoloNumeros = data.kilometraje
          ? String(data.kilometraje).replace(/\D/g, "")
          : "";

        setDatos((prev) => ({
          ...prev,
          placa: placaLimpia,
          propietario: data.propietario ?? prev.propietario,
          marca: data.marca ?? prev.marca,
          modelo: data.modelo ?? prev.modelo,
          vin: data.vin ?? prev.vin,
          kilometraje: kmSoloNumeros || prev.kilometraje,
        }));

        setDatosBloqueados(true);
        setMensaje(`Se cargó información previa para la placa ${placaLimpia}.`);
      } else {
        setDatosBloqueados(false);
        setMensaje(
          `No se encontró información previa para la placa ${placaLimpia}.`
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleGuardar() {
    try {
      setGuardando(true);
      setMensaje(null);

      if (!datos.placa || !datos.propietario) {
        setMensaje("Placa y propietario son obligatorios.");
        return;
      }

      const { data: presupuesto, error } = await supabase
        .from("presupuestos")
        .insert({
          placa: datos.placa.toUpperCase(),
          marca: datos.marca,
          modelo: datos.modelo,
          propietario: datos.propietario,
          kilometraje: datos.kilometraje,
          vin: datos.vin,
          descripcion: datos.descripcion,
          observaciones: datos.observaciones,
          subtotal_repuestos: subtotalRepuestos,
          subtotal_servicios: subtotalServicios,
          total,
        })
        .select()
        .single();

      if (error || !presupuesto) {
        console.error(error);
        setMensaje("Error guardando el presupuesto.");
        return;
      }

      const itemsInsert: any[] = [];

      repuestos
        .filter((it) => it.nombre.trim() !== "")
        .forEach((it) =>
          itemsInsert.push({
            presupuesto_id: presupuesto.id,
            tipo: "repuesto",
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio_unitario: it.precio,
            total: it.cantidad * it.precio,
          })
        );

      servicios
        .filter((it) => it.nombre.trim() !== "")
        .forEach((it) =>
          itemsInsert.push({
            presupuesto_id: presupuesto.id,
            tipo: "servicio",
            nombre: it.nombre,
            cantidad: it.cantidad,
            precio_unitario: it.precio,
            total: it.cantidad * it.precio,
          })
        );

      if (itemsInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("items_presupuesto")
          .insert(itemsInsert);
        if (itemsError) {
          console.error(itemsError);
          setMensaje(
            "Presupuesto creado, pero hubo error al guardar ítems."
          );
          return;
        }
      }

      setMensaje(`Presupuesto #${presupuesto.numero} guardado correctamente.`);

      // limpiar
      setDatos(initialDatos);
      setRepuestos([createEmptyItem()]);
      setServicios([createEmptyItem()]);
      setDatosBloqueados(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center px-3 py-6 md:py-10">
      <div className="w-full max-w-4xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center md:flex-row md:items-center md:gap-3">
            <img
              src="/logo-taller.svg"
              alt="Motoren Haus"
              className="h-12 md:h-14 w-auto mb-1 md:mb-0"
            />
            <div className="text-center md:text-left text-xs md:text-sm text-gray-500">
              <div className="font-semibold text-gray-700 text-sm md:text-base">
                Taller de Vehículos
              </div>
            </div>
          </div>

          <div className="text-center md:text-right text-xs md:text-sm text-gray-500">
            <div className="font-semibold text-gray-600">
              Nuevo presupuesto
            </div>
            <div>Registra los datos del vehículo y servicios</div>
          </div>
        </header>

        {mensaje && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">
            {mensaje}
          </div>
        )}

        {/* Datos del vehículo */}
        <section className={sectionCardClass}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <Car className="h-4 w-4" />
            </span>
            Datos del vehículo
          </h2>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Placa *</label>
              <input
                className={inputClass}
                placeholder="ABC123"
                value={datos.placa}
                onChange={(e) =>
                  setDatos({
                    ...datos,
                    placa: e.target.value.toUpperCase(),
                  })
                }
                onBlur={() => buscarVehiculoPorPlaca()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    buscarVehiculoPorPlaca(e.currentTarget.value);
                  }
                }}
                disabled={datosBloqueados}
              />
            </div>
            <div>
              <label className={labelClass}>Propietario *</label>
              <input
                className={inputClass}
                placeholder="Nombre del propietario"
                value={datos.propietario}
                onChange={(e) =>
                  setDatos({ ...datos, propietario: e.target.value })
                }
                disabled={datosBloqueados}
              />
            </div>
            <div>
              <label className={labelClass}>Marca</label>
              <input
                className={inputClass}
                placeholder="Toyota, Chevrolet..."
                value={datos.marca}
                onChange={(e) =>
                  setDatos({ ...datos, marca: e.target.value })
                }
                disabled={datosBloqueados}
              />
            </div>
            <div>
              <label className={labelClass}>Modelo</label>
              <input
                className={inputClass}
                placeholder="Corolla, Spark..."
                value={datos.modelo}
                onChange={(e) =>
                  setDatos({ ...datos, modelo: e.target.value })
                }
                disabled={datosBloqueados}
              />
            </div>
            <div>
              <label className={labelClass}>Kilometraje (solo enteros)</label>
              <input
                type="number"
                inputMode="numeric"
                step={1}
                className={inputClass}
                placeholder="85000"
                value={datos.kilometraje}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+$/.test(value)) {
                    setDatos({ ...datos, kilometraje: value });
                  }
                }}
              />
            </div>
            <div>
              <label className={labelClass}>VIN</label>
              <input
                className={inputClass}
                placeholder="Número de chasis"
                value={datos.vin}
                onChange={(e) =>
                  setDatos({ ...datos, vin: e.target.value })
                }
                disabled={datosBloqueados}
              />
            </div>
          </div>
        </section>

        {/* Detalles del trabajo */}
        <section className={sectionCardClass}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
              <FileText className="h-4 w-4" />
            </span>
            Detalles del trabajo
          </h2>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>Descripción / diagnóstico</label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Describe el problema o el trabajo a realizar..."
                value={datos.descripcion}
                onChange={(e) =>
                  setDatos({ ...datos, descripcion: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea
                className={`${inputClass} min-h-[60px] resize-y`}
                placeholder="Notas adicionales para el cliente o el taller..."
                value={datos.observaciones}
                onChange={(e) =>
                  setDatos({ ...datos, observaciones: e.target.value })
                }
              />
            </div>
          </div>
        </section>

        {/* Repuestos */}
        <section className={sectionCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-600">
                <Package className="h-4 w-4" />
              </span>
              Repuestos
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:text-brand/80 whitespace-nowrap"
              onClick={() => agregarItem("repuesto")}
            >
              + Agregar repuesto
            </button>
          </div>

          {/* 📱 Móvil: tarjetas */}
          <div className="space-y-3 md:hidden">
            {repuestos.map((it, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2"
              >
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    className={inputClass}
                    placeholder="Ej: Llanta, aceite..."
                    value={it.nombre}
                    onChange={(e) =>
                      actualizarItem("repuesto", idx, "nombre", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Cant.</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizarItem(
                          "repuesto",
                          idx,
                          "cantidad",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Precio (COP)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={it.precio}
                      onChange={(e) =>
                        actualizarItem("repuesto", idx, "precio", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => eliminarItem("repuesto", idx)}
                    aria-label="Eliminar repuesto"
                    title="Eliminar repuesto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🖥️ Desktop / tablet: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1 text-left">
                    Nombre
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-center w-16">
                    Cant.
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-right w-24">
                    Precio (COP)
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-center w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {repuestos.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        className={`${inputClass} h-7 text-xs`}
                        value={it.nombre}
                        placeholder="Ej: Llanta, aceite..."
                        onChange={(e) =>
                          actualizarItem(
                            "repuesto",
                            idx,
                            "nombre",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} h-7 text-xs text-center`}
                        value={it.cantidad}
                        onChange={(e) =>
                          actualizarItem(
                            "repuesto",
                            idx,
                            "cantidad",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} h-7 text-xs text-right`}
                        value={it.precio}
                        onChange={(e) =>
                          actualizarItem(
                            "repuesto",
                            idx,
                            "precio",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1 text-center">
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => eliminarItem("repuesto", idx)}
                        aria-label="Eliminar repuesto"
                        title="Eliminar repuesto"
                      >
                        <Trash2 className="h-4 w-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-right text-xs text-gray-600">
            Subtotal repuestos:{" "}
            <span className="font-semibold text-gray-800">
              {subtotalRepuestos.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
              })}
            </span>
          </div>
        </section>

        {/* Servicios */}
        <section className={sectionCardClass}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                <Wrench className="h-4 w-4" />
              </span>
              Servicios
            </h2>
            <button
              type="button"
              className="text-xs font-medium text-brand hover:text-brand/80 whitespace-nowrap"
              onClick={() => agregarItem("servicio")}
            >
              + Agregar servicio
            </button>
          </div>

          {/* 📱 Móvil: tarjetas */}
          <div className="space-y-3 md:hidden">
            {servicios.map((it, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 space-y-2"
              >
                <div>
                  <label className={labelClass}>Servicio</label>
                  <input
                    className={inputClass}
                    placeholder="Ej: Cambio de aceite..."
                    value={it.nombre}
                    onChange={(e) =>
                      actualizarItem("servicio", idx, "nombre", e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Cant.</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={it.cantidad}
                      onChange={(e) =>
                        actualizarItem(
                          "servicio",
                          idx,
                          "cantidad",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Precio (COP)</label>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={it.precio}
                      onChange={(e) =>
                        actualizarItem("servicio", idx, "precio", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => eliminarItem("servicio", idx)}
                    aria-label="Eliminar servicio"
                    title="Eliminar servicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 🖥️ Desktop / tablet: tabla */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1 text-left">
                    Servicio
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-center w-16">
                    Cant.
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-right w-24">
                    Precio (COP)
                  </th>
                  <th className="border border-gray-200 px-2 py-1 text-center w-20">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((it, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        className={`${inputClass} h-7 text-xs`}
                        value={it.nombre}
                        placeholder="Ej: Cambio de aceite..."
                        onChange={(e) =>
                          actualizarItem(
                            "servicio",
                            idx,
                            "nombre",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} h-7 text-xs text-center`}
                        value={it.cantidad}
                        onChange={(e) =>
                          actualizarItem(
                            "servicio",
                            idx,
                            "cantidad",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="number"
                        min={0}
                        className={`${inputClass} h-7 text-xs text-right`}
                        value={it.precio}
                        onChange={(e) =>
                          actualizarItem(
                            "servicio",
                            idx,
                            "precio",
                            e.target.value
                          )
                        }
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1 text-center">
                      <button
                        type="button"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => eliminarItem("servicio", idx)}
                        aria-label="Eliminar servicio"
                        title="Eliminar servicio"
                      >
                        <Trash2 className="h-4 w-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-right text-xs text-gray-600">
            Subtotal servicios:{" "}
            <span className="font-semibold text-gray-800">
              {subtotalServicios.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
              })}
            </span>
          </div>
        </section>

        {/* Totales + botones */}
        <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 text-sm text-right md:text-left">
            <div className="text-gray-600 text-xs">
              Subtotal repuestos:{" "}
              <span className="font-semibold text-gray-800">
                {subtotalRepuestos.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                })}
              </span>
            </div>
            <div className="text-gray-600 text-xs">
              Subtotal servicios:{" "}
              <span className="font-semibold text-gray-800">
                {subtotalServicios.toLocaleString("es-CO", {
                  style: "currency",
                  currency: "COP",
                })}
              </span>
            </div>
            <div className="mt-1 text-sm font-bold text-gray-900">
              Total:{" "}
              {total.toLocaleString("es-CO", {
                style: "currency",
                currency: "COP",
              })}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand/90 disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar presupuesto"}
            </button>

            <Link
              href="/"
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver al inicio
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
