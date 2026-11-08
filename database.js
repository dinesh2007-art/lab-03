import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "books.db");

let db = null;

const saveDB = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

export const initializeDBAndServer = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

  const result = db.exec("SELECT COUNT(*) as count FROM books;");
  const count = result.length > 0 && result[0].values[0] ? result[0].values[0][0] : 0;

  if (count === 0) {
    db.run(`
      INSERT INTO books (title, author, price) VALUES
      ('Clean Code', 'Robert C. Martin', 450),
      ('JavaScript: The Good Parts', 'Douglas Crockford', 350),
      ('Design Patterns', 'Erich Gamma', 550),
      ('You Don''t Know JS', 'Kyle Simpson', 300),
      ('Refactoring', 'Martin Fowler', 600);
    `);
    saveDB();
  }

  return db;
};

export const queryAll = (sql, params = []) => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
};

export const queryGet = (sql, params = []) => {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
};

export const queryRun = (sql, params = []) => {
  db.run(sql, params);
  saveDB();
  const res = db.exec("SELECT last_insert_rowid() AS id;");
  const lastID = res.length > 0 && res[0].values[0] ? res[0].values[0][0] : null;
  return { lastID };
};