import mysql, { type Pool } from "mysql2/promise";

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

// Optional: harte Fehler, wenn ENV fehlt (sehr hilfreich beim Debuggen)
if (!DB_HOST || !DB_USER || !DB_NAME) {
  throw new Error("Database environment variables are not fully defined.");
}

export const db: Pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT ?? 3306),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  connectionLimit: 10,
});
