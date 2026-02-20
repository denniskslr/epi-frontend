import { db } from "../../../../lib/db";
import type { RowDataPacket } from "mysql2/promise";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if contains comma, quote, newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const lines: string[] = [];

  lines.push(headers.map(csvEscape).join(","));

  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }

  // Excel-friendly BOM
  return "\uFEFF" + lines.join("\n");
}

export async function GET() {
  try {
    // WICHTIG: Table-Namen exakt wie in deiner DB (bei dir Großschreibung)
    const [rows] = await db.query<RowDataPacket[]>(
      `
      SELECT 
        s.aufnahmedatum,
        s.studienzentrum,
        s.geburtsdatum,
        s.groesse,
        s.gewicht,
        e.datumErhebung AS datumErhebungExposition,
        e.geraucht,
        e.sorteRauchen,
        e.alterBeginn,
        e.rauchenEnde,
        e.anzahlZigTag,
        e.oftAlkohol,
        e.grammAlkohol,
        e.gesundBedenken,
        f.datumErhebung AS datumErhebungFollowUp,
        f.infarkt,
        f.verstorben,
        f.datumInfarkt
      FROM Stammdaten AS s
      LEFT JOIN Exposition AS e ON s.Patient_idPatient = e.Patient_idPatient
      LEFT JOIN FollowUp  AS f ON s.Patient_idPatient = f.Patient_idPatient
      ORDER BY s.idStammdaten ASC, f.datumErhebung ASC
      `
    );

    const csv = toCSV(rows as unknown as Record<string, unknown>[]);

    const fileName = `export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ status: "error", message }, { status: 500 });
  }
}