import { db } from "../../../../lib/db";
import type { RowDataPacket } from "mysql2/promise";

type LoginBody = {
  benutzername: string;
  passwort: string;
};

type MitarbeiterRow = RowDataPacket & { idMitarbeiter: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as LoginBody;

    const benutzername = String(body.benutzername ?? "").trim();
    const passwort = String(body.passwort ?? "").trim();

    if (!benutzername || !passwort) {
      return Response.json(
        { status: "error", message: "benutzername und passwort sind Pflicht." },
        { status: 400 }
      );
    }

    const [rows] = await db.query<MitarbeiterRow[]>(
      "SELECT idMitarbeiter FROM Mitarbeiter WHERE benutzername = ? AND passwort = ? LIMIT 1",
      [benutzername, passwort]
    );

    if (rows.length === 0) {
      return Response.json(
        { status: "error", message: "Login fehlgeschlagen." },
        { status: 401 }
      );
    }

    return Response.json({ status: "ok", employeeId: rows[0].idMitarbeiter });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  }
}
