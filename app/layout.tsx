import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotorenHaus",
  description: "Presupuestos y servicios del taller",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      {/* 👇 aquí quitamos bg-black / text-white y dejamos claro */}
      <body className="min-h-screen bg-gray-100 text-gray-900">
        {children}
      </body>
    </html>
  );
}
