"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, UserRound, Phone } from "@/components/ui/icons";
import { Logo } from "@/components/ui/Logo";

const DEMO_ACCOUNTS = [
  {
    label: "Super Admin",
    email: "superadmin@cafeflow.demo",
    password: "superadmin123",
  },
  {
    label: "Merchant",
    email: "merchant@cafeflow.demo",
    password: "merchant123",
  },
  { label: "Cashier", email: "cashier@cafeflow.demo", password: "cashier123" },
  { label: "Admin", email: "admin@cafeflow.demo", password: "admin123" },
  { label: "Customer", email: "fachri@privy.id", password: "customer123" },
];

const ROLE_HOME: Record<string, string> = {
  super_admin: "/admin",
  merchant: "/merchant/builder",
  admin: "/merchant/builder",
  cashier: "/pos",
  customer: "/",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// Only follow same-site paths ("/reservations"), never "https://elsewhere" or "//elsewhere".
function safeNext(raw: string | null): string | null {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register") {
      if (password.length < 8)
        return setError("Password must be at least 8 characters.");
      if (password !== confirm)
        return setError("The two passwords don't match.");
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "login"
              ? { email, password }
              : { fullName, email, whatsapp, password },
          ),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data.error?.message ??
            (mode === "login" ? "Login failed." : "Sign-up failed."),
        );
      router.push(
        safeNext(searchParams.get("next")) || ROLE_HOME[data.user.role] || "/",
      );
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : mode === "login"
            ? "Login failed."
            : "Sign-up failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-card ring-1 ring-ink-900/5">
        <div className="mb-6">
          <Logo size={56} />
        </div>

        <div className="mb-5 flex rounded-xl bg-ink-50 p-1" role="tablist">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={
                "flex-1 rounded-lg py-2 text-sm font-semibold transition " +
                (mode === m
                  ? "bg-surface text-ink-900 shadow-soft"
                  : "text-ink-400 hover:text-ink-600")
              }
            >
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <h1 className="mb-1 text-lg font-bold text-ink-900">
          {mode === "login" ? "Sign in" : "Create a customer account"}
        </h1>
        <p className="mb-5 text-sm text-ink-500">
          {mode === "login"
            ? "Customers and cafe staff sign in here. You don't need an account just to browse or reserve as a guest."
            : "With an account your reservations are saved in My reservations, where you can view and cancel them."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                <UserRound size={13} /> Full name
              </span>
              <input
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Bunga Larasati"
                className="w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
              <UserRound size={13} /> Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                <Phone size={13} /> WhatsApp number{" "}
                <span className="font-normal text-ink-400">(optional)</span>
              </span>
              <input
                type="tel"
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+62 812 3456 7890"
                className="w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
              <Lock size={13} /> Password{" "}
              {mode === "register" && (
                <span className="font-normal text-ink-400">
                  (min. 8 characters)
                </span>
              )}
            </span>
            <input
              type="password"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
            />
          </label>
          {mode === "register" && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink-600">
                <Lock size={13} /> Confirm password
              </span>
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-ink-100 px-3 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none"
              />
            </label>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-capacity-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-center text-xs text-ink-500">
            New here?{" "}
            <button
              type="button"
              onClick={() => switchMode("register")}
              className="font-semibold text-brand-600 hover:underline"
            >
              Create a customer account
            </button>
          </p>
        )}
        {mode === "register" && (
          <p className="mt-4 text-center text-xs text-ink-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-semibold text-brand-600 hover:underline"
            >
              Sign in
            </button>
          </p>
        )}

        {mode === "login" && (
          <div className="mt-5 border-t border-dashed border-ink-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
              Demo accounts
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                  }}
                  className="rounded-lg border border-ink-100 px-2 py-1.5 text-xs font-semibold text-ink-600 hover:border-brand-300 hover:text-brand-600"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/"
          className="mt-5 block text-center text-xs font-semibold text-ink-400 hover:text-ink-600"
        >
          ← Back to Tame&apos;out
        </Link>
      </div>
    </main>
  );
}
