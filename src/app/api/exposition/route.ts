import { db } from "../../../lib/db";
import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

const DUMMY_MITARBEITER_ID = 1;

// ---- Types ----
type ExpositionBody = {
  patientId: number | string;
  datumErhebung: string;

  geraucht?: string | null;
  sorteRauchen?: string | null;
  oftAlkohol?: string | null;
  gesundBedenken?: string | null;

  alterBeginn?: number | string | null;
  rauchenEnde?: number | string | null;
  anzahlZigTag?: number | string | null;
  grammAlkohol?: number | string | null;
};

type IdRow = RowDataPacket & { idMitarbeiter?: number; idPatient?: number };

// ---- Helpers ----
function toNullIfEmpty(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function toIntOrNull(v: unknown): number | null {
  const s = toNullIfEmpty(v);
  if (s === null) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || Number.isNaN(n)) return null;
  return n;
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

// ---- Route ----
export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as ExpositionBody;

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

    // Strings
    const geraucht = toNullIfEmpty(body.geraucht);
    const sorteRauchen = toNullIfEmpty(body.sorteRauchen);
    const oftAlkohol = toNullIfEmpty(body.oftAlkohol);
    const gesundBedenken = toNullIfEmpty(body.gesundBedenken);

    // INT
    const alterBeginn = toIntOrNull(body.alterBeginn);
    const rauchenEnde = toIntOrNull(body.rauchenEnde);
    const anzahlZigTag = toIntOrNull(body.anzahlZigTag);
    const grammAlkohol = toIntOrNull(body.grammAlkohol);

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

    const [eRes] = await conn.query<ResultSetHeader>(
      `INSERT INTO \`Exposition\`
       (\`datumErhebung\`, \`geraucht\`, \`sorteRauchen\`, \`alterBeginn\`, \`rauchenEnde\`,
        \`anzahlZigTag\`, \`oftAlkohol\`, \`grammAlkohol\`, \`gesundBedenken\`,
        \`Mitarbeiter_idMitarbeiter\`, \`Patient_idPatient\`)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datumErhebung,
        geraucht,
        sorteRauchen,
        alterBeginn,
        rauchenEnde,
        anzahlZigTag,
        oftAlkohol,
        grammAlkohol,
        gesundBedenken,
        DUMMY_MITARBEITER_ID,
        patientId,
      ]
    );

    await conn.query<ResultSetHeader>(
      "UPDATE `Patient` SET `expositionAusgefüllt` = 1 WHERE `idPatient` = ?",
      [patientId]
    );

    await conn.commit();

    return Response.json({
      status: "ok",
      expositionId: eRes.insertId,
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
