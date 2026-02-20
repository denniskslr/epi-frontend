"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Patient = {
  idPatient: number;
  stammdatenAusgefüllt: number;
  expositionAusgefüllt: number;
  followUpAusgefüllt: number;
};

type StatsResponse =
  | { status: "ok"; patientsTotal: number; followUpsTotal: number }
  | { status: "error"; message: string };

export default function DashboardPage() {
  const router = useRouter();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsTotal, setPatientsTotal] = useState<number>(0);
  const [followUpsTotal, setFollowUpsTotal] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = async () => {
    const res = await fetch("/api/patients");
    const data = await res.json();

    if (!res.ok || data.status !== "ok" || !data.patients) {
      throw new Error(data.message || "Fehler beim Laden der Patienten.");
    }

    setPatients(data.patients);
  };

  const loadStats = async () => {
    const res = await fetch("/api/stats");
    const data = (await res.json()) as StatsResponse;

    if (!res.ok || data.status !== "ok") {
      const msg =
        data.status === "error" ? data.message : "Fehler beim Laden der Stats.";
      throw new Error(msg);
    }

    setPatientsTotal(data.patientsTotal);
    setFollowUpsTotal(data.followUpsTotal);
  };

  const loadAll = async () => {
    try {
      setError(null);
      await Promise.all([loadPatients(), loadStats()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreatePatient = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/patients", { method: "POST" });
      const data = await res.json();

      if (!res.ok || data.status !== "ok" || !data.patientId) {
        throw new Error(data.message || "Fehler beim Anlegen.");
      }

      await loadAll();
      router.push(`/patients/${data.patientId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setError(null);

      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-");

      // CSV Download
      const resCsv = await fetch("/api/export/csv");
      if (!resCsv.ok) throw new Error("CSV Export fehlgeschlagen.");
      const csvBlob = await resCsv.blob();
      downloadBlob(csvBlob, `export_${timestamp}.csv`);

      // TXT Download
      const resTxt = await fetch("/api/export/variables");
      if (!resTxt.ok) throw new Error("TXT Export fehlgeschlagen.");
      const txtBlob = await resTxt.blob();
      downloadBlob(txtBlob, `variablenbeschreibung_${timestamp}.txt`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unbekannter Fehler beim Export."
      );
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-8">
      <div className="flex justify-end mb-4">
        <button onClick={handleLogout} className="text-sm underline">
          Logout
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>

      <div className="text-gray-700 mb-6 space-y-1">
        <p>
          Gesamtanzahl Patienten:{" "}
          <span className="font-semibold">{patientsTotal}</span>
        </p>
        <p>
          Gesamtanzahl FollowUp-Fragebögen:{" "}
          <span className="font-semibold">{followUpsTotal}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={handleCreatePatient}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Erstelle Patient..." : "Neuen Patienten anlegen"}
        </button>

        <button
          onClick={handleExport}
          disabled={exportLoading}
          className="bg-gray-900 text-white px-6 py-2 rounded hover:bg-black disabled:opacity-50"
        >
          {exportLoading ? "Exportiert..." : "Export CSV"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 mb-6">
          {error}
        </div>
      )}

      <h2 className="text-lg font-semibold mb-3">Vorhandene Patienten</h2>

      {patients.length === 0 ? (
        <p className="text-gray-600">Noch keine Patienten vorhanden.</p>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => (
            <button
              key={p.idPatient}
              onClick={() => router.push(`/patients/${p.idPatient}`)}
              className="w-full text-left border rounded p-4 flex justify-between items-center hover:bg-gray-50"
            >
              <div>
                <div className="font-semibold">
                  Patient #{p.idPatient}
                </div>
                <div className="text-sm text-gray-600 space-x-3 mt-1">
                  <Status label="Q1" done={p.stammdatenAusgefüllt === 1} />
                  <Status label="Q2" done={p.expositionAusgefüllt === 1} />
                  <Status label="Q3" done={p.followUpAusgefüllt === 1} />
                </div>
              </div>

              <span className="text-sm underline">Öffnen</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function Status({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={`px-2 py-1 rounded text-xs ${
        done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}: {done ? "✓" : "–"}
    </span>
  );
}