import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./queue.db");

db.serialize(() => {
  // PLACES
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

  // APPROVED TOKENS (REAL QUEUE)
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT,
      token_number INTEGER,
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      served_at DATETIME
    )
  `);

  // 🆕 TOKEN REQUESTS (PENDING / REJECTED)
  db.run(`
    CREATE TABLE IF NOT EXISTS token_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT,
      status TEXT CHECK(status IN ('pending','approved','rejected')) DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // DEV RESET
  db.run("DELETE FROM places");
  db.run("DELETE FROM tokens");
  db.run("DELETE FROM token_requests");

  const stmt = db.prepare(`
    INSERT INTO places (id, name, type, image)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 1; i <= 9; i++) {
    stmt.run(
      `hospital-${i}`,
      `Hospital ${i}`,
      "hospital",
      `/images/catalogpics/hospitals/hospital${i}.jpg`
    );
  }

  for (let i = 1; i <= 9; i++) {
    stmt.run(
      `hotel-${i}`,
      `Hotel ${i}`,
      "hotel",
      `/images/catalogpics/hotels/hotel${i}.jpg`
    );
  }

  stmt.finalize();
  console.log("✅ Database initialized with request-based queue model");
});

export default db;
