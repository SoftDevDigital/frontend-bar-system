export default function CustomerProfilePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "720px" }}>
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Mi perfil</h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Próximamente vas a poder ver y editar tus datos, preferencias y
            historial de reservas.
          </p>
        </header>

        <section
          style={{
            background: "#020617",
            borderRadius: "0.9rem",
            border: "1px solid #1f2937",
            padding: "1.25rem",
          }}
        >
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Esta sección está en construcción. Por ahora podés usar el menú
            superior para navegar al <strong>Menú</strong> o hacer una{" "}
            <strong>Reserva</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
