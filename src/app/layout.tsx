// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./components/TopNav";

export const metadata: Metadata = {
  title: "FestGo Bar",
  description: "Panel de gestión FestGo Bar",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          background: "#020617",
          color: "#e5e7eb",
        }}
      >
        <TopNav />
        <div>{children}</div>
      </body>
    </html>
  );
}
