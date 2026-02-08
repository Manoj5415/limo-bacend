import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./queue.db");

const BASE_IMAGE_URL =
  "https://magenta-cascaron-cdb5f6.netlify.app/catalogpics";


db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS places (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      image TEXT,
      currentToken INTEGER DEFAULT 0,
      lastIssuedToken INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT,
      token_number INTEGER,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      served_at DATETIME
    )
  `);

  /* CLEAN SEED */
  db.run("DELETE FROM places");
  db.run("DELETE FROM tokens");

  const stmt = db.prepare(`
    INSERT INTO places (id, name, type, image, currentToken, lastIssuedToken)
    VALUES (?, ?, ?, ?, 0, 0)
  `);

  /* ---------- HOSPITALS ---------- */
  for (let i = 1; i <= 9; i++) {
    stmt.run(
      `hospital-${i}`,
      `Hospital ${i}`,
      "hospital",
      `${BASE_IMAGE_URL}/hospitals/hospital${i}.jpg`
    );
  }

  /* ---------- HOTELS ---------- */
  for (let i = 1; i <= 9; i++) {
    stmt.run(
      `hotel-${i}`,
      `Hotel ${i}`,
      "hotel",
      `${BASE_IMAGE_URL}/hotels/hotel${i}.jpg`
    );
  }

  stmt.finalize();

  console.log("✅ Database seeded with production image URLs");
});

export default db;
