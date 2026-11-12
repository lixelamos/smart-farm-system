"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Brand } from "./brand";
import { api } from "@/lib/client";
import { roles, counties, type Role } from "@/lib/domain";
export function AuthForm({
  mode,
  initialRole = "farmer",
}: {
  mode: "login" | "register" | "reset";
  initialRole?: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [show, setShow] = useState(false);
  const [token, setToken] = useState("");
  const router = useRouter();
  useEffect(() => {
    if (mode === "reset") {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const recovery =
        params.get("token") ||
        new URLSearchParams(window.location.search).get("token") ||
        "";
      if (recovery) {
        queueMicrotask(() => setToken(recovery));
        window.history.replaceState(null, "", "/reset-password");
      }
    }
  }, [mode]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (mode === "login") {
        await api("login", { ...data, role });
        router.push("/workspace");
        router.refresh();
      } else if (mode === "register") {
        const result = await api<{ message: string }>("register", data);
        setSuccess(result.message);
      } else {
        const result = await api<{ message: string }>("reset", {
          ...data,
          token,
        });
        setSuccess(result.message);
        setToken("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <header className="public-header container">
        <Brand />
        <Link className="text-link" href="/">
          ← Back to home
        </Link>
      </header>
      <main className="auth-layout container">
        <section className="auth-story">
          <p className="eyebrow">
            NAROK COUNTY ·{" "}
            {mode === "register"
              ? "FARMER REGISTRATION"
              : mode === "reset"
                ? "ACCOUNT RECOVERY"
                : "ACCOUNT ACCESS"}
          </p>
          <h1>
            Your farm.
            <br />
            Your Narok community.
          </h1>
          <p>
            Manage your farm records, connect with an agronomist, and follow
            opportunities in your county.
          </p>
          <Image
            unoptimized
            src="/images/field-map.svg"
            width={640}
            height={450}
            alt="Narok-inspired highland fields"
          />
        </section>
        <section className="auth-panel">
          <div className="auth-panel-top">
            <span className="section-number">
              {mode === "register"
                ? "JOIN THE COMMUNITY"
                : mode === "reset"
                  ? "RECOVER YOUR ACCOUNT"
                  : "WELCOME BACK"}
            </span>
            <span className="role-tag">
              {mode === "register"
                ? "Farmer"
                : mode === "reset"
                  ? "Secure recovery"
                  : role}
            </span>
          </div>
          <h2>
            {mode === "register"
              ? "Join your farming community."
              : mode === "reset"
                ? "Reset your password."
                : "Sign in to your workspace."}
          </h2>
          {mode === "login" && (
            <div className="role-tabs" aria-label="Account role">
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={role === r ? "active" : ""}
                  aria-pressed={role === r}
                  onClick={() => {
                    setRole(r);
                    setError("");
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          {error && (
            <p className="feedback error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="feedback success" role="status">
              {success}
            </p>
          )}
          {mode === "reset" && !token && !success ? (
            <div className="recovery-guidance">
              <p>
                Ask your system administrator for a private recovery link. It
                expires after 30 minutes and works once.
              </p>
              <p>
                The imported accounts don’t have verified email addresses, so we
                can’t send an automatic reset email.
              </p>
              <Link className="button button-outline" href="/login">
                Return to sign in
              </Link>
            </div>
          ) : (
            !success && (
              <form onSubmit={submit} aria-busy={busy}>
                {mode === "register" ? (
                  <>
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      name="name"
                      autoComplete="name"
                      required
                      maxLength={255}
                    />
                    <label htmlFor="phone">Phone number</label>
                    <input
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="0712345678"
                    />
                    <label htmlFor="idno">National ID number</label>
                    <input
                      id="idno"
                      name="idno"
                      inputMode="numeric"
                      required
                      pattern="[0-9]+"
                    />
                    <label htmlFor="location">Sub-county</label>
                    <select
                      id="location"
                      name="location"
                      required
                      defaultValue=""
                    >
                      <option disabled value="">
                        Select your sub-county
                      </option>
                      {counties.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </>
                ) : mode === "login" ? (
                  <>
                    <label htmlFor="identifier">
                      {role === "admin" || role === "manager"
                        ? "Username"
                        : "Phone number"}
                    </label>
                    <input
                      id="identifier"
                      name="identifier"
                      autoComplete="username"
                      type={
                        role === "farmer" || role === "agronomist"
                          ? "tel"
                          : "text"
                      }
                      required
                    />
                  </>
                ) : null}
                <label htmlFor="password">
                  {mode === "reset" ? "New password" : "Password"}
                </label>
                <div className="password-field">
                  <input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "login" ? 1 : 12}
                  />
                  <button
                    className="password-toggle"
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-pressed={show}
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
                {mode !== "login" && (
                  <p className="form-hint">
                    Use a passphrase with at least 12 characters.
                  </p>
                )}
                {mode === "reset" && (
                  <>
                    <label htmlFor="confirmation">Confirm new password</label>
                    <input
                      id="confirmation"
                      name="confirmation"
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      required
                    />
                  </>
                )}
                <button
                  className="button button-primary auth-submit"
                  disabled={busy}
                >
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in →"
                      : mode === "register"
                        ? "Create farmer account →"
                        : "Save new password →"}
                </button>
              </form>
            )
          )}
          {mode === "login" ? (
            <>
              <p className="auth-register">
                <Link href="/reset-password">Forgot your password?</Link>
              </p>
              <p className="auth-register">
                New here? <Link href="/register">Create a farmer account</Link>
              </p>
            </>
          ) : (
            <p className="auth-register">
              <Link href="/login">Return to sign in</Link>
            </p>
          )}
        </section>
      </main>
      <footer className="simple-footer container">
        <span>Smart Farm · Narok County</span>
        <span>Agriculture, rooted in Narok.</span>
      </footer>
    </div>
  );
}
