import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "images")));

app.get("/", (req, res) => {
  res.send("Live Queue Backend is running");
});

/* =======================
   PLACES
======================= */

app.get("/api/places", (req, res) => {
  db.all("SELECT * FROM places", (err, rows) => {
    res.json({ success: true, data: rows });
  });
});

app.get("/api/places/:id", (req, res) => {
  db.get("SELECT * FROM places WHERE id = ?", [req.params.id], (err, row) => {
    res.json({ success: true, data: row });
  });
});

/* =======================
   USER → REQUEST TOKEN
======================= */

app.post("/api/places/:id/request", (req, res) => {
  const placeId = req.params.id;

  db.run(
    "INSERT INTO token_requests (place_id) VALUES (?)",
    [placeId],
    () => {
      res.json({ success: true, message: "Token request submitted" });
    }
  );
});

/* =======================
   ADMIN → VIEW REQUESTS
======================= */

app.get("/api/places/:id/requests", (req, res) => {
  db.all(
    "SELECT * FROM token_requests WHERE place_id = ? AND status = 'pending'",
    [req.params.id],
    (err, rows) => {
      res.json({ success: true, data: rows });
    }
  );
});

/* =======================
   ADMIN → APPROVE REQUEST
======================= */

app.post("/api/requests/:requestId/approve", (req, res) => {
  const requestId = req.params.requestId;

  db.get(
    `
    SELECT place_id FROM token_requests
    WHERE id = ? AND status = 'pending'
    `,
    [requestId],
    (err, request) => {
      if (!request) {
        return res.status(404).json({ success: false });
      }

      const placeId = request.place_id;

      db.get(
        "SELECT lastIssuedToken FROM places WHERE id = ?",
        [placeId],
        (err, place) => {
          const newToken = place.lastIssuedToken + 1;

          db.serialize(() => {
            db.run(
              "UPDATE places SET lastIssuedToken = ? WHERE id = ?",
              [newToken, placeId]
            );

            db.run(
              "INSERT INTO tokens (place_id, token_number) VALUES (?, ?)",
              [placeId, newToken]
            );

            db.run(
              "UPDATE token_requests SET status = 'approved' WHERE id = ?",
              [requestId]
            );
          });

          res.json({ success: true, token: newToken });
        }
      );
    }
  );
});

/* =======================
   ADMIN → REJECT REQUEST
======================= */

app.post("/api/requests/:requestId/reject", (req, res) => {
  db.run(
    "UPDATE token_requests SET status = 'rejected' WHERE id = ?",
    [req.params.requestId],
    () => res.json({ success: true })
  );
});

/* =======================
   QUEUE / DISPLAY
======================= */

app.get("/api/places/:id/tokens", (req, res) => {
  db.all(
    "SELECT * FROM tokens WHERE place_id = ? ORDER BY token_number",
    [req.params.id],
    (err, rows) => {
      res.json({ success: true, data: rows });
    }
  );
});

app.put("/api/places/:id/next", (req, res) => {
  const placeId = req.params.id;

  db.get(
    "SELECT currentToken, lastIssuedToken FROM places WHERE id = ?",
    [placeId],
    (err, place) => {
      if (place.currentToken >= place.lastIssuedToken) {
        return res.status(400).json({ success: false });
      }

      const next = place.currentToken + 1;

      db.run(
        "UPDATE places SET currentToken = ? WHERE id = ?",
        [next, placeId]
      );

      res.json({ success: true, currentToken: next });
    }
  );
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});
