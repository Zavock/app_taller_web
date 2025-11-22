"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  nombre: string;
  cantidad: number;
  precio: number;
};

export default function NuevoPresupuestoPage() {
  const [datos, setDatos] = useState({
    placa: "",
    marca: "",
    modelo: "",
    propietario: "",
    kilometraje: "",
    vin: "",
    descripcion: "",
    observaciones: "",
  });

  const [repuestos, setRepuestos] = useState<Item[]>([
    { nombre: "", cantidad: 1, precio: 0 },
  ]);
  const [servicios, setServicios] = useState<Item[]>([
    { nombre: "", cantidad: 1, precio: 0 },
  ]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const subtotalRepuestos = repuestos.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio || 0),
    0
  );
  const subtotalServicios = servicios.reduce(
    (acc, it) => acc + (it.cantidad || 0) * (it.precio || 0),
    0
  );
  const total = subtotalRepuestos + subtotalServicios;

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
    const nuevo = { nombre: "", cantidad: 1, precio: 0 };
    if (tipo === "repuesto") setRepuestos([...repuestos, nuevo]);
    else setServicios([...servicios, nuevo]);
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
      // aquí si quieres puedes limpiar el formulario
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold mb-2">Nuevo presupuesto</h1>

      {mensaje && (
        <div className="p-2 rounded bg-blue-100 text-blue-800 text-sm">
          {mensaje}
        </div>
      )}

      {/* Datos del vehículo */}
      <section className="grid gap-2 md:grid-cols-2">
        <input
          className="border rounded px-3 py-2"
          placeholder="Placa *"
          value={datos.placa}
          onChange={(e) =>
            setDatos({ ...datos, placa: e.target.value.toUpperCase() })
          }
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Propietario *"
          value={datos.propietario}
          onChange={(e) =>
            setDatos({ ...datos, propietario: e.target.value })
          }
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Marca"
          value={datos.marca}
          onChange={(e) => setDatos({ ...datos, marca: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Modelo"
          value={datos.modelo}
          onChange={(e) => setDatos({ ...datos, modelo: e.target.value })}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Kilometraje"
          value={datos.kilometraje}
          onChange={(e) =>
            setDatos({ ...datos, kilometraje: e.target.value })
          }
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="VIN"
          value={datos.vin}
          onChange={(e) => setDatos({ ...datos, vin: e.target.value })}
        />
      </section>

      {/* Descripción y observaciones */}
      <section className="space-y-2">
        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={3}
          placeholder="Descripción del trabajo / diagnóstico"
          value={datos.descripcion}
          onChange={(e) =>
            setDatos({ ...datos, descripcion: e.target.value })
          }
        />
        <textarea
          className="border rounded px-3 py-2 w-full"
          rows={3}
          placeholder="Observaciones"
          value={datos.observaciones}
          onChange={(e) =>
            setDatos({ ...datos, observaciones: e.target.value })
          }
        />
      </section>

      {/* Repuestos */}
      <section>
        <h2 className="font-semibold mb-2">Repuestos</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Nombre</th>
              <th className="border px-2 py-1 w-24">Cant.</th>
              <th className="border px-2 py-1 w-32">Precio (COP)</th>
            </tr>
          </thead>
          <tbody>
            {repuestos.map((it, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-1 py-0.5"
                    value={it.nombre}
                    onChange={(e) =>
                      actualizarItem("repuesto", idx, "nombre", e.target.value)
                    }
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-1 py-0.5"
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
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-1 py-0.5"
                    value={it.precio}
                    onChange={(e) =>
                      actualizarItem("repuesto", idx, "precio", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="mt-2 text-sm text-blue-600"
          onClick={() => agregarItem("repuesto")}
        >
          + Agregar repuesto
        </button>
      </section>

      {/* Servicios */}
      <section>
        <h2 className="font-semibold mb-2">Servicios</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Nombre</th>
              <th className="border px-2 py-1 w-24">Cant.</th>
              <th className="border px-2 py-1 w-32">Precio (COP)</th>
            </tr>
          </thead>
          <tbody>
            {servicios.map((it, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  <input
                    className="w-full border rounded px-1 py-0.5"
                    value={it.nombre}
                    onChange={(e) =>
                      actualizarItem("servicio", idx, "nombre", e.target.value)
                    }
                  />
                </td>
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-1 py-0.5"
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
                <td className="border px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    className="w-full border rounded px-1 py-0.5"
                    value={it.precio}
                    onChange={(e) =>
                      actualizarItem("servicio", idx, "precio", e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="mt-2 text-sm text-blue-600"
          onClick={() => agregarItem("servicio")}
        >
          + Agregar servicio
        </button>
      </section>

      {/* Totales */}
      <section className="text-right space-y-1">
        <div>
          Subtotal repuestos:{" "}
          {subtotalRepuestos.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
          })}
        </div>
        <div>
          Subtotal servicios:{" "}
          {subtotalServicios.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
          })}
        </div>
        <div className="font-semibold">
          Total:{" "}
          {total.toLocaleString("es-CO", {
            style: "currency",
            currency: "COP",
          })}
        </div>
      </section>

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="w-full md:w-auto px-6 py-2 rounded bg-blue-600 text-white font-semibold disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar presupuesto"}
      </button>
    </div>
  );
}
