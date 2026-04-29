const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const players = new Map();
const clients = new Set();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function normalizeIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw ? raw.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
  return first.replace(/^::ffff:/, "");
}

function displayIp(ip) {
  if (ip === "::1") return "localhost";
  return ip;
}

function getPlayer(req) {
  const ip = normalizeIp(req);
  const now = Date.now();
  const existing = players.get(ip) || {
    id: ip,
    label: displayIp(ip),
    currentScore: 0,
    bestScore: 0,
    bestSize: 1,
    lastScore: 0,
    lastSize: 1,
    lastEndedAt: 0,
    games: 0,
    online: true,
    updatedAt: now,
  };

  existing.online = true;
  existing.updatedAt = now;
  players.set(ip, existing);
  return existing;
}

function playerSnapshot(player, now) {
  return {
    id: player.id,
    label: player.label,
    currentScore: player.currentScore,
    bestScore: player.bestScore,
    bestSize: player.bestSize,
    lastScore: player.lastScore,
    lastSize: player.lastSize,
    lastEndedAt: player.lastEndedAt,
    games: player.games,
    online: now - player.updatedAt < 15000,
    updatedAt: player.updatedAt,
  };
}

function liveRankings() {
  const now = Date.now();
  return [...players.values()]
    .map((player) => playerSnapshot(player, now))
    .sort((a, b) => b.currentScore - a.currentScore || b.bestScore - a.bestScore || a.label.localeCompare(b.label))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function roundRankings() {
  const now = Date.now();
  return [...players.values()]
    .map((player) => playerSnapshot(player, now))
    .filter((player) => player.games > 0 || player.lastScore > 0)
    .sort((a, b) => b.lastScore - a.lastScore || b.lastEndedAt - a.lastEndedAt || a.label.localeCompare(b.label))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function writeJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function broadcast() {
  const payload = `data: ${JSON.stringify({ players: liveRankings(), roundPlayers: roundRankings() })}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 4096) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function serveFile(res, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(root, cleanPath));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const type = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": type.includes("html") ? "no-store" : "public, max-age=60",
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/me" && req.method === "GET") {
    const player = getPlayer(req);
    const list = liveRankings();
    writeJson(res, 200, {
      player: {
        id: player.id,
        label: player.label,
        rank: list.find((item) => item.id === player.id)?.rank || "-",
      },
      players: list,
      roundPlayers: roundRankings(),
    });
    broadcast();
    return;
  }

  if (url.pathname === "/api/score" && req.method === "POST") {
    try {
      const player = getPlayer(req);
      const body = JSON.parse((await readBody(req)) || "{}");
      const currentScore = Math.max(0, Math.round(Number(body.score) || 0));
      const size = Math.max(1, Number(body.size) || 1);
      const ended = Boolean(body.ended);

      player.currentScore = ended ? 0 : currentScore;
      player.bestScore = Math.max(player.bestScore, currentScore);
      player.bestSize = Math.max(player.bestSize, size);
      if (ended) {
        player.lastScore = currentScore;
        player.lastSize = size;
        player.lastEndedAt = Date.now();
        player.games += 1;
      }
      player.updatedAt = Date.now();

      const list = liveRankings();
      writeJson(res, 200, {
        player: {
          id: player.id,
          label: player.label,
          rank: list.find((item) => item.id === player.id)?.rank || "-",
        },
        players: list,
        roundPlayers: roundRankings(),
      });
      broadcast();
    } catch (error) {
      writeJson(res, 400, { error: "Invalid score payload" });
    }
    return;
  }

  if (url.pathname === "/api/events" && req.method === "GET") {
    getPlayer(req);
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ players: liveRankings(), roundPlayers: roundRankings() })}\n\n`);
    clients.add(res);
    req.on("close", () => {
      clients.delete(res);
    });
    broadcast();
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    serveFile(res, url.pathname);
    return;
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

setInterval(broadcast, 5000).unref();

server.listen(port, "0.0.0.0", () => {
  console.log(`Fish game server: http://localhost:${port}`);
});
