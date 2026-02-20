import { db } from "../../../../lib/db";
import type { RowDataPacket } from "mysql2/promise";

type PatientRow = RowDataPacket & {
  idPatient: number;
  stammdatenAusgefüllt: number;
  expositionAusgefüllt: number;
  followUpAusgefüllt: number;
};

type StammdatenRow = RowDataPacket & {
  idStammdaten: number;
  aufnahmedatum: string;
  studienzentrum: string | null;
  geburtsdatum: string | null;
  groesse: number | null;
  gewicht: number | null;
  Mitarbeiter_idMitarbeiter: number;
  Patient_idPatient: number;
};

type ExpositionRow = RowDataPacket & {
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

type FollowUpRow = RowDataPacket & {
  idFollowUp: number;
  datumErhebung: string;
  infarkt: string | null;
  verstorben: string | null;
  datumInfarkt: string | null;
  Mitarbeiter_idMitarbeiter: number;
  Patient_idPatient: number;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientId = Number(id);
    if (!Number.isFinite(patientId) || patientId <= 0) {
      return Response.json(
        { status: "error", message: "Ungültige Patient-ID." },
        { status: 400 }
      );
    }

    const [pRows] = await db.query<PatientRow[]>(
      `SELECT idPatient, stammdatenAusgefüllt, expositionAusgefüllt, followUpAusgefüllt
       FROM Patient
       WHERE idPatient = ?
       LIMIT 1`,
      [patientId]
    );

    if (pRows.length === 0) {
      return Response.json(
        { status: "error", message: `Patient ${patientId} nicht gefunden.` },
        { status: 404 }
      );
    }

    const [sRows] = await db.query<StammdatenRow[]>(
      `SELECT * FROM Stammdaten WHERE Patient_idPatient = ? LIMIT 1`,
      [patientId]
    );

    const [eRows] = await db.query<ExpositionRow[]>(
      `SELECT * FROM Exposition WHERE Patient_idPatient = ? LIMIT 1`,
      [patientId]
    );

    const [fRows] = await db.query<FollowUpRow[]>(
      `SELECT *
       FROM FollowUp
       WHERE Patient_idPatient = ?
       ORDER BY datumErhebung DESC, idFollowUp DESC`,
      [patientId]
    );

    return Response.json({
      status: "ok",
      patient: pRows[0],
      stammdaten: sRows[0] ?? null,
      exposition: eRows[0] ?? null,
      followups: fRows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  }
}
