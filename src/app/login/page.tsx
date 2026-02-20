"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const payload = {
      benutzername: String(form.get("benutzername") ?? "").trim(),
      passwort: String(form.get("passwort") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // ❗ Nur wenn Backend ok zurückgibt → weiterleiten
      if (res.ok && data.status === "ok") {
        router.push("/dashboard");
        return;
      }

      // Sonst Fehlermeldung anzeigen
      setError(data.message || "Login fehlgeschlagen.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Mitarbeiter Login</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Benutzername</label>
          <input
            name="benutzername"
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">Passwort</label>
          <input
            name="passwort"
            type="password"
            required
            className="w-full border rounded p-2"
          />
        </div>

        <button
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          type="submit"
        >
          {loading ? "Login..." : "Einloggen"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}
    </main>
  );
}
