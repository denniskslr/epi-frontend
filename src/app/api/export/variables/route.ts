const text = `Variablenbeschreibung (Export)

Stammdaten (s.*)
- aufnahmedatum (DATE): Datum der Aufnahme / Erhebung der Stammdaten
- studienzentrum (VARCHAR): Name/Kürzel des Studienzentrums
- geburtsdatum (DATE): Geburtsdatum der Person
- groesse (INT): Körpergröße in cm
- gewicht (INT): Körpergewicht in kg

Exposition (e.*)
- datumErhebungExposition (DATE): Datum der Expositionserhebung
- geraucht (SET: nie|ehemalig): Rauchstatus
- sorteRauchen (SET: Pfeife|Zigaretten): Art des Rauchens (falls zutreffend)
- alterBeginn (INT): Alter bei Rauchbeginn (Jahre)
- rauchenEnde (INT): Seit wann aufgehört (Jahre)
- anzahlZigTag (INT): Anzahl Zigaretten pro Tag
- oftAlkohol (SET: nie|gelegentlich|täglich): Trinkhäufigkeit
- grammAlkohol (INT): Gramm Alkohol pro Tag (geschätzt)
- gesundBedenken (SET: keine|unter bestimmten Voraussetzungen|ja): Gesundheitsbedenken

FollowUp (f.*)
- datumErhebungFollowUp (DATE): Datum der FollowUp-Erhebung
- infarkt (SET: ja|nein): Herzinfarkt aufgetreten?
- verstorben (SET: ja|nein): Patient verstorben?
- datumInfarkt (DATE): Datum des Infarkts (falls infarkt=ja)

Hinweis:
- LEFT JOIN bedeutet: Wenn Exposition oder FollowUp fehlt, stehen dort leere Werte.
- FollowUp kann mehrfach existieren: dadurch kann ein Patient in der CSV mehrfach vorkommen (eine Zeile pro FollowUp).
`;

export async function GET() {
  const fileName = `variablenbeschreibung_${new Date().toISOString().slice(0, 10)}.txt`;

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}