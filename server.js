import express from "express";
import cors from "cors";
import db from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

/* =======================
   CORS — FIXED FOR PROD
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
   STATIC IMAGES
======================= */
app.use("/images", express.static(path.join(__dirname, "images")));

/* =======================
   HEALTH CHECK
======================= */
app.get("/", (req, res) => {
  res.send("Live Queue Backend is running");
});

/* =======================
   PLACES
======================= */
app.get("/api/places", (req, res) => {
  db.all("SELECT * FROM places", (err, rows) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, data: rows });
  });
});

app.get("/api/places/:id", (req, res) => {
  db.get(
    "SELECT * FROM places WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (!row) {
        return res.status(404).json({
          success: false,
          message: "Place not found",
        });
      }
      res.json({ success: true, data: row });
    }
  );
});

/* =======================
   REQUEST-BASED QUEUE
======================= */

// User requests token
app.post("/api/places/:id/request", (req, res) => {
  const placeId = req.params.id;

  db.run(
    "INSERT INTO tokens (place_id, token_number) VALUES (?, NULL)",
    [placeId],
    function () {
      res.json({ success: true, requestId: this.lastID });
    }
  );
});

// Admin fetches requests
app.get("/api/places/:id/requests", (req, res) => {
  db.all(
    "SELECT * FROM tokens WHERE place_id = ? AND token_number IS NULL",
    [req.params.id],
    (err, rows) => {
      res.json({ success: true, data: rows });
    }
  );
});

// Admin approves request
app.post("/api/places/:id/approve", (req, res) => {
  const { requestId } = req.body;
  const placeId = req.params.id;

  db.get(
    "SELECT lastIssuedToken FROM places WHERE id = ?",
    [placeId],
    (err, place) => {
      const newToken = (place.lastIssuedToken || 0) + 1;

      db.serialize(() => {
        db.run(
          "UPDATE tokens SET token_number = ? WHERE id = ?",
          [newToken, requestId]
        );
        db.run(
          "UPDATE places SET lastIssuedToken = ? WHERE id = ?",
          [newToken, placeId]
        );
      });

      res.json({ success: true, token: newToken });
    }
  );
});

// Admin next token
app.put("/api/places/:id/next", (req, res) => {
  const placeId = req.params.id;

  db.run(
    "UPDATE places SET currentToken = COALESCE(currentToken, 0) + 1 WHERE id = ?",
    [placeId],
    () => res.json({ success: true })
  );
});

// Token history
app.get("/api/places/:id/tokens", (req, res) => {
  db.all(
    "SELECT * FROM tokens WHERE place_id = ? AND token_number IS NOT NULL",
    [req.params.id],
    (err, rows) => {
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
