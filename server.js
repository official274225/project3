// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.join(__dirname, "Geodata");

// 📁 Get folder contents
app.get("/api/folder", (req, res) => {
  const relPath = req.query.path || "";
  const fullPath = path.join(BASE_DIR, relPath);

  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: "Not found" });

  try {
    const items = fs.readdirSync(fullPath, { withFileTypes: true });

    const results = items.map(item => {
      const itemPath = path.join(fullPath, item.name);
      const stats = fs.statSync(itemPath);
      return {
        type: item.isDirectory() ? "directory" : "file",
        basename: item.name,
        filename: path.join(relPath, item.name).replace(/\\/g, '/'),
        size: stats.size,
        lastmod: stats.mtime
      };
    });

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 📄 Serve files (GeoJSON or otherwise)
app.get("/api/file", (req, res) => {
  const relPath = req.query.path;
  const fullPath = path.join(BASE_DIR, relPath);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found" });
  }

  // Prevent .txt metadata files from being downloaded
  if (relPath.endsWith('.txt')) {
    return res.status(403).json({ error: "Metadata files cannot be downloaded" });
  }

  const filename = path.basename(fullPath);
  const ext = path.extname(fullPath).toLowerCase();

  // Set Content-Type based on file extension
  let contentType = "application/octet-stream"; // Default
  if (ext === ".geojson") contentType = "application/json";
  else if (ext === ".tiff" || ext === ".tif") contentType = "image/tiff";
  else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  else if (ext === ".png") contentType = "image/png";

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", contentType);
  res.sendFile(fullPath);
});


// 🗂 Serve metadata (.xml)
app.get("/api/metadata", (req, res) => {
  const relPath = req.query.path;
  if (!relPath.endsWith('.txt')) {
    return res.status(400).json({ error: "Only .txt metadata files are allowed." });
  }

  const fullPath = path.join(BASE_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "Metadata file not found" });
  }

  res.sendFile(fullPath);
});


const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
