import { db } from "../../../lib/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

const DUMMY_MITARBEITER_ID = 1;

type FollowUpBody = {
  patientId: number | string;
  datumErhebung: string;

  infarkt?: "ja" | "nein" | string | null;
  verstorben?: "ja" | "nein" | string | null;
  datumInfarkt?: string | null; // YYYY-MM-DD
};

type IdRow = RowDataPacket & { idMitarbeiter?: number; idPatient?: number };

function toNullIfEmpty(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

async function ensureDummyMitarbeiter(conn: PoolConnection) {
  const [rows] = await conn.query<IdRow[]>(
    "SELECT `idMitarbeiter` FROM `Mitarbeiter` WHERE `idMitarbeiter` = ? LIMIT 1",
    [DUMMY_MITARBEITER_ID]
  );
  if (rows.length === 0) {
    throw new Error(`Dummy-Mitarbeiter fehlt (id=${DUMMY_MITARBEITER_ID}).`);
  }
}

async function ensurePatientExists(conn: PoolConnection, patientId: number) {
  const [rows] = await conn.query<IdRow[]>(
    "SELECT `idPatient` FROM `Patient` WHERE `idPatient` = ? LIMIT 1",
    [patientId]
  );
  return rows.length > 0;
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as FollowUpBody;

    const patientId = Number(body.patientId);
    if (!patientId || Number.isNaN(patientId)) {
      return Response.json(
        { status: "error", message: "patientId fehlt/ungültig." },
        { status: 400 }
      );
    }

    const datumErhebung = toNullIfEmpty(body.datumErhebung);
    if (!datumErhebung) {
      return Response.json(
        { status: "error", message: "datumErhebung ist Pflicht." },
        { status: 400 }
      );
    }

    const infarkt = toNullIfEmpty(body.infarkt);
    const verstorben = toNullIfEmpty(body.verstorben);
    const datumInfarkt = toNullIfEmpty(body.datumInfarkt);

    if (infarkt === "ja" && !datumInfarkt) {
      return Response.json(
        { status: "error", message: "datumInfarkt ist Pflicht wenn infarkt = ja." },
        { status: 400 }
      );
    }

    conn = await db.getConnection();
    await conn.beginTransaction();

    await ensureDummyMitarbeiter(conn);

    const patientExists = await ensurePatientExists(conn, patientId);
    if (!patientExists) {
      await conn.rollback();
      return Response.json(
        { status: "error", message: `Patient ${patientId} existiert nicht.` },
        { status: 404 }
      );
    }

    const [fRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO \`FollowUp\`
       (\`datumErhebung\`, \`infarkt\`, \`verstorben\`, \`datumInfarkt\`,
        \`Mitarbeiter_idMitarbeiter\`, \`Patient_idPatient\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        datumErhebung,
        infarkt,
        verstorben,
        datumInfarkt,
        DUMMY_MITARBEITER_ID,
        patientId,
      ]
    );

    // Flag bleibt: bedeutet jetzt "mindestens 1 FollowUp vorhanden"
    await conn.query<ResultSetHeader>(
      "UPDATE `Patient` SET `followUpAusgefüllt` = 1 WHERE `idPatient` = ?",
      [patientId]
    );

    await conn.commit();

    return Response.json({
      status: "ok",
      followUpId: fRes.insertId,
      patientId,
    });
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {
        // ignore
      }
    }

    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }
}
