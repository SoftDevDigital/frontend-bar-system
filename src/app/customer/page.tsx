import Link from "next/link";

export default function CustomerHomePage() {
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
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
        }}
      >
        {/* Encabezado */}
        <header
          style={{
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <h1 style={{ fontSize: "1.6rem", fontWeight: 600 }}>
            Bienvenido a FestGo Bar
          </h1>
          <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
            Desde aquí podés ver el menú, hacer reservas y gestionar tu perfil.
          </p>
        </header>

        {/* Acciones principales */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Menú */}
          <Link
            href="/products"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background:
                  "radial-gradient(circle at top left, #1d283a, #020617)",
                borderRadius: "0.9rem",
                border: "1px solid #1f2937",
                padding: "1rem",
                cursor: "pointer",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Ver Menú
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                Explorá la carta de tragos, comidas y promociones disponibles.
              </p>
            </div>
          </Link>

          {/* Reservar */}
          <Link
            href="/reservations/new"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background:
                  "radial-gradient(circle at top left, #172554, #020617)",
                borderRadius: "0.9rem",
                border: "1px solid #1f2937",
                padding: "1rem",
                cursor: "pointer",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Hacer una reserva
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                Elegí día, horario y cantidad de personas para tu próxima visita.
              </p>
            </div>
          </Link>

          {/* Perfil */}
          <Link
            href="/customer/profile"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div
              style={{
                background: "#020617",
                borderRadius: "0.9rem",
                border: "1px solid #1f2937",
                padding: "1rem",
                cursor: "pointer",
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  marginBottom: "0.25rem",
                }}
              >
                Mi perfil
              </h2>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                Actualizá tus datos y preferencias para futuras reservas.
              </p>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
