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
   ✅ CORS (IMPORTANT)
======================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://magenta-cascaron-cdb5f6.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json());

/* =======================
   STATIC FILES (IMAGES)
======================= */
app.use("/images", express.static(path.join(__dirname, "images")));

app.get("/", (req, res) => {
  res.send("Live Queue Backend is running");
});

/* =======================
   PLACES
======================= */
app.get("/api/places", (req, res) => {
  db.all("SELECT * FROM places", (err, rows) => {
    if (err) {
      console.error(err);
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
   START SERVER
======================= */
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
