"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiOk = { status: "ok"; followUpId: number; patientId: number };
type ApiErr = { status: "error"; message: string };

function toNullIfEmpty(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

export default function Q3Page() {
  const router = useRouter();
  const sp = useSearchParams();

  const patientId = useMemo(() => {
    const raw = sp.get("patientId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [sp]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [infarkt, setInfarkt] = useState<"" | "ja" | "nein">("");
  const [verstorben, setVerstorben] = useState<"" | "ja" | "nein">("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!patientId) {
      setMsg("Fehler: patientId fehlt in der URL. Bitte über das Dashboard starten.");
      return;
    }

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    setMsg(null);
    setLoading(true);

    const payload = {
      patientId,
      datumErhebung: toNullIfEmpty(form.get("datumErhebung")),
      infarkt: infarkt || null,
      verstorben: verstorben || null,
      datumInfarkt: toNullIfEmpty(form.get("datumInfarkt")),
    };

    if (!payload.datumErhebung) {
      setLoading(false);
      setMsg("datumErhebung ist Pflicht.");
      return;
    }

    // UI-Regel: datumInfarkt nur wenn infarkt=ja
    if (payload.infarkt !== "ja") {
      payload.datumInfarkt = null;
    }

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiOk | ApiErr;

      if (!res.ok || data.status !== "ok") {
        setMsg("message" in data ? data.message : `HTTP ${res.status}`);
        return;
      }

      // Fertig -> zurück Dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fragebogen 3 – FollowUp</h1>

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
          <p className="text-red-700">Bitte im Dashboard einen Patienten anlegen.</p>
        </div>
      )}

      <div className="mb-4 text-sm text-gray-600">
        Aktueller Patient: <span className="font-semibold">{patientId ?? "-"}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4 border rounded p-4">
          <div>
            <label className="block font-medium">Datum Erhebung</label>
            <input name="datumErhebung" type="date" required className="w-full border rounded p-2" />
          </div>
        </div>

        <div className="border rounded p-4 space-y-6">
          <div className="flex items-center justify-between gap-6">
            <div className="text-lg font-medium">Infarkt</div>
            <div className="flex gap-8">
              <CheckLike
                label="ja"
                checked={infarkt === "ja"}
                onClick={() => setInfarkt(infarkt === "ja" ? "" : "ja")}
              />
              <CheckLike
                label="nein"
                checked={infarkt === "nein"}
                onClick={() => setInfarkt(infarkt === "nein" ? "" : "nein")}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="text-lg font-medium">Verstorben</div>
            <div className="flex gap-8">
              <CheckLike
                label="ja"
                checked={verstorben === "ja"}
                onClick={() => setVerstorben(verstorben === "ja" ? "" : "ja")}
              />
              <CheckLike
                label="nein"
                checked={verstorben === "nein"}
                onClick={() => setVerstorben(verstorben === "nein" ? "" : "nein")}
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block font-medium">wenn ja: Infarktdatum</label>
            <input
              name="datumInfarkt"
              type="date"
              required={infarkt === "ja"}
              disabled={infarkt !== "ja"}
              className="w-full border rounded p-2 disabled:opacity-50"
            />
            {infarkt !== "ja" && (
              <p className="text-sm text-gray-600 mt-1">Aktiviert nur, wenn Infarkt = ja.</p>
            )}
          </div>
        </div>

        <button
          disabled={loading || !patientId}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          type="submit"
        >
          {loading ? "Speichert..." : "Speichern & fertig"}
        </button>
      </form>

      {msg && <div className="mt-6 p-4 bg-gray-100 rounded">{msg}</div>}
    </main>
  );
}

function CheckLike({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 select-none">
      <span className="inline-flex h-5 w-5 items-center justify-center border rounded border-black">
        {checked ? "✓" : ""}
      </span>
      <span className="text-base">{label}</span>
    </button>
  );
}
