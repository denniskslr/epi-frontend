// src/app/api/patients/route.ts
import { db } from "../../../lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

type PatientRow = RowDataPacket & {
  idPatient: number;
  stammdatenAusgefüllt: number;
  expositionAusgefüllt: number;
  followUpAusgefüllt: number;
};

/* ===========================
   GET  -> Liste aller Patienten
   =========================== */
export async function GET() {
  try {
    const [rows] = await db.query<PatientRow[]>(
      `SELECT 
        idPatient,
        stammdatenAusgefüllt,
        expositionAusgefüllt,
        followUpAusgefüllt
       FROM Patient
       ORDER BY idPatient DESC`
    );

    return Response.json({
      status: "ok",
      patients: rows,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unbekannter Fehler.";

    return Response.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}

/* ===========================
   POST -> Neuen Patient anlegen
   =========================== */
export async function POST() {
  try {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO Patient
       (stammdatenAusgefüllt, expositionAusgefüllt, followUpAusgefüllt)
       VALUES (0, 0, 0)`
    );

    return Response.json({
      status: "ok",
      patientId: result.insertId,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unbekannter Fehler.";

    return Response.json(
      { status: "error", message },
      { status: 500 }
    );
  }
}
