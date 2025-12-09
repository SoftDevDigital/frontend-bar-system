// src/app/page.tsx
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Bienvenido</h1>
          <p className={styles.subtitle}>
            Gestioná tus barras, ventas y reportes desde un único panel.
          </p>

          <div className={styles.actions}>
            <Link
              href="/login"
              className={`${styles.button} ${styles.primaryButton}`}
            >
              Iniciar sesión
            </Link>

            <Link
              href="/register"
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Registrarme
            </Link>
          </div>

          <p className={styles.helperText}>
            Accedé con tu usuario de <strong>admin</strong> o{" "}
            <strong>cliente</strong>.
          </p>
        </div>
      </main>
    </div>
  );
}
