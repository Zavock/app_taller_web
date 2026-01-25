"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Logo from "@/components/Logo";
import {
  Car,
  FileText,
  Package,
  Wrench,
  Trash2,
  Save,
  Plus,
} from "lucide-react";

type PresupuestoDB = {
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

type ItemDB = {
  id: string;
  tipo: "repuesto" | "servicio";
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
};

type ItemForm = {
  nombre: string;
  cantidad: number | "";
  precio: number | "";
};

const createEmptyItem = (): ItemForm => ({
  nombre: "",
  cantidad: "",
  precio: "",
});

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function EditarPresupuestoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = React.use(params);

  const [cargando, setCargando] = React.useState(true);
  const [guardando, setGuardando] = React.useState(false);
  const [mensaje, setMensaje] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const [presupuesto, setPresupuesto] = React.useState<PresupuestoDB | null>(
    null
  );

  // Form principal
  const [datos, setDatos] = React.useState({
    placa: "",
    marca: "",
    modelo: "",
    propietario: "",
    kilometraje: "",
    vin: "",
    descripcion: "",
    observaciones: "",
  });

  const [repuestos, setRepuestos] = React.useState<ItemForm[]>([
    createEmptyItem(),
  ]);
  const [servicios, setServicios] = React.useState<ItemForm[]>([
    createEmptyItem(),
  ]);

  const inputClass =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white";
  const labelClass = "text-xs font-semibold text-gray-600 uppercase";
  const sectionCardClass =
    "bg-white rounded-2xl border border-gray-100 p-4 md:p-5";

  // Totales (en vivo)
  const subtotalRepuestos = repuestos.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
    0
  );

  const subtotalServicios = servicios.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0) * (Number(it.precio) || 0),
    0
  );

  const total = subtotalRepuestos + subtotalServicios;

  // Cargar datos iniciales
  React.useEffect(() => {
    async function cargar() {
      setCargando(true);
      setError(null);
      setMensaje(null);

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
        setError("Error cargando los ítems del presupuesto.");
        setCargando(false);
        return;
      }

      const presupuestoDB = p as PresupuestoDB;
      setPresupuesto(presupuestoDB);

      // cargar datos en form
      setDatos({
        placa: presupuestoDB.placa ?? "",
        marca: presupuestoDB.marca ?? "",
        modelo: presupuestoDB.modelo ?? "",
        propietario: presupuestoDB.propietario ?? "",
        kilometraje: presupuestoDB.kilometraje
          ? onlyDigits(String(presupuestoDB.kilometraje))
          : "",
        vin: presupuestoDB.vin ?? "",
        descripcion: presupuestoDB.descripcion ?? "",
        observaciones: presupuestoDB.observaciones ?? "",
      });

      const allItems = (itemsData || []) as ItemDB[];

      const rep = allItems
        .filter((it) => it.tipo === "repuesto")
        .map((it) => ({
          nombre: it.nombre ?? "",
          cantidad: it.cantidad ?? "",
          precio: it.precio_unitario ?? "",
        }));

      const serv = allItems
        .filter((it) => it.tipo === "servicio")
        .map((it) => ({
          nombre: it.nombre ?? "",
          cantidad: it.cantidad ?? "",
          precio: it.precio_unitario ?? "",
        }));

      setRepuestos(rep.length > 0 ? rep : [createEmptyItem()]);
      setServicios(serv.length > 0 ? serv : [createEmptyItem()]);

      setCargando(false);
    }

    cargar();
  }, [id]);

  function actualizarItem(
    tipo: "repuesto" | "servicio",
    index: number,
    campo: keyof ItemForm,
    valor: any
  ) {
    const lista = tipo === "repuesto" ? [...repuestos] : [...servicios];

    if (campo === "nombre") {
      lista[index].nombre = valor;
    } else {
      // cantidad / precio: permitir vacío
      if (valor === "") {
        // @ts-ignore
        lista[index][campo] = "";
      } else {
        // @ts-ignore
        lista[index][campo] = Number(valor);
      }
    }

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

  async function handleGuardarCambios() {
    if (!presupuesto) return;

    try {
      setGuardando(true);
      setMensaje(null);
      setError(null);

      if (!datos.placa.trim() || !datos.propietario.trim()) {
        setMensaje("Placa y propietario son obligatorios.");
        return;
      }

      // ✅ 1) Actualizar presupuesto
      const { error: errUpdate } = await supabase
        .from("presupuestos")
        .update({
          placa: datos.placa.trim().toUpperCase(),
          marca: datos.marca.trim() || null,
          modelo: datos.modelo.trim() || null,
          propietario: datos.propietario.trim(),
          kilometraje: datos.kilometraje ? onlyDigits(datos.kilometraje) : null,
          vin: datos.vin.trim() || null,
          descripcion: datos.descripcion.trim() || null,
          observaciones: datos.observaciones.trim() || null,
          subtotal_repuestos: subtotalRepuestos,
          subtotal_servicios: subtotalServicios,
          total,
        })
        .eq("id", presupuesto.id);

      if (errUpdate) {
        console.error(errUpdate);
        setError("No se pudieron guardar los cambios del presupuesto.");
        return;
      }

      // ✅ 2) Reemplazar items (borrar y volver a insertar)
      const { error: errDeleteItems } = await supabase
        .from("items_presupuesto")
        .delete()
        .eq("presupuesto_id", presupuesto.id);

      if (errDeleteItems) {
        console.error(errDeleteItems);
        setError("Se guardó el presupuesto, pero falló al actualizar los ítems.");
        return;
      }

      const itemsInsert: any[] = [];

      repuestos
        .filter((it) => it.nombre.trim() !== "")
        .forEach((it) => {
          const cantidad = Number(it.cantidad) || 0;
          const precio = Number(it.precio) || 0;

          itemsInsert.push({
            presupuesto_id: presupuesto.id,
            tipo: "repuesto",
            nombre: it.nombre.trim(),
            cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
          });
        });

      servicios
        .filter((it) => it.nombre.trim() !== "")
        .forEach((it) => {
          const cantidad = Number(it.cantidad) || 0;
          const precio = Number(it.precio) || 0;

          itemsInsert.push({
            presupuesto_id: presupuesto.id,
            tipo: "servicio",
            nombre: it.nombre.trim(),
            cantidad,
            precio_unitario: precio,
            total: cantidad * precio,
          });
        });

      if (itemsInsert.length > 0) {
        const { error: errInsertItems } = await supabase
          .from("items_presupuesto")
          .insert(itemsInsert);

        if (errInsertItems) {
          console.error(errInsertItems);
          setError(
            "Se guardó el presupuesto, pero falló al guardar los ítems."
          );
          return;
        }
      }

      // ✅ Redirigir al historial (sin botón abajo)
      router.push("/historial?updated=1");
      router.refresh();
    } finally {
      setGuardando(false);
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

  return (
    <main className="min-h-screen bg-gray-100 flex justify-center px-3 py-6 md:py-10">
      <div className="w-full max-w-4xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col items-center md:flex-row md:items-center md:gap-3">
            <Logo className="text-2xl md:text-3xl" />
            <div className="text-center md:text-left">
              <h1 className="text-xl md:text-2xl font-bold text-brand">
                Editar presupuesto #{presupuesto.numero}
              </h1>
              <p className="text-xs text-gray-500">
                Modifica cualquier dato y guarda los cambios.
              </p>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Link
              href="/historial"
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Volver al historial
            </Link>
          </div>
        </header>

        {mensaje && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs text-blue-800">
            {mensaje}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
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
                  setDatos({ ...datos, placa: e.target.value.toUpperCase() })
                }
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
              />
            </div>

            <div>
              <label className={labelClass}>Marca</label>
              <input
                className={inputClass}
                placeholder="Toyota, Chevrolet..."
                value={datos.marca}
                onChange={(e) => setDatos({ ...datos, marca: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Modelo</label>
              <input
                className={inputClass}
                placeholder="2010, 2012..."
                value={datos.modelo}
                onChange={(e) => setDatos({ ...datos, modelo: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Kilometraje</label>
              <input
                inputMode="numeric"
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
                onChange={(e) => setDatos({ ...datos, vin: e.target.value })}
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
              className="inline-flex items-center gap-2 text-xs font-medium text-brand hover:text-brand/80 whitespace-nowrap"
              onClick={() => agregarItem("repuesto")}
            >
              <Plus className="h-4 w-4" />
              Agregar repuesto
            </button>
          </div>

          {/* Móvil */}
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
                        actualizarItem("repuesto", idx, "cantidad", e.target.value)
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

          {/* Desktop */}
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
                          actualizarItem("repuesto", idx, "nombre", e.target.value)
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
                          actualizarItem("repuesto", idx, "precio", e.target.value)
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
              className="inline-flex items-center gap-2 text-xs font-medium text-brand hover:text-brand/80 whitespace-nowrap"
              onClick={() => agregarItem("servicio")}
            >
              <Plus className="h-4 w-4" />
              Agregar servicio
            </button>
          </div>

          {/* Móvil */}
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
                        actualizarItem("servicio", idx, "cantidad", e.target.value)
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

          {/* Desktop */}
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
                          actualizarItem("servicio", idx, "nombre", e.target.value)
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
                          actualizarItem("servicio", idx, "precio", e.target.value)
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

        {/* Totales + Guardar */}
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

          {/* ✅ Solo botón Guardar */}
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <button
              onClick={handleGuardarCambios}
              disabled={guardando}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow hover:bg-brand/90 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
