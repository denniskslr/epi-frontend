"use client";

import React, { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type ApiOk = { status: "ok"; expositionId: number; patientId: number };
type ApiErr = { status: "error"; message: string };

function toNullIfEmpty(v: FormDataEntryValue | null): string | null {
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toNumberOrNull(v: FormDataEntryValue | null): number | null {
  const s = toNullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function Q2Page() {
  const router = useRouter();
  const sp = useSearchParams();

  const patientId = useMemo(() => {
    const raw = sp.get("patientId");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [sp]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Single-Choice
  const [geraucht, setGeraucht] = useState<"" | "nie" | "ehemalig">("");
  const [sorteRauchen, setSorteRauchen] = useState<"" | "Pfeife" | "Zigaretten">("");
  const [oftAlkohol, setOftAlkohol] = useState<"" | "nie" | "gelegentlich" | "täglich">("");
  const [gesundBedenken, setGesundBedenken] =
    useState<"" | "keine" | "unter bestimmten Voraussetzungen" | "ja">("");

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
      geraucht: geraucht || null,
      sorteRauchen: sorteRauchen || null,
      alterBeginn: toNumberOrNull(form.get("alterBeginn")),
      rauchenEnde: toNumberOrNull(form.get("rauchenEnde")),
      anzahlZigTag: toNumberOrNull(form.get("anzahlZigTag")),
      oftAlkohol: oftAlkohol || null,
      grammAlkohol: toNumberOrNull(form.get("grammAlkohol")),
      gesundBedenken: gesundBedenken || null,
    };

    // datumErhebung ist Pflicht
    if (!payload.datumErhebung) {
      setLoading(false);
      setMsg("datumErhebung ist Pflicht.");
      return;
    }

    try {
      const res = await fetch("/api/exposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiOk | ApiErr;

      if (!res.ok || data.status !== "ok") {
        setMsg("message" in data ? data.message : `HTTP ${res.status}`);
        return;
      }

      // Weiter zu Q3
      router.push(`/questionnaires/q3?patientId=${patientId}`);
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fragebogen 2 – Exposition</h1>

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
        {/* Kopf: Datum */}
        <div className="space-y-4 border rounded p-4">
          <div>
            <label className="block font-medium">Datum Erhebung</label>
            <input name="datumErhebung" type="date" required className="w-full border rounded p-2" />
          </div>
        </div>

        {/* Rauchen */}
        <div className="border rounded p-4 space-y-4">
          <p className="font-medium">Haben Sie schon einmal geraucht oder rauchen Sie zur Zeit?</p>

          <div className="flex flex-wrap gap-6">
            <CheckLike
              label="nie"
              checked={geraucht === "nie"}
              onClick={() => setGeraucht(geraucht === "nie" ? "" : "nie")}
            />
            <CheckLike
              label="ehemalig"
              checked={geraucht === "ehemalig"}
              onClick={() => setGeraucht(geraucht === "ehemalig" ? "" : "ehemalig")}
            />
          </div>

          <p className="font-semibold">Wenn ja: was rauchen Sie zur Zeit?</p>
          <div className="flex flex-wrap gap-6">
            <CheckLike
              label="Pfeife"
              checked={sorteRauchen === "Pfeife"}
              onClick={() => setSorteRauchen(sorteRauchen === "Pfeife" ? "" : "Pfeife")}
            />
            <CheckLike
              label="Zigaretten"
              checked={sorteRauchen === "Zigaretten"}
              onClick={() => setSorteRauchen(sorteRauchen === "Zigaretten" ? "" : "Zigaretten")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-medium">
                In welchem Alter wurde begonnen?
              </label>
              <div className="flex items-center gap-2">
                <input name="alterBeginn" type="number" min="0" className="w-full border rounded p-2" />
                <span className="whitespace-nowrap">Jahre</span>
              </div>
            </div>

            <div>
              <label className="block font-medium">
                Seit wann kein Raucher mehr?
              </label>
              <div className="flex items-center gap-2">
                <input name="rauchenEnde" type="number" min="0" className="w-full border rounded p-2" />
                <span className="whitespace-nowrap">Jahre</span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block font-medium">Wie viele Zigaretten pro Tag?</label>
              <div className="flex items-center gap-2">
                <input name="anzahlZigTag" type="number" min="0" className="w-full border rounded p-2" />
                <span className="whitespace-nowrap">Stück</span>
              </div>
            </div>
          </div>
        </div>

        {/* Alkohol */}
        <div className="border rounded p-4 space-y-4">
          <p className="font-medium">Wie oft trinken Sie derzeit Alkohol?</p>

          <div className="flex flex-wrap gap-6">
            <CheckLike
              label="nie"
              checked={oftAlkohol === "nie"}
              onClick={() => setOftAlkohol(oftAlkohol === "nie" ? "" : "nie")}
            />
            <CheckLike
              label="gelegentlich"
              checked={oftAlkohol === "gelegentlich"}
              onClick={() => setOftAlkohol(oftAlkohol === "gelegentlich" ? "" : "gelegentlich")}
            />
            <CheckLike
              label="täglich"
              checked={oftAlkohol === "täglich"}
              onClick={() => setOftAlkohol(oftAlkohol === "täglich" ? "" : "täglich")}
            />
          </div>

          <div>
            <label className="block font-medium">
              Wie viel Gramm ungefähr pro Tag?
            </label>
            <div className="flex items-center gap-2">
              <input name="grammAlkohol" type="number" min="0" className="w-full border rounded p-2" />
              <span className="whitespace-nowrap">g</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              (1 Bier 500ml ≈ 20g oder 1/4l Wein ≈ 20g)
            </p>
          </div>
        </div>

        {/* Gesundheit */}
        <div className="border rounded p-4 space-y-4">
          <p className="font-medium">Haben Sie gesundheitliche Bedenken?</p>

          <div className="flex flex-col gap-3">
            <CheckLike
              label="keine"
              checked={gesundBedenken === "keine"}
              onClick={() => setGesundBedenken(gesundBedenken === "keine" ? "" : "keine")}
            />
            <CheckLike
              label="unter bestimmten Voraussetzungen"
              checked={gesundBedenken === "unter bestimmten Voraussetzungen"}
              onClick={() =>
                setGesundBedenken(
                  gesundBedenken === "unter bestimmten Voraussetzungen"
                    ? ""
                    : "unter bestimmten Voraussetzungen"
                )
              }
            />
            <CheckLike
              label="ja"
              checked={gesundBedenken === "ja"}
              onClick={() => setGesundBedenken(gesundBedenken === "ja" ? "" : "ja")}
            />
          </div>
        </div>

        <button
          disabled={loading || !patientId}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          type="submit"
        >
          {loading ? "Speichert..." : "Speichern & weiter zu Q3"}
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
      <span>{label}</span>
    </button>
  );
}
