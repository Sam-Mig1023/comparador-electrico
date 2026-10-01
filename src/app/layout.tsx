import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "CompraSmart — Plataforma Inteligente de Evaluación Multicriterio",
  description:
    "Solución empresarial para comparar y evaluar productos eléctricos con modelos predictivos de precios, logística regional, garantías y reputación de proveedores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-slate-900 bg-[#f8faff] relative selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
