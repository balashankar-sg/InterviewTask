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
    <html>
      <body>
        <h2>Create Paste</h2>
        <form method="POST" action="/create">
          <textarea name="content" rows="5" cols="40" required></textarea><br/><br/>
          <input name="ttl_seconds" type="number" placeholder="TTL seconds"/><br/><br/>
          <input name="max_views" type="number" placeholder="Max views"/><br/><br/>
          <button type="submit">Create</button>
        </form>
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