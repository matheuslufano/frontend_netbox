"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa6";
import { IoArrowForward } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { fazerLogin, getApiErrorMessage } from "@/lib/api";
import logo from "../../../public/logo.jpg";
import styles from "./login.module.css";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await fazerLogin({
        email,
        password,
      });

      localStorage.setItem("afiliados_netbox_token", data.token);

      localStorage.setItem("afiliados_netbox_user", JSON.stringify(data.user));

      router.push("/dashboard");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível fazer login."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="login-title">
        <div className={styles.brand}>
          <Image
            src={logo}
            alt="Afiliados Netbox"
            className={styles.logo}
            priority
          />

          <div>
            <span className={styles.eyebrow}>Afiliados Netbox</span>
            <h1 id="login-title">Entrar na sua conta</h1>
            <p>
              Acesse o painel para acompanhar afiliados, links e relatórios.
            </p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>E-mail</span>
            <div className={styles.inputGroup}>
              <FaEnvelope aria-hidden="true" />
              <input
                type="email"
                name="email"
                placeholder="seuemail@netbox.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>

          <label className={styles.field}>
            <span>Senha</span>
            <div className={styles.inputGroup}>
              <FaLock aria-hidden="true" />
              <input
                type="password"
                name="password"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </label>

          <div className={styles.options}>
            <label className={styles.remember}>
              <input type="checkbox" name="remember" />
              <span>Lembrar acesso</span>
            </label>

            <Link href="/configuracoes">Esqueci minha senha</Link>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? "Entrando..." : "Entrar"}
            <IoArrowForward aria-hidden="true" />
          </button>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </section>
    </main>
  );
}
