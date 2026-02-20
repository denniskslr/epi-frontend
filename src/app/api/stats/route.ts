import { db } from "../../../lib/db";
import type { RowDataPacket } from "mysql2/promise";

type CountRow = RowDataPacket & { cnt: number };

export async function GET() {
  try {
    const [pRows] = await db.query<CountRow[]>(
      "SELECT COUNT(*) AS cnt FROM Patient"
    );
    const [fRows] = await db.query<CountRow[]>(
      "SELECT COUNT(*) AS cnt FROM FollowUp"
    );

    return Response.json({
      status: "ok",
      patientsTotal: pRows[0]?.cnt ?? 0,
      followUpsTotal: fRows[0]?.cnt ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  }
}