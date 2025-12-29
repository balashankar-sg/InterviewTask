const express = require("express");
const { nanoid } = require("nanoid");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ DEFINE getNow BEFORE USING IT
function getNow(req) {
    if (process.env.TEST_MODE === "1") {
        const testNow = req.headers["x-test-now-ms"];
        if (testNow) {
            return Number(testNow);
        }
    }
    return Date.now();
}

// In-memory store (OK for interview demo)
const pastes = new Map();

/**
 * Health check
 */
app.get("/api/healthz", (req, res) => {
    res.status(200).json({ ok: true });
});

/**
 * Home page (HTML form)
 */
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Pastebin Lite</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f6fa;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }

          .container {
            background: #ffffff;
            padding: 20px 25px;
            border-radius: 8px;
            width: 400px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }

          h2 {
            text-align: center;
            margin-bottom: 15px;
          }

          textarea,
          input {
            width: 100%;
            padding: 8px;
            margin-top: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
          }

          button {
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            background-color: #4b7bec;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 15px;
            cursor: pointer;
          }

          button:hover {
            background-color: #3867d6;
          }

          .hint {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
          }
        </style>
      </head>

      <body>
        <div class="container">
          <h2>Create Paste</h2>

          <form method="POST" action="/create">
            <textarea name="content" rows="6" placeholder="Enter your text here..." required></textarea>

            <input name="ttl_seconds" type="number" placeholder="TTL (seconds)">
            <div class="hint">Optional: auto-expire after time</div>

            <input name="max_views" type="number" placeholder="Max views">
            <div class="hint">Optional: limit number of views</div>

            <button type="submit">Create Paste</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

/**
 * Create paste (API)
 */
app.post("/api/pastes", (req, res) => {
    const { content, ttl_seconds, max_views } = req.body;

    if (!content || content.trim() === "") {
        return res.status(400).json({ error: "content is required" });
    }

    const id = nanoid(8);
    const expiresAt =
        ttl_seconds ? getNow(req) + Number(ttl_seconds) * 1000 : null;

    pastes.set(id, {
        content,
        expiresAt,
        remainingViews: max_views ? Number(max_views) : null,
    });

    res.status(201).json({
        id,
        url: `${req.protocol}://${req.get("host")}/p/${id}`,
    });
});

/**
 * Handle HTML form submit
 */
app.post("/create", (req, res) => {
    const { content, ttl_seconds, max_views } = req.body;

    const id = nanoid(8);
    const expiresAt =
        ttl_seconds ? getNow(req) + Number(ttl_seconds) * 1000 : null;

    pastes.set(id, {
        content,
        expiresAt,
        remainingViews: max_views ? Number(max_views) : null,
    });

    res.redirect(`/p/${id}`);
});

/**
 * Fetch paste (API)
 */
app.get("/api/pastes/:id", (req, res) => {
    const paste = pastes.get(req.params.id);
    if (!paste) return res.status(404).json({ error: "Paste not found" });

    if (paste.expiresAt && getNow(req) > paste.expiresAt) {
        pastes.delete(req.params.id);
        return res.status(404).json({ error: "Paste expired" });
    }

    if (paste.remainingViews !== null) {
        if (paste.remainingViews <= 0) {
            pastes.delete(req.params.id);
            return res.status(404).json({ error: "View limit exceeded" });
        }
        paste.remainingViews--;
    }

    res.json({
        content: paste.content,
        remaining_views: paste.remainingViews,
        expires_at: paste.expiresAt ?
            new Date(paste.expiresAt).toISOString() :
            null,
    });
});

/**
 * View paste (HTML)
 */
app.get("/p/:id", (req, res) => {
    const paste = pastes.get(req.params.id);
    if (!paste) return res.status(404).send("Not found");

    if (paste.expiresAt && getNow(req) > paste.expiresAt) {
        pastes.delete(req.params.id);
        return res.status(404).send("Expired");
    }

    if (paste.remainingViews !== null) {
        if (paste.remainingViews <= 0) {
            pastes.delete(req.params.id);
            return res.status(404).send("View limit exceeded");
        }
        paste.remainingViews--;
    }

    res.send(`<pre>${paste.content}</pre>`);
});

module.exports = app;
