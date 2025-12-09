// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import TopNav from "./components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FestGo Bar",
  description: "Panel de gestión FestGo Bar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        style={{
          margin: 0,
          background: "#020617",
          color: "#e5e7eb",
        }}
      >
        {/* NAVBAR GLOBAL (solo acá) */}
        <TopNav />

        {/* Contenido de cada página */}
        <div>{children}</div>
      </body>
    </html>
  );
}
