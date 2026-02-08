import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

/* =======================
   CORS — PRODUCTION SAFE
======================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://magenta-cascaron-cdb5f6.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

/* =======================
   STATIC IMAGES SERVE
======================= */
app.use(
  "/images",
  express.static(path.join(__dirname, "images"))
);

app.get("/", (req, res) => {
  res.send("🚀 LiMO Backend is running");
});

/* =======================
   PLACES API
======================= */
app.get("/api/places", (req, res) => {
  db.all("SELECT * FROM places", (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false });
    }
    res.json({ success: true, data: rows });
  });
});

app.get("/api/places/:id", (req, res) => {
  db.get(
    "SELECT * FROM places WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (!row) {
        return res
          .status(404)
          .json({ success: false, message: "Place not found" });
      }
      res.json({ success: true, data: row });
    }
  );
});

/* =======================
   TOKENS
======================= */
app.post("/api/places/:id/token", (req, res) => {
  const placeId = req.params.id;

  db.get(
    "SELECT lastIssuedToken FROM places WHERE id = ?",
    [placeId],
    (err, place) => {
      if (!place) {
        return res.status(404).json({ success: false });
      }

      const newToken = (place.lastIssuedToken || 0) + 1;

      db.serialize(() => {
        db.run(
          "UPDATE places SET lastIssuedToken = ? WHERE id = ?",
          [newToken, placeId]
        );

        db.run(
          "INSERT INTO tokens (place_id, token_number) VALUES (?, ?)",
          [placeId, newToken]
        );
      });

      res.json({ success: true, token: newToken });
    }
  );
});

app.put("/api/places/:id/next", (req, res) => {
  const placeId = req.params.id;

  db.get(
    "SELECT currentToken, lastIssuedToken FROM places WHERE id = ?",
    [placeId],
    (err, place) => {
      if (!place) {
        return res.status(404).json({ success: false });
      }

      if ((place.currentToken || 0) >= place.lastIssuedToken) {
        return res.json({
          success: false,
          message: "No more tokens",
        });
      }

      const nextToken = (place.currentToken || 0) + 1;

      db.serialize(() => {
        db.run(
          "UPDATE places SET currentToken = ? WHERE id = ?",
          [nextToken, placeId]
        );

        db.run(
          "UPDATE tokens SET served_at = CURRENT_TIMESTAMP WHERE place_id = ? AND token_number = ?",
          [placeId, nextToken]
        );
      });

      res.json({ success: true, currentToken: nextToken });
    }
  );
});

/* =======================
   TOKEN HISTORY
======================= */
app.get("/api/places/:id/tokens", (req, res) => {
  const placeId = req.params.id;

  db.all(
    `
    SELECT
      token_number,
      issued_at,
      served_at
    FROM tokens
    WHERE place_id = ?
    ORDER BY token_number
    `,
    [placeId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, data: rows });
    }
  );
});

/* =======================
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
