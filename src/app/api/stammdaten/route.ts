// src/app/api/stammdaten/route.ts
import { db } from "../../../lib/db";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

const DUMMY_MITARBEITER_ID = 1;

// ---- Types ----
type StammdatenBody = {
  patientId: number | string;

  aufnahmedatum: string; // YYYY-MM-DD (pflicht)
  studienzentrum?: string | null;
  geburtsdatum?: string | null; // YYYY-MM-DD
  groesse?: number | string | null;
  gewicht?: number | string | null;
};

type IdRow = RowDataPacket & {
  idMitarbeiter?: number;
  idPatient?: number;
  idStammdaten?: number;
};

// ---- Helpers ----
function toNullIfEmpty(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toNumberOrNull(v: unknown): number | null {
  const s = toNullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

async function ensureDummyMitarbeiter(conn: PoolConnection) {
  const [rows] = await conn.query<IdRow[]>(
    "SELECT idMitarbeiter FROM Mitarbeiter WHERE idMitarbeiter=? LIMIT 1",
    [DUMMY_MITARBEITER_ID]
  );
  if (rows.length === 0) {
    throw new Error(`Dummy-Mitarbeiter fehlt (id=${DUMMY_MITARBEITER_ID}).`);
  }
}

async function ensurePatientExists(conn: PoolConnection, patientId: number) {
  const [rows] = await conn.query<IdRow[]>(
    "SELECT idPatient FROM Patient WHERE idPatient=? LIMIT 1",
    [patientId]
  );
  return rows.length > 0;
}

async function stammdatenExists(conn: PoolConnection, patientId: number) {
  const [rows] = await conn.query<IdRow[]>(
    "SELECT idStammdaten FROM Stammdaten WHERE Patient_idPatient=? LIMIT 1",
    [patientId]
  );
  return rows.length > 0;
}

// ---- Route ----
export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as StammdatenBody;

    const patientId = Number(body.patientId);
    if (!patientId || Number.isNaN(patientId)) {
      return Response.json(
        { status: "error", message: "patientId fehlt/ungültig." },
        { status: 400 }
      );
    }

    const aufnahmedatum = toNullIfEmpty(body.aufnahmedatum);
    if (!aufnahmedatum) {
      return Response.json(
        { status: "error", message: "aufnahmedatum ist Pflicht." },
        { status: 400 }
      );
    }

    const studienzentrum = toNullIfEmpty(body.studienzentrum);
    const geburtsdatum = toNullIfEmpty(body.geburtsdatum);
    const groesse = toNumberOrNull(body.groesse);
    const gewicht = toNumberOrNull(body.gewicht);

    conn = await db.getConnection();
    await conn.beginTransaction();

    await ensureDummyMitarbeiter(conn);

    const patientOk = await ensurePatientExists(conn, patientId);
    if (!patientOk) {
      await conn.rollback();
      return Response.json(
        { status: "error", message: `Patient ${patientId} existiert nicht.` },
        { status: 404 }
      );
    }

    // Optional: verhindern, dass Q1 doppelt angelegt wird (falls DB kein UNIQUE hat)
    const already = await stammdatenExists(conn, patientId);
    if (already) {
      await conn.rollback();
      return Response.json(
        {
          status: "error",
          message: `Stammdaten für Patient ${patientId} existieren bereits.`,
        },
        { status: 409 }
      );
    }

    const [sRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO Stammdaten
       (aufnahmedatum, studienzentrum, geburtsdatum, groesse, gewicht, Mitarbeiter_idMitarbeiter, Patient_idPatient)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        aufnahmedatum,
        studienzentrum,
        geburtsdatum,
        groesse,
        gewicht,
        DUMMY_MITARBEITER_ID,
        patientId,
      ]
    );

    await conn.query<ResultSetHeader>(
      "UPDATE Patient SET stammdatenAusgefüllt=1 WHERE idPatient=?",
      [patientId]
    );

    await conn.commit();

    return Response.json({
      status: "ok",
      stammdatenId: sRes.insertId,
      patientId,
    });
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        // ignore rollback errors
      }
    }

    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
