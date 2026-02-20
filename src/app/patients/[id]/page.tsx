import Link from "next/link";
import { headers } from "next/headers";

type Patient = {
  idPatient: number;
  stammdatenAusgefüllt: number;
  expositionAusgefüllt: number;
  followUpAusgefüllt: number;
};

type Stammdaten = {
  idStammdaten: number;
  aufnahmedatum: string;
  studienzentrum: string | null;
  geburtsdatum: string | null;
  groesse: number | null;
  gewicht: number | null;
  Mitarbeiter_idMitarbeiter: number;
  Patient_idPatient: number;
};

type Exposition = {
  idExpositionserhebung: number;
  datumErhebung: string;
  geraucht: string | null;
  sorteRauchen: string | null;
  alterBeginn: number | null;
  rauchenEnde: number | null;
  anzahlZigTag: number | null;
  oftAlkohol: string | null;
  grammAlkohol: number | null;
  gesundBedenken: string | null;
  Mitarbeiter_idMitarbeiter: number;
  Patient_idPatient: number;
};

type FollowUp = {
  idFollowUp: number;
  datumErhebung: string;
  infarkt: string | null;
  verstorben: string | null;
  datumInfarkt: string | null;
  Mitarbeiter_idMitarbeiter: number;
  Patient_idPatient: number;
};

type PatientDetailOk = {
  status: "ok";
  patient: Patient;
  stammdaten: Stammdaten | null;
  exposition: Exposition | null;
  followups: FollowUp[];
};

type PatientDetailErr = { status: "error"; message: string };

type PatientDetailResponse = PatientDetailOk | PatientDetailErr;

async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

async function getPatient(id: string): Promise<PatientDetailResponse> {
  const base = await getBaseUrl();
  const res = await fetch(`${base}/api/patients/${id}`, { cache: "no-store" });
  return (await res.json()) as PatientDetailResponse;
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id) {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Fehler: Keine Patient-ID in der URL.
        </div>
        <div className="mt-6">
          <Link href="/dashboard" className="underline">
            zurück zum Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const data = await getPatient(id);

  if (data.status !== "ok") {
    return (
      <main className="max-w-4xl mx-auto p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          Fehler: {data.message}
        </div>
        <div className="mt-6">
          <Link href="/dashboard" className="underline">
            zurück zum Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { patient, stammdaten, exposition, followups } = data;

  return (
    <main className="max-w-4xl mx-auto p-8 space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Patient #{patient.idPatient}</h1>
        <Link href="/dashboard" className="text-sm underline">
          zurück zum Dashboard
        </Link>
      </div>

      {/* Q1 Stammdaten */}
      <section className="border rounded p-6 space-y-4 bg-white">
        <h2 className="text-xl font-semibold">Fragebogen 1 – Stammdaten</h2>

        {stammdaten ? (
          <div className="space-y-1">
            <p>Aufnahmedatum: {stammdaten.aufnahmedatum}</p>
            <p>Studienzentrum: {stammdaten.studienzentrum ?? "-"}</p>
            <p>Geburtsdatum: {stammdaten.geburtsdatum ?? "-"}</p>
            <p>Größe: {stammdaten.groesse ?? "-"}</p>
            <p>Gewicht: {stammdaten.gewicht ?? "-"}</p>
          </div>
        ) : (
          <p className="text-gray-600">Noch nicht ausgefüllt.</p>
        )}

        {!stammdaten && (
          <Link
            href={`/questionnaires/q1?patientId=${patient.idPatient}`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Q1 ausfüllen
          </Link>
        )}
      </section>

      {/* Q2 Exposition */}
      <section className="border rounded p-6 space-y-4 bg-white">
        <h2 className="text-xl font-semibold">Fragebogen 2 – Exposition</h2>

        {exposition ? (
          <div className="space-y-1">
            <p>Datum: {exposition.datumErhebung}</p>
            <p>Geraucht: {exposition.geraucht ?? "-"}</p>
            <p>Sorte: {exposition.sorteRauchen ?? "-"}</p>
            <p>Alter Beginn: {exposition.alterBeginn ?? "-"}</p>
            <p>Rauchen Ende: {exposition.rauchenEnde ?? "-"}</p>
            <p>Zigaretten/Tag: {exposition.anzahlZigTag ?? "-"}</p>
            <p>Alkohol: {exposition.oftAlkohol ?? "-"}</p>
            <p>Gramm/Tag: {exposition.grammAlkohol ?? "-"}</p>
            <p>Gesund. Bedenken: {exposition.gesundBedenken ?? "-"}</p>
          </div>
        ) : (
          <p className="text-gray-600">Noch nicht ausgefüllt.</p>
        )}

        {!exposition && (
          <Link
            href={`/questionnaires/q2?patientId=${patient.idPatient}`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Q2 ausfüllen
          </Link>
        )}
      </section>

      {/* Q3 FollowUps */}
      <section className="border rounded p-6 space-y-4 bg-white">
        <h2 className="text-xl font-semibold">Fragebogen 3 – FollowUp</h2>

        {followups.length === 0 ? (
          <p className="text-gray-600">Noch keine FollowUps vorhanden.</p>
        ) : (
          <div className="space-y-4">
            {followups.map((f) => (
              <div key={f.idFollowUp} className="border rounded p-4 bg-gray-50">
                <p>Datum: {f.datumErhebung}</p>
                <p>Infarkt: {f.infarkt ?? "-"}</p>
                <p>Verstorben: {f.verstorben ?? "-"}</p>
                <p>Infarktdatum: {f.datumInfarkt ?? "-"}</p>
              </div>
            ))}
          </div>
        )}

        <Link
          href={`/questionnaires/q3?patientId=${patient.idPatient}`}
          className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Neues FollowUp anlegen
        </Link>
      </section>
    </main>
  );
}
