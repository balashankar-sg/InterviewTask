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
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      width: 420px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }

    textarea, input, button {
      width: 100%;
      margin-top: 10px;
      padding: 8px;
      font-size: 14px;
    }

    button {
      background: #4b7bec;
      color: #fff;
      border: none;
      cursor: pointer;
    }

    button:hover {
      background: #3867d6;
    }

    .error {
      color: red;
      margin-top: 10px;
    }

    .success {
      color: green;
      margin-top: 10px;
      word-break: break-all;
    }
  </style>
</head>

<body>
  <div class="container">
    <h2>Create Paste</h2>

    <textarea id="content" rows="5" placeholder="Enter text"></textarea>
    <input id="ttl" type="number" placeholder="TTL (seconds)">
    <input id="views" type="number" placeholder="Max views">

    <button onclick="createPaste()">Create Paste</button>

    <div id="result"></div>
  </div>

<script>
async function createPaste() {
  const result = document.getElementById("result");
  result.innerHTML = "";

  const content = document.getElementById("content").value;
  const ttl = document.getElementById("ttl").value;
  const views = document.getElementById("views").value;

  try {
    const res = await fetch("/api/pastes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        ttl_seconds: ttl ? Number(ttl) : undefined,
        max_views: views ? Number(views) : undefined
      })
    });

    const data = await res.json();

    if (!res.ok) {
      result.innerHTML = "<div class='error'>" + data.error + "</div>";
      return;
    }

    result.innerHTML =
      "<div class='success'>Paste created:<br><a href='" +
      data.url +
      "' target='_blank'>" +
      data.url +
      "</a></div>";

  } catch (err) {
    result.innerHTML = "<div class='error'>Something went wrong</div>";
  }
}
</script>
</body>
</html>
`);
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
