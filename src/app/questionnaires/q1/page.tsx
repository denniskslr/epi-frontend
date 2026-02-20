"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Q1Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const patientId = useMemo(() => {
    const raw = searchParams.get("patientId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [searchParams]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!patientId) {
      setMsg("Fehler: patientId fehlt in der URL. Bitte Patient zuerst anlegen.");
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const groesseRaw = form.get("groesse");
    const gewichtRaw = form.get("gewicht");

    const groesse = Number(groesseRaw);
    const gewicht = Number(gewichtRaw);

    // ✅ harte Validierung: muss Zahl sein
    if (!Number.isFinite(groesse)) {
      setMsg("Bitte eine gültige Größe (Zahl) eingeben.");
      return;
    }
    if (!Number.isFinite(gewicht)) {
      setMsg("Bitte ein gültiges Gewicht (Zahl) eingeben.");
      return;
    }

    // ✅ Warnung + Bestätigung, aber NICHT blockieren
    const warnings: string[] = [];
    if (groesse < 100 || groesse > 250) {
      warnings.push(
        `Größe (${groesse} cm) liegt außerhalb des empfohlenen Bereichs (100–250 cm).`
      );
    }
    if (gewicht < 50 || gewicht > 200) {
      warnings.push(
        `Gewicht (${gewicht} kg) liegt außerhalb des empfohlenen Bereichs (50–200 kg).`
      );
    }

    if (warnings.length > 0) {
      const confirmed = window.confirm(
        warnings.join("\n") + "\n\nMöchtest du diese Werte wirklich speichern?"
      );
      if (!confirmed) return;
    }

    setMsg(null);
    setLoading(true);

    const payload = {
      patientId,
      aufnahmedatum: form.get("aufnahmedatum"),
      studienzentrum: form.get("studienzentrum"),
      geburtsdatum: form.get("geburtsdatum"),
      groesse,
      gewicht,
    };

    try {
      const res = await fetch("/api/stammdaten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const message =
          typeof data === "object" && data !== null && "message" in data
            ? String((data as { message: unknown }).message)
            : "Fehler beim Speichern";
        setMsg(message);
        return;
      }

      router.push(`/questionnaires/q2?patientId=${patientId}`);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fragebogen 1 – Stammdaten</h1>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm underline"
        >
          zurück zum Dashboard
        </button>
      </div>

      {!patientId && (
        <div className="p-4 rounded bg-red-50 border border-red-200 mb-6">
          <p className="font-medium text-red-700">patientId fehlt/ungültig.</p>
          <p className="text-red-700">
            Bitte im Dashboard zuerst „Neuen Patienten anlegen“ klicken.
          </p>
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600">
        Aktueller Patient:{" "}
        <span className="font-semibold">{patientId ?? "-"}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block font-medium">aufnahmedatum</label>
          <input
            type="date"
            name="aufnahmedatum"
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">studienzentrum</label>
          <input
            type="text"
            name="studienzentrum"
            required
            maxLength={45}
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">geburtsdatum</label>
          <input
            type="date"
            name="geburtsdatum"
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block font-medium">groesse (cm)</label>
          <input
            type="number"
            name="groesse"
            required
            className="w-full border rounded p-2"
            placeholder="z.B. 180"
          />
          <p className="text-sm text-gray-500 mt-1">
            Empfohlen: 100 – 250 cm (außerhalb möglich mit Bestätigung)
          </p>
        </div>

        <div>
          <label className="block font-medium">gewicht (kg)</label>
          <input
            type="number"
            name="gewicht"
            required
            className="w-full border rounded p-2"
            placeholder="z.B. 80"
          />
          <p className="text-sm text-gray-500 mt-1">
            Empfohlen: 50 – 200 kg (außerhalb möglich mit Bestätigung)
          </p>
        </div>

        <button
          disabled={loading || !patientId}
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Speichert..." : "Speichern & weiter zu Q2"}
        </button>
      </form>

      {msg && <div className="mt-6 p-4 bg-gray-100 rounded">{msg}</div>}
    </main>
  );
}