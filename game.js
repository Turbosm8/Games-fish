const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const sizeEl = document.querySelector("#size");
const comboEl = document.querySelector("#combo");
const rankEl = document.querySelector("#rank");
const overlay = document.querySelector("#overlay");
const overlayKicker = document.querySelector("#overlayKicker");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayText = document.querySelector("#overlayText");
const roundRankingEl = document.querySelector("#roundRanking");
const startBtn = document.querySelector("#startBtn");
const pauseBtn = document.querySelector("#pauseBtn");
const restartBtn = document.querySelector("#restartBtn");
const connectionStatusEl = document.querySelector("#connectionStatus");
const playerIdEl = document.querySelector("#playerId");
const leaderboardListEl = document.querySelector("#leaderboardList");

const multiplayer = {
  enabled: location.protocol !== "file:",
  playerId: null,
  playerLabel: "本地玩家",
  lastScoreSync: 0,
  syncInterval: 900,
  latestPlayers: [],
  latestRoundPlayers: [],
};

const BASE_RADIUS = 28;
const MAX_PLAYER_SCALE = 18;

const world = {
  width: canvas.width,
  height: canvas.height,
  running: false,
  paused: false,
  gameOver: false,
  lastTime: 0,
  spawnTimer: 0,
  bubbleTimer: 0,
  score: 0,
  combo: 0,
  comboTimer: 0,
  keys: new Set(),
  pointer: { active: false, x: canvas.width * 0.42, y: canvas.height * 0.5 },
  fishes: [],
  bubbles: [],
  plants: [],
};

const MAX_PLAYER_RADIUS = Math.min(BASE_RADIUS * MAX_PLAYER_SCALE, Math.min(world.width, world.height) * 0.42);

const player = {
  x: canvas.width * 0.35,
  y: canvas.height * 0.5,
  radius: BASE_RADIUS,
  mass: 0,
  speed: 360,
  angle: 0,
  targetAngle: 0,
  invincible: 1.2,
  color: "#18e0ff",
};

const fishColors = ["#ffcd5d", "#ff8f70", "#9d7cff", "#c5f467", "#f28cff", "#ff7aa8"];

const fishSpecies = [
  {
    id: "crucian",
    label: "鲫鱼",
    bodyRatio: 1.9,
    headRatio: 0.22,
    tail: "forked",
    tailSize: 0.22,
    finStyle: "shortSoft",
    palette: { main: "#B8BFC6", secondary: "#8A7A55", accent: "#E2C76E" },
    pattern: "subtleScales",
    eyePos: { x: 0.18, y: 0.08 },
  },
  {
    id: "carp",
    label: "鲤鱼",
    bodyRatio: 2.1,
    headRatio: 0.24,
    tail: "forked",
    tailSize: 0.24,
    finStyle: "longDorsal",
    palette: { main: "#9B7A4A", secondary: "#6E5A3D", accent: "#D7B46A" },
    pattern: "largeScales",
    eyePos: { x: 0.18, y: 0.06 },
  },
  {
    id: "grassCarp",
    label: "草鱼",
    bodyRatio: 3.6,
    headRatio: 0.23,
    tail: "forked",
    tailSize: 0.25,
    finStyle: "sleek",
    palette: { main: "#7A8A8B", secondary: "#DDE5E6", accent: "#4E5B5C" },
    pattern: "darkBackLightBelly",
    eyePos: { x: 0.17, y: 0.05 },
  },
  {
    id: "silverCarp",
    label: "鲢鱼",
    bodyRatio: 2.7,
    headRatio: 0.28,
    tail: "forked",
    tailSize: 0.25,
    finStyle: "sleek",
    palette: { main: "#D6DEE3", secondary: "#8E9AA3", accent: "#FFFFFF" },
    pattern: "metallic",
    eyePos: { x: 0.16, y: 0.05 },
  },
  {
    id: "catfish",
    label: "鲶鱼",
    bodyRatio: 2.6,
    headRatio: 0.3,
    tail: "rounded",
    tailSize: 0.18,
    finStyle: "whiskers",
    palette: { main: "#4B4A46", secondary: "#2F2E2B", accent: "#8A7E6B" },
    pattern: "none",
    eyePos: { x: 0.15, y: 0.02 },
    extras: { barbels: 4 },
  },
  {
    id: "tilapia",
    label: "罗非鱼",
    bodyRatio: 2.2,
    headRatio: 0.24,
    tail: "truncate",
    tailSize: 0.2,
    finStyle: "spinyDorsal",
    palette: { main: "#7E8C8A", secondary: "#566463", accent: "#BFC9C8" },
    pattern: "verticalBars",
    eyePos: { x: 0.18, y: 0.07 },
  },
  {
    id: "goldfish",
    label: "金鱼",
    bodyRatio: 1.7,
    headRatio: 0.22,
    tail: "rounded",
    tailSize: 0.35,
    finStyle: "flowy",
    palette: { main: "#F26A2E", secondary: "#F7C6A6", accent: "#FFFFFF" },
    pattern: "solidOrBicolor",
    eyePos: { x: 0.2, y: 0.08 },
  },
  {
    id: "trout",
    label: "虹鳟",
    bodyRatio: 3.2,
    headRatio: 0.24,
    tail: "forked",
    tailSize: 0.22,
    finStyle: "sleek",
    palette: { main: "#7E8A5A", secondary: "#C7D0C8", accent: "#D46A7A" },
    pattern: "speckles+pinkStripe",
    eyePos: { x: 0.18, y: 0.06 },
  },
  {
    id: "mackerel",
    label: "鲭鱼",
    bodyRatio: 4.2,
    headRatio: 0.22,
    tail: "forked",
    tailSize: 0.24,
    finStyle: "finlets",
    palette: { main: "#2E6F7E", secondary: "#D9E3E8", accent: "#1F3F46" },
    pattern: "wavyBackStripes",
    eyePos: { x: 0.17, y: 0.05 },
  },
  {
    id: "sardine",
    label: "沙丁鱼",
    bodyRatio: 3.6,
    headRatio: 0.2,
    tail: "forked",
    tailSize: 0.22,
    finStyle: "minimal",
    palette: { main: "#DDE6EE", secondary: "#6F8796", accent: "#FFFFFF" },
    pattern: "metallic",
    eyePos: { x: 0.17, y: 0.05 },
  },
  {
    id: "tuna",
    label: "金枪鱼",
    bodyRatio: 4.8,
    headRatio: 0.23,
    tail: "lunate",
    tailSize: 0.26,
    finStyle: "finlets+stout",
    palette: { main: "#1E3F66", secondary: "#DDE6F0", accent: "#0F1F2E" },
    pattern: "darkBackLightBelly",
    eyePos: { x: 0.16, y: 0.05 },
  },
  {
    id: "salmon",
    label: "三文鱼",
    bodyRatio: 3.8,
    headRatio: 0.24,
    tail: "forked",
    tailSize: 0.23,
    finStyle: "adiposeFin",
    palette: { main: "#C9D2DA", secondary: "#6C7A86", accent: "#F08A7A" },
    pattern: "sparseSpots",
    eyePos: { x: 0.17, y: 0.05 },
  },
  {
    id: "seabass",
    label: "海鲈",
    bodyRatio: 3.0,
    headRatio: 0.26,
    tail: "truncate",
    tailSize: 0.2,
    finStyle: "spinyDorsal",
    palette: { main: "#8D98A1", secondary: "#DDE4EA", accent: "#2F3438" },
    pattern: "subtleGradient",
    eyePos: { x: 0.18, y: 0.06 },
  },
  {
    id: "clownfish",
    label: "小丑鱼",
    bodyRatio: 2.0,
    headRatio: 0.24,
    tail: "rounded",
    tailSize: 0.22,
    finStyle: "roundedFins",
    palette: { main: "#F47A21", secondary: "#FFFFFF", accent: "#1A1A1A" },
    pattern: "3WhiteBands",
    eyePos: { x: 0.2, y: 0.08 },
  },
  {
    id: "lionfish",
    label: "狮子鱼",
    bodyRatio: 2.4,
    headRatio: 0.26,
    tail: "rounded",
    tailSize: 0.2,
    finStyle: "longSpines+fanPectoral",
    palette: { main: "#B24A2D", secondary: "#F3E6D2", accent: "#5B2A1D" },
    pattern: "verticalStripes",
    eyePos: { x: 0.18, y: 0.07 },
  },
];

const playerSpecies = fishSpecies.find((item) => item.id === "salmon") || fishSpecies[0];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFishSpecies(radius) {
  if (radius < 16) return Math.random() < 0.55 ? "sardine" : "clownfish";
  if (radius < 26) return Math.random() < 0.4 ? "crucian" : Math.random() < 0.7 ? "tilapia" : "goldfish";
  if (radius < 44) return Math.random() < 0.4 ? "trout" : Math.random() < 0.7 ? "mackerel" : "seabass";
  if (radius < 72) return Math.random() < 0.45 ? "carp" : Math.random() < 0.8 ? "salmon" : "catfish";
  if (radius < 104) return Math.random() < 0.55 ? "grassCarp" : "silverCarp";
  return Math.random() < 0.7 ? "tuna" : "catfish";
}

function getFishSpecies(id) {
  return fishSpecies.find((item) => item.id === id) || fishSpecies[0];
}

function playerScaleFromMass(mass) {
  const g = Math.max(0, mass);
  return 1 + Math.pow(g, 0.6) * 0.17;
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resetGame() {
  world.running = true;
  world.paused = false;
  world.gameOver = false;
  world.lastTime = performance.now();
  world.spawnTimer = 0;
  world.bubbleTimer = 0;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.fishes = [];
  world.bubbles = [];
  world.pointer.active = false;

  player.x = world.width * 0.35;
  player.y = world.height * 0.5;
  player.mass = 0;
  player.radius = BASE_RADIUS;
  player.speed = 360;
  player.angle = 0;
  player.invincible = 1.2;

  makePlants();
  for (let i = 0; i < 22; i += 1) spawnFish(true);
  for (let i = 0; i < 30; i += 1) spawnBubble(true);
  updateHud();
  reportScore(false, true);
  hideOverlay();
  pauseBtn.textContent = "暂停";
}

function makePlants() {
  world.plants = Array.from({ length: 34 }, () => ({
    x: random(0, world.width),
    height: random(34, 128),
    sway: random(0, Math.PI * 2),
    width: random(8, 18),
  }));
}

function spawnFish(initial = false) {
  const playerScale = player.radius / BASE_RADIUS;
  const side = Math.random() > 0.5 ? "left" : "right";
  const sizeBias = Math.random();
  const scaleBand = sizeBias < 0.5 ? 0 : sizeBias < 0.86 ? 1 : 2;
  const radiusBase =
    scaleBand === 0
      ? random(8, Math.max(12, player.radius * 0.72))
      : scaleBand === 1
        ? random(player.radius * 0.65, player.radius * 1.08)
        : random(player.radius * 1.08, player.radius * (Math.random() < 0.78 ? 2.05 : 2.85));
  const maxRadius = clamp(world.height * 0.38 + playerScale * 6, 110, Math.min(world.height * 0.46, MAX_PLAYER_RADIUS * 0.95));
  const safeRadius = clamp(radiusBase, 7, maxRadius);
  const speed = random(58, 176) + Math.min(playerScale * 10, 92);
  const direction = side === "left" ? 1 : -1;
  const speciesId = pickFishSpecies(safeRadius);

  world.fishes.push({
    x: initial ? random(0, world.width) : side === "left" ? -120 : world.width + 120,
    y: random(70, world.height - 70),
    radius: safeRadius,
    speed,
    direction,
    color: fishColors[Math.floor(random(0, fishColors.length))],
    species: getFishSpecies(speciesId),
    seed: Math.floor(random(1, 2 ** 31 - 1)),
    wave: random(0, Math.PI * 2),
    wobble: random(10, 38),
    edible: safeRadius < player.radius * 0.92,
  });
}

function spawnBubble(initial = false) {
  world.bubbles.push({
    x: random(0, world.width),
    y: initial ? random(0, world.height) : world.height + 20,
    radius: random(2, 7),
    speed: random(20, 72),
    drift: random(-18, 18),
    alpha: random(0.16, 0.46),
  });
}

function setOverlay(kicker, title, text, buttonText = "再玩一次") {
  overlayKicker.textContent = kicker;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startBtn.textContent = buttonText;
  roundRankingEl.classList.add("hidden");
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  roundRankingEl.classList.add("hidden");
  overlay.classList.add("hidden");
}

function updateHud() {
  scoreEl.textContent = String(world.score);
  sizeEl.textContent = `${(player.radius / BASE_RADIUS).toFixed(1)}x`;
  comboEl.textContent = String(world.combo);
}

function setConnectionStatus(text, online = true) {
  connectionStatusEl.textContent = text;
  connectionStatusEl.classList.toggle("offline", !online);
}

function renderLeaderboard(players = []) {
  multiplayer.latestPlayers = players;
  if (!players.length) {
    leaderboardListEl.innerHTML = '<li class="empty-rank">等待玩家加入</li>';
    rankEl.textContent = "-";
    return;
  }

  const current = players.find((item) => item.id === multiplayer.playerId);
  rankEl.textContent = current ? `#${current.rank}` : "-";

  leaderboardListEl.innerHTML = players
    .slice(0, 12)
    .map((item) => {
      const isYou = item.id === multiplayer.playerId;
      const state = item.online ? "在线" : "离线";
      return `
        <li class="rank-row${isYou ? " is-you" : ""}">
          <span class="rank-position">${item.rank}</span>
          <span class="rank-player">
            <strong>${escapeHtml(item.label)}${isYou ? " · YOU" : ""}</strong>
            <span>${state} · 最高 ${item.bestScore}</span>
          </span>
          <span class="rank-score">
            <strong>${item.currentScore}</strong>
            <span>当前分</span>
          </span>
        </li>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchMultiplayerState() {
  if (!multiplayer.enabled) {
    setConnectionStatus("本地模式", false);
    playerIdEl.textContent = "启动服务器后开启多人";
    return;
  }

  try {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (response.status === 404) {
      multiplayer.enabled = false;
      setConnectionStatus("Pages 模式", false);
      playerIdEl.textContent = "多人需本地运行 npm start";
      renderLeaderboard([]);
      return;
    }
    if (!response.ok) throw new Error("Failed to load player");
    const data = await response.json();
    multiplayer.playerId = data.player.id;
    multiplayer.playerLabel = data.player.label;
    playerIdEl.textContent = data.player.label;
    setConnectionStatus("已连接", true);
    renderLeaderboard(data.players);
    renderRoundRanking(data.roundPlayers, false);
    connectLeaderboardStream();
  } catch (error) {
    setConnectionStatus("离线", false);
    playerIdEl.textContent = "服务器不可用";
  }
}

function connectLeaderboardStream() {
  if (!multiplayer.enabled || !window.EventSource) return;

  const events = new EventSource("/api/events");
  events.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    setConnectionStatus("已连接", true);
    renderLeaderboard(data.players);
    renderRoundRanking(data.roundPlayers, false);
  });
  events.addEventListener("error", () => {
    setConnectionStatus("离线", false);
  });
}

async function reportScore(ended = false, force = false) {
  if (!multiplayer.enabled || !multiplayer.playerId) return;

  const now = performance.now();
  if (!force && !ended && now - multiplayer.lastScoreSync < multiplayer.syncInterval) return;
  multiplayer.lastScoreSync = now;

  try {
    const response = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: world.score,
        size: player.radius / BASE_RADIUS,
        ended,
      }),
      keepalive: ended,
    });
    if (!response.ok) throw new Error("Failed to submit score");
    const data = await response.json();
    setConnectionStatus("已连接", true);
    renderLeaderboard(data.players);
    renderRoundRanking(data.roundPlayers, false);
    return data;
  } catch (error) {
    setConnectionStatus("离线", false);
  }
}

function renderRoundRanking(players = [], show = false) {
  multiplayer.latestRoundPlayers = players || [];
  if (!show) return;

  const rows = multiplayer.latestRoundPlayers.slice(0, 8);
  if (!rows.length) {
    roundRankingEl.innerHTML = '<h3>本局排行榜</h3><p>等待分数同步</p>';
    roundRankingEl.classList.remove("hidden");
    return;
  }

  roundRankingEl.innerHTML = `
    <h3>本局排行榜</h3>
    <ol>
      ${rows
        .map((item) => {
          const isYou = item.id === multiplayer.playerId;
          return `
            <li class="${isYou ? "is-you" : ""}">
              <span>#${item.rank} ${escapeHtml(item.label)}${isYou ? " · YOU" : ""}</span>
              <strong>${item.lastScore}</strong>
            </li>
          `;
        })
        .join("")}
    </ol>
  `;
  roundRankingEl.classList.remove("hidden");
}

function resizePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const client = event.touches ? event.touches[0] : event;
  world.pointer.x = ((client.clientX - rect.left) / rect.width) * world.width;
  world.pointer.y = ((client.clientY - rect.top) / rect.height) * world.height;
  world.pointer.active = true;
}

function eatFish(fish) {
  const comboBonus = Math.min(world.combo * 2, 40);
  const points = Math.round(fish.radius * 2 + comboBonus);
  world.score += points;
  world.combo += 1;
  world.comboTimer = 2.1;
  player.mass += fish.radius / Math.max(16, player.radius * 0.55);
  player.radius = clamp(BASE_RADIUS * playerScaleFromMass(player.mass), BASE_RADIUS, MAX_PLAYER_RADIUS);
  player.speed = clamp(380 - player.radius * 0.95, 120, 360);
  updateHud();
  reportScore();
}

function endGame() {
  world.gameOver = true;
  world.running = false;
  setOverlay(
    "游戏结束",
    `最终得分 ${world.score}`,
    `你长到了 ${(player.radius / BASE_RADIUS).toFixed(1)}x。避开红色危险边缘的鱼，先吃更小的鱼继续成长。`,
  );
  roundRankingEl.innerHTML = "<h3>本局排行榜</h3><p>同步分数中</p>";
  roundRankingEl.classList.remove("hidden");
  reportScore(true, true).then((data) => {
    if (data?.roundPlayers) renderRoundRanking(data.roundPlayers, true);
  });
}

function togglePause() {
  if (!world.running || world.gameOver) return;
  world.paused = !world.paused;
  pauseBtn.textContent = world.paused ? "继续" : "暂停";
  if (world.paused) {
    setOverlay("已暂停", "水流暂时静止", "按空格或点击继续回到游戏。", "继续");
  } else {
    hideOverlay();
    world.lastTime = performance.now();
  }
}

function updatePlayer(dt) {
  player.invincible = Math.max(0, player.invincible - dt);
  let vx = 0;
  let vy = 0;

  if (world.keys.has("arrowleft") || world.keys.has("a")) vx -= 1;
  if (world.keys.has("arrowright") || world.keys.has("d")) vx += 1;
  if (world.keys.has("arrowup") || world.keys.has("w")) vy -= 1;
  if (world.keys.has("arrowdown") || world.keys.has("s")) vy += 1;

  if (world.pointer.active) {
    const dx = world.pointer.x - player.x;
    const dy = world.pointer.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > 8) {
      vx += dx / distance;
      vy += dy / distance;
    }
  }

  const length = Math.hypot(vx, vy);
  if (length > 0) {
    vx /= length;
    vy /= length;
    player.x += vx * player.speed * dt;
    player.y += vy * player.speed * dt;
    player.targetAngle = Math.atan2(vy, vx);
  }

  player.x = clamp(player.x, player.radius, world.width - player.radius);
  player.y = clamp(player.y, player.radius, world.height - player.radius);
  player.angle += Math.atan2(Math.sin(player.targetAngle - player.angle), Math.cos(player.targetAngle - player.angle)) * 0.16;
}

function updateFishes(dt) {
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0 && world.fishes.length < 46) {
    spawnFish();
    world.spawnTimer = random(0.22, 0.62);
  }

  for (let i = world.fishes.length - 1; i >= 0; i -= 1) {
    const fish = world.fishes[i];
    fish.wave += dt * 2.8;
    fish.x += fish.direction * fish.speed * dt;
    fish.y += Math.sin(fish.wave) * fish.wobble * dt;
    fish.edible = fish.radius < player.radius * 0.92;

    const offscreen = fish.direction === 1 ? fish.x > world.width + 150 : fish.x < -150;
    if (offscreen) {
      world.fishes.splice(i, 1);
      continue;
    }

    const distance = Math.hypot(player.x - fish.x, player.y - fish.y);
    const hitRange = player.radius * 0.78 + fish.radius * 0.72;
    if (distance < hitRange) {
      if (fish.edible) {
        eatFish(fish);
        world.fishes.splice(i, 1);
      } else if (player.invincible <= 0) {
        endGame();
        return;
      }
    }
  }
}

function updateBubbles(dt) {
  world.bubbleTimer -= dt;
  if (world.bubbleTimer <= 0) {
    spawnBubble();
    world.bubbleTimer = random(0.08, 0.22);
  }

  for (let i = world.bubbles.length - 1; i >= 0; i -= 1) {
    const bubble = world.bubbles[i];
    bubble.y -= bubble.speed * dt;
    bubble.x += bubble.drift * dt;
    if (bubble.y < -20) world.bubbles.splice(i, 1);
  }
}

function update(dt) {
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) {
      world.combo = 0;
      updateHud();
    }
  }

  updatePlayer(dt);
  updateFishes(dt);
  updateBubbles(dt);
  reportScore();
}

function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, world.height);
  gradient.addColorStop(0, "#0a4161");
  gradient.addColorStop(0.5, "#07304d");
  gradient.addColorStop(1, "#02101c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#e6fbff";
  ctx.lineWidth = 2;
  for (let y = 80; y < world.height; y += 92) {
    ctx.beginPath();
    for (let x = -40; x <= world.width + 40; x += 36) {
      const wave = Math.sin(x * 0.018 + time * 0.0012 + y * 0.02) * 10;
      if (x === -40) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(3, 9, 15, 0.42)";
  ctx.fillRect(0, world.height - 42, world.width, 42);

  for (const plant of world.plants) {
    const sway = Math.sin(time * 0.0018 + plant.sway) * 10;
    ctx.strokeStyle = "rgba(67, 217, 173, 0.38)";
    ctx.lineWidth = plant.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(plant.x, world.height - 18);
    ctx.quadraticCurveTo(plant.x + sway, world.height - plant.height * 0.55, plant.x + sway * 0.45, world.height - plant.height);
    ctx.stroke();
  }
}

function createFishBodyPath(halfLength, halfHeight) {
  const headX = halfLength;
  const midX = halfLength * 0.12;
  const tailX = -halfLength;
  const tailPinchX = -halfLength * 0.62;
  const tailPinchY = halfHeight * 0.36;
  const path = new Path2D();
  path.moveTo(headX, 0);
  path.bezierCurveTo(halfLength * 0.82, -halfHeight * 0.92, midX, -halfHeight, tailPinchX, -halfHeight * 0.58);
  path.bezierCurveTo(tailX * 0.92, -halfHeight * 0.45, tailX, -tailPinchY, tailX, 0);
  path.bezierCurveTo(tailX, tailPinchY, tailX * 0.92, halfHeight * 0.45, tailPinchX, halfHeight * 0.58);
  path.bezierCurveTo(midX, halfHeight, halfLength * 0.82, halfHeight * 0.92, headX, 0);
  path.closePath();
  return path;
}

function drawScaleTexture(bodyPath, halfLength, halfHeight, radius, density, alpha) {
  ctx.save();
  ctx.clip(bodyPath);
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.lineWidth = Math.max(0.7, radius * 0.012);
  const rows = Math.max(3, Math.floor(density));
  for (let row = 0; row < rows; row += 1) {
    const t = rows === 1 ? 0 : row / (rows - 1);
    const y = -halfHeight * 0.62 + t * halfHeight * 1.24;
    const cols = Math.max(6, Math.floor((halfLength / Math.max(10, radius)) * 9));
    for (let col = 0; col < cols; col += 1) {
      const x = -halfLength * 0.68 + (col / cols) * halfLength * 1.38 + (row % 2 ? radius * 0.14 : 0);
      const r = radius * (0.09 + (row % 3) * 0.01);
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFishRealistic(fish, isPlayer = false) {
  const direction = isPlayer ? Math.cos(player.angle) >= 0 ? 1 : -1 : fish.direction;
  const radius = fish.radius;
  const dangerous = !isPlayer && !fish.edible;
  const species = (isPlayer ? playerSpecies : fish.species) || playerSpecies;
  const seed = fish.seed || 1;
  const rand = mulberry32(seed);
  const waveSource = fish.wave || performance.now() * 0.004;
  const tailWave = Math.sin(waveSource * 2.2) * radius * 0.12;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  if (isPlayer) ctx.rotate(player.angle);
  else if (direction < 0) ctx.scale(-1, 1);

  const halfHeight = radius;
  const halfLength = radius * species.bodyRatio;
  const tailLength = Math.max(radius * 0.9, halfLength * (species.tailSize || 0.22));
  const tailBaseX = -halfLength * 0.95;
  const headX = halfLength * 0.93;

  const bodyPath = createFishBodyPath(halfLength, halfHeight);

  const gBase = ctx.createLinearGradient(headX, -halfHeight, -halfLength * 0.9, halfHeight);
  if (isPlayer) {
    gBase.addColorStop(0, "#f7ffff");
    gBase.addColorStop(0.28, "#18e0ff");
    gBase.addColorStop(1, "#0674ff");
  } else {
    gBase.addColorStop(0, species.palette?.main || fish.color);
    gBase.addColorStop(0.55, species.palette?.secondary || fish.color);
    gBase.addColorStop(1, species.palette?.main || fish.color);
  }

  ctx.fillStyle = gBase;
  ctx.strokeStyle = isPlayer ? "rgba(255, 255, 255, 0.62)" : "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = Math.max(1, radius * 0.028);
  if (isPlayer) {
    ctx.shadowColor = "rgba(24, 224, 255, 0.65)";
    ctx.shadowBlur = 16;
  }
  ctx.fill(bodyPath);
  ctx.stroke(bodyPath);
  ctx.shadowBlur = 0;

  if (!isPlayer) {
    ctx.save();
    ctx.clip(bodyPath);
    const backShade = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
    backShade.addColorStop(0, "rgba(0, 0, 0, 0.34)");
    backShade.addColorStop(0.45, "rgba(0, 0, 0, 0)");
    backShade.addColorStop(1, "rgba(255, 255, 255, 0.06)");
    ctx.fillStyle = backShade;
    ctx.fillRect(-halfLength * 1.05, -halfHeight * 1.05, halfLength * 2.1, halfHeight * 2.1);

    const spec = ctx.createLinearGradient(headX, -halfHeight * 0.25, -halfLength, halfHeight * 0.65);
    spec.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    spec.addColorStop(0.35, "rgba(255, 255, 255, 0.0)");
    ctx.fillStyle = spec;
    ctx.beginPath();
    ctx.ellipse(halfLength * 0.05, -halfHeight * 0.18, halfLength * 0.75, halfHeight * 0.18, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const tailHalf = halfHeight * (species.tail === "lunate" ? 0.85 : 0.62);
  ctx.beginPath();
  if (species.tail === "rounded") {
    ctx.moveTo(tailBaseX, -tailHalf);
    ctx.quadraticCurveTo(tailBaseX - tailLength * 0.75, 0 + tailWave, tailBaseX, tailHalf);
    ctx.quadraticCurveTo(tailBaseX - tailLength * 0.2, 0 + tailWave, tailBaseX, -tailHalf);
  } else if (species.tail === "truncate") {
    ctx.moveTo(tailBaseX, -tailHalf);
    ctx.lineTo(tailBaseX - tailLength, -tailHalf * 0.75 + tailWave);
    ctx.lineTo(tailBaseX - tailLength, tailHalf * 0.75 + tailWave);
    ctx.lineTo(tailBaseX, tailHalf);
  } else if (species.tail === "pointed") {
    ctx.moveTo(tailBaseX, -tailHalf);
    ctx.lineTo(tailBaseX - tailLength, 0 + tailWave);
    ctx.lineTo(tailBaseX, tailHalf);
  } else {
    const notch = tailHalf * (species.tail === "lunate" ? 0.65 : 0.42);
    ctx.moveTo(tailBaseX, 0);
    ctx.lineTo(tailBaseX - tailLength, -tailHalf + tailWave);
    ctx.lineTo(tailBaseX - tailLength + notch, 0 + tailWave * 0.4);
    ctx.lineTo(tailBaseX - tailLength, tailHalf + tailWave);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const finColor = isPlayer ? "rgba(255, 255, 255, 0.55)" : `rgba(255, 255, 255, ${dangerous ? 0.22 : 0.18})`;
  ctx.fillStyle = finColor;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = Math.max(1, radius * 0.03);

  if (species.finStyle?.includes("spinyDorsal") || species.finStyle?.includes("longDorsal")) {
    const spikes = species.finStyle.includes("spinyDorsal") ? 6 : 3;
    for (let i = 0; i < spikes; i += 1) {
      const t = i / (spikes - 1 || 1);
      const x = -halfLength * 0.15 + t * halfLength * 0.8;
      const h = halfHeight * (species.finStyle.includes("spinyDorsal") ? 0.62 : 0.85) * (0.85 + rand() * 0.3);
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.22, -halfHeight * 0.82);
      ctx.lineTo(x + radius * 0.12, -halfHeight - h);
      ctx.lineTo(x + radius * 0.26, -halfHeight * 0.76);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (species.finStyle?.includes("finlets")) {
    for (let i = 0; i < 4; i += 1) {
      const x = -halfLength * 0.55 - i * radius * 0.32;
      ctx.beginPath();
      ctx.moveTo(x, -halfHeight * 0.58);
      ctx.lineTo(x - radius * 0.18, -halfHeight * 0.92);
      ctx.lineTo(x + radius * 0.18, -halfHeight * 0.62);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (species.finStyle?.includes("longSpines")) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = Math.max(1, radius * 0.018);
    for (let i = 0; i < 10; i += 1) {
      const t = i / 9;
      const x = -halfLength * 0.1 + t * halfLength * 0.7;
      const h = halfHeight * (1.0 + rand() * 0.9);
      ctx.beginPath();
      ctx.moveTo(x, -halfHeight * 0.72);
      ctx.lineTo(x - radius * 0.1, -halfHeight - h);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.beginPath();
    ctx.ellipse(halfLength * 0.05, halfHeight * 0.25, halfLength * 0.28, halfHeight * 0.55, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = finColor;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.18)";
  ctx.lineWidth = Math.max(1, radius * 0.03);
  ctx.beginPath();
  ctx.ellipse(halfLength * 0.18, halfHeight * 0.38, halfLength * 0.22, halfHeight * 0.28, -0.55, 0, Math.PI * 2);
  ctx.fill();

  if (species.pattern && species.pattern !== "none") {
    ctx.save();
    ctx.clip(bodyPath);
    if (species.pattern.includes("verticalBars") || species.pattern.includes("verticalStripes")) {
      const bars = 6;
      for (let i = 0; i < bars; i += 1) {
        const t = i / (bars - 1);
        const x = -halfLength * 0.55 + t * halfLength * 1.1;
        ctx.fillStyle = `rgba(0, 0, 0, ${species.pattern.includes("lion") ? 0.18 : 0.14})`;
        ctx.fillRect(x - radius * 0.14, -halfHeight, radius * 0.16, halfHeight * 2);
      }
      ctx.fillStyle = `rgba(255, 255, 255, 0.14)`;
      ctx.fillRect(-halfLength * 0.65, -halfHeight * 0.22, halfLength * 1.3, halfHeight * 0.16);
    } else if (species.pattern === "3WhiteBands") {
      const bands = [-0.34, 0.02, 0.36];
      for (const band of bands) {
        const x = -halfLength * 0.1 + band * halfLength;
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillRect(x - halfLength * 0.12, -halfHeight, halfLength * 0.18, halfHeight * 2);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
        ctx.lineWidth = Math.max(1, radius * 0.02);
        ctx.strokeRect(x - halfLength * 0.12, -halfHeight, halfLength * 0.18, halfHeight * 2);
      }
    } else if (species.pattern.includes("speckles")) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      for (let i = 0; i < 18; i += 1) {
        const x = -halfLength * 0.45 + rand() * halfLength * 0.95;
        const y = -halfHeight * 0.45 + rand() * halfHeight * 0.9;
        const r = Math.max(1.2, radius * (0.018 + rand() * 0.02));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(212, 106, 122, 0.35)`;
      ctx.fillRect(-halfLength * 0.55, -halfHeight * 0.12, halfLength * 1.1, halfHeight * 0.22);
    } else if (species.pattern === "wavyBackStripes") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
      ctx.lineWidth = Math.max(1, radius * 0.02);
      for (let i = 0; i < 5; i += 1) {
        const y = -halfHeight * 0.6 + i * halfHeight * 0.18;
        ctx.beginPath();
        for (let x = -halfLength * 0.7; x <= halfLength * 0.4; x += radius * 0.35) {
          const wave = Math.sin(x * 0.04 + i * 0.9 + waveSource * 3) * radius * 0.08;
          if (x === -halfLength * 0.7) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
    } else if (species.pattern === "sparseSpots") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      for (let i = 0; i < 10; i += 1) {
        const x = -halfLength * 0.4 + rand() * halfLength * 0.9;
        const y = -halfHeight * 0.4 + rand() * halfHeight * 0.8;
        const r = Math.max(1.1, radius * (0.016 + rand() * 0.02));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (species.pattern === "subtleScales") {
      drawScaleTexture(bodyPath, halfLength, halfHeight, radius, 5 + radius * 0.02, 0.12);
    } else if (species.pattern === "largeScales") {
      drawScaleTexture(bodyPath, halfLength, halfHeight, radius, 4 + radius * 0.015, 0.16);
    } else if (species.pattern === "metallic") {
      const sheen = ctx.createLinearGradient(headX, -halfHeight, -halfLength, halfHeight);
      sheen.addColorStop(0, "rgba(255, 255, 255, 0.55)");
      sheen.addColorStop(0.25, "rgba(255, 255, 255, 0.12)");
      sheen.addColorStop(0.7, "rgba(0, 0, 0, 0.08)");
      sheen.addColorStop(1, "rgba(255, 255, 255, 0.08)");
      ctx.fillStyle = sheen;
      ctx.fillRect(-halfLength * 1.05, -halfHeight * 1.05, halfLength * 2.1, halfHeight * 2.1);
    } else if (species.pattern === "darkBackLightBelly") {
      const shade = ctx.createLinearGradient(0, -halfHeight, 0, halfHeight);
      shade.addColorStop(0, "rgba(0, 0, 0, 0.28)");
      shade.addColorStop(0.55, "rgba(0, 0, 0, 0)");
      shade.addColorStop(1, "rgba(255, 255, 255, 0.08)");
      ctx.fillStyle = shade;
      ctx.fillRect(-halfLength * 1.05, -halfHeight * 1.05, halfLength * 2.1, halfHeight * 2.1);
    }
    ctx.restore();
  }

  const eyeX = headX - halfLength * (species.eyePos?.x || 0.18);
  const eyeY = -halfHeight * (species.eyePos?.y || 0.07);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, Math.max(2, radius * 0.095), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#06101a";
  ctx.beginPath();
  ctx.arc(eyeX + radius * 0.016, eyeY + radius * 0.01, Math.max(1.4, radius * 0.055), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
  ctx.lineWidth = Math.max(1, radius * 0.02);
  ctx.beginPath();
  ctx.arc(headX + radius * 0.06, halfHeight * 0.08, radius * 0.18, -0.2, 0.7);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = Math.max(1, radius * 0.018);
  for (let i = 0; i < 3; i += 1) {
    const t = i / 2;
    const x = halfLength * 0.32 - t * halfLength * 0.12;
    ctx.beginPath();
    ctx.arc(x, -halfHeight * 0.08, halfHeight * 0.55, Math.PI * 0.92, Math.PI * 1.08);
    ctx.stroke();
  }

  if (species.finStyle?.includes("whiskers") || species.extras?.barbels) {
    const count = species.extras?.barbels || 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = Math.max(1, radius * 0.02);
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1 || 1);
      const y = -halfHeight * 0.06 + t * halfHeight * 0.22;
      ctx.beginPath();
      ctx.moveTo(headX + radius * 0.02, y);
      ctx.quadraticCurveTo(headX + radius * 0.42, y - radius * 0.18, headX + radius * 0.85, y + radius * 0.12);
      ctx.stroke();
    }
  }

  if (isPlayer) {
    ctx.fillStyle = "#ffd95c";
    ctx.strokeStyle = "rgba(4, 19, 28, 0.35)";
    ctx.lineWidth = Math.max(1.5, radius * 0.03);
    ctx.beginPath();
    ctx.moveTo(halfLength * 0.04, -halfHeight * 1.05);
    ctx.lineTo(halfLength * 0.22, -halfHeight * 1.42);
    ctx.lineTo(halfLength * 0.4, -halfHeight * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (dangerous) {
    ctx.strokeStyle = "rgba(255, 96, 96, 0.72)";
    ctx.lineWidth = Math.max(2, radius * 0.045);
    ctx.stroke(bodyPath);
  }

  if (isPlayer && player.invincible > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + Math.sin(performance.now() * 0.016) * 0.14})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfLength * 1.05, halfHeight * 1.1, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

const FISH_RENDER_STYLE = "cartoon";

function drawFishCartoon(fish, isPlayer = false) {
  const direction = isPlayer ? Math.cos(player.angle) >= 0 ? 1 : -1 : fish.direction;
  const radius = fish.radius;
  const dangerous = !isPlayer && !fish.edible;
  const species = (isPlayer ? playerSpecies : fish.species) || playerSpecies;
  const seed = fish.seed || 1;
  const rand = mulberry32(seed);
  const waveSource = fish.wave || performance.now() * 0.004;
  const wag = Math.sin(waveSource * 2.4) * radius * 0.12;

  const outline = "rgba(0, 0, 0, 0.6)";
  const lineWidth = Math.max(2, radius * 0.07);
  const palette = isPlayer
    ? { main: "#18e0ff", secondary: "#0674ff", accent: "#f7ffff" }
    : species.palette || { main: fish.color, secondary: fish.color, accent: "#ffffff" };

  ctx.save();
  ctx.translate(fish.x, fish.y);
  if (isPlayer) ctx.rotate(player.angle);
  else if (direction < 0) ctx.scale(-1, 1);

  const bodyRx = radius * Math.max(1.2, species.bodyRatio * 0.68);
  const bodyRy = radius * 0.82;
  const bodyCx = radius * 0.15;
  const tailBaseX = bodyCx - bodyRx * 0.92;
  const tailLen = Math.max(radius * 0.9, bodyRx * (species.tailSize || 0.22));
  const tailHalfH = bodyRy * 0.75;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = outline;
  ctx.lineWidth = lineWidth;

  ctx.fillStyle = palette.secondary || palette.main;
  ctx.beginPath();
  if (species.tail === "lunate" || species.tail === "forked") {
    const notch = tailHalfH * 0.55;
    ctx.moveTo(tailBaseX, 0);
    ctx.lineTo(tailBaseX - tailLen, -tailHalfH + wag);
    ctx.lineTo(tailBaseX - tailLen + notch, 0 + wag * 0.2);
    ctx.lineTo(tailBaseX - tailLen, tailHalfH + wag);
    ctx.closePath();
  } else if (species.tail === "truncate") {
    ctx.moveTo(tailBaseX, -tailHalfH);
    ctx.lineTo(tailBaseX - tailLen, -tailHalfH * 0.85 + wag);
    ctx.lineTo(tailBaseX - tailLen, tailHalfH * 0.85 + wag);
    ctx.lineTo(tailBaseX, tailHalfH);
    ctx.closePath();
  } else if (species.tail === "pointed") {
    ctx.moveTo(tailBaseX, -tailHalfH);
    ctx.lineTo(tailBaseX - tailLen, 0 + wag);
    ctx.lineTo(tailBaseX, tailHalfH);
    ctx.closePath();
  } else {
    ctx.moveTo(tailBaseX, -tailHalfH);
    ctx.quadraticCurveTo(tailBaseX - tailLen * 0.8, 0 + wag, tailBaseX, tailHalfH);
    ctx.quadraticCurveTo(tailBaseX - tailLen * 0.25, 0 + wag * 0.5, tailBaseX, -tailHalfH);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.main || fish.color;
  ctx.beginPath();
  ctx.ellipse(bodyCx, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(bodyCx, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.beginPath();
  ctx.ellipse(bodyCx + bodyRx * 0.05, bodyRy * 0.28, bodyRx * 0.96, bodyRy * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.accent ? `${palette.accent}` : "rgba(255, 255, 255, 0.38)";
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.ellipse(bodyCx + bodyRx * 0.25, -bodyRy * 0.35, bodyRx * 0.55, bodyRy * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (species.pattern && species.pattern !== "none") {
    if (species.pattern.includes("verticalBars") || species.pattern.includes("verticalStripes")) {
      const bars = 5;
      ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
      for (let i = 0; i < bars; i += 1) {
        const t = i / (bars - 1);
        const x = bodyCx - bodyRx * 0.6 + t * bodyRx * 1.15;
        ctx.fillRect(x - radius * 0.12, -bodyRy, radius * 0.16, bodyRy * 2);
      }
    } else if (species.pattern === "3WhiteBands") {
      const bands = [-0.32, 0.02, 0.33];
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      for (const band of bands) {
        const x = bodyCx + band * bodyRx * 0.95;
        ctx.fillRect(x - bodyRx * 0.14, -bodyRy, bodyRx * 0.2, bodyRy * 2);
      }
    } else if (species.pattern.includes("speckles") || species.pattern === "sparseSpots") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      const dots = species.pattern.includes("speckles") ? 14 : 9;
      for (let i = 0; i < dots; i += 1) {
        const x = bodyCx - bodyRx * 0.55 + rand() * bodyRx * 1.05;
        const y = -bodyRy * 0.5 + rand() * bodyRy * 1.0;
        const r = Math.max(1.2, radius * (0.05 + rand() * 0.04));
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (species.pattern === "wavyBackStripes") {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
      ctx.lineWidth = Math.max(1.5, radius * 0.04);
      for (let i = 0; i < 4; i += 1) {
        const y = -bodyRy * 0.55 + i * bodyRy * 0.25;
        ctx.beginPath();
        for (let x = bodyCx - bodyRx * 0.65; x <= bodyCx + bodyRx * 0.25; x += radius * 0.55) {
          const wave = Math.sin(x * 0.05 + i * 1.2 + waveSource * 3) * radius * 0.1;
          if (x === bodyCx - bodyRx * 0.65) ctx.moveTo(x, y + wave);
          else ctx.lineTo(x, y + wave);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = outline;
      ctx.lineWidth = lineWidth;
    } else if (species.pattern === "metallic" || species.pattern.includes("Scales")) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.lineWidth = Math.max(1, radius * 0.03);
      for (let i = 0; i < 6; i += 1) {
        const y = -bodyRy * 0.45 + i * bodyRy * 0.18;
        ctx.beginPath();
        ctx.arc(bodyCx - bodyRx * 0.15, y, radius * 0.55, Math.PI * 1.08, Math.PI * 1.92);
        ctx.stroke();
      }
      ctx.strokeStyle = outline;
      ctx.lineWidth = lineWidth;
    }
  }
  ctx.restore();

  ctx.fillStyle = `rgba(255, 255, 255, ${dangerous ? 0.55 : 0.35})`;
  ctx.beginPath();
  ctx.ellipse(bodyCx + bodyRx * 0.1, bodyRy * 0.35, bodyRx * 0.22, bodyRy * 0.18, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (species.finStyle?.includes("spinyDorsal") || species.finStyle?.includes("longDorsal")) {
    const spikes = species.finStyle.includes("spinyDorsal") ? 4 : 2;
    ctx.fillStyle = palette.secondary || palette.main;
    for (let i = 0; i < spikes; i += 1) {
      const t = i / (spikes - 1 || 1);
      const x = bodyCx - bodyRx * 0.1 + t * bodyRx * 0.7;
      const h = bodyRy * (species.finStyle.includes("spinyDorsal") ? 0.55 : 0.75) * (0.9 + rand() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.22, -bodyRy * 0.8);
      ctx.lineTo(x + radius * 0.06, -bodyRy - h);
      ctx.lineTo(x + radius * 0.26, -bodyRy * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  if (dangerous && !(species.finStyle?.includes("spinyDorsal") || species.finStyle?.includes("longDorsal"))) {
    ctx.fillStyle = palette.secondary || palette.main;
    const spikes = 3;
    for (let i = 0; i < spikes; i += 1) {
      const t = i / (spikes - 1 || 1);
      const x = bodyCx + bodyRx * (0.05 + t * 0.55);
      const h = bodyRy * (0.55 + rand() * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.2, -bodyRy * 0.78);
      ctx.lineTo(x + radius * 0.02, -bodyRy - h);
      ctx.lineTo(x + radius * 0.22, -bodyRy * 0.76);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  const expression = dangerous ? 1 : 0;
  const open = clamp(0.2 + Math.abs(wag) / Math.max(1, radius) + (dangerous ? 0.35 : 0.55), 0.35, 1.15);
  const blink = Math.max(0, Math.sin(waveSource * 3.6 + seed * 0.00001));
  const eyeWobble = Math.sin(waveSource * 2.8 + seed * 0.00002) * radius * 0.02;

  const eyeX = bodyCx + bodyRx * 0.62;
  const eyeY = -bodyRy * (dangerous ? 0.22 : 0.18) + eyeWobble;
  const eyeR = Math.max(4.2, radius * (dangerous ? 0.2 : 0.24));
  const pupilR = Math.max(2.6, radius * 0.115);
  const gaze = dangerous ? 0.08 : 0.04;

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeR, eyeR * (0.75 + blink * 0.25), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#08141f";
  ctx.beginPath();
  ctx.arc(eyeX + radius * gaze, eyeY + radius * 0.03, pupilR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.arc(eyeX - pupilR * 0.35, eyeY - pupilR * 0.35, Math.max(1.3, pupilR * 0.5), 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(2, radius * 0.065);
  ctx.beginPath();
  if (dangerous) {
    ctx.moveTo(eyeX - eyeR * 1.05, eyeY - eyeR * 1.2);
    ctx.lineTo(eyeX + eyeR * 0.75, eyeY - eyeR * 0.55);
  } else {
    ctx.moveTo(eyeX - eyeR * 0.95, eyeY - eyeR * 1.05);
    ctx.quadraticCurveTo(eyeX + eyeR * 0.2, eyeY - eyeR * 1.45, eyeX + eyeR * 0.95, eyeY - eyeR * 0.85);
  }
  ctx.stroke();

  const mouthCx = bodyCx + bodyRx * 0.82;
  const mouthCy = bodyRy * (dangerous ? 0.08 : 0.22);
  const mouthR = radius * (dangerous ? 0.42 : 0.5);
  const mouthW = radius * (dangerous ? 0.62 : 0.7);
  const mouthH = radius * open * (dangerous ? 0.58 : 0.62);

  ctx.fillStyle = "rgba(6, 12, 18, 0.85)";
  ctx.beginPath();
  ctx.ellipse(mouthCx, mouthCy, mouthW, mouthH, dangerous ? 0.1 : 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!dangerous) {
    ctx.fillStyle = "rgba(255, 120, 160, 0.9)";
    ctx.beginPath();
    ctx.ellipse(mouthCx + mouthW * 0.12, mouthCy + mouthH * 0.25, mouthW * 0.38, mouthH * 0.33, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  const teethTop = dangerous ? 7 : 4;
  const teethBottom = dangerous ? 5 : 3;
  for (let i = 0; i < teethTop; i += 1) {
    const t = (i + 0.5) / teethTop;
    const x = mouthCx - mouthW * 0.7 + t * mouthW * 1.4;
    const y = mouthCy - mouthH * 0.75 + Math.sin(t * Math.PI) * mouthH * 0.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - radius * 0.055, y + radius * 0.16);
    ctx.lineTo(x + radius * 0.055, y + radius * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (let i = 0; i < teethBottom; i += 1) {
    const t = (i + 0.5) / teethBottom;
    const x = mouthCx - mouthW * 0.62 + t * mouthW * 1.24;
    const y = mouthCy + mouthH * 0.72 - Math.sin(t * Math.PI) * mouthH * 0.05;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - radius * 0.05, y - radius * 0.14);
    ctx.lineTo(x + radius * 0.05, y - radius * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = dangerous ? "rgba(255, 120, 120, 0.45)" : "rgba(255, 120, 170, 0.45)";
  ctx.beginPath();
  ctx.arc(bodyCx + bodyRx * 0.54, bodyRy * 0.14, radius * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bodyCx + bodyRx * 0.46, -bodyRy * 0.02, radius * 0.11, 0, Math.PI * 2);
  ctx.fill();

  if (species.finStyle?.includes("whiskers") || species.extras?.barbels) {
    const count = species.extras?.barbels || 4;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = Math.max(2, radius * 0.05);
    for (let i = 0; i < count; i += 1) {
      const t = i / (count - 1 || 1);
      const y = -radius * 0.05 + t * radius * 0.25;
      ctx.beginPath();
      ctx.moveTo(bodyCx + bodyRx * 0.92, y);
      ctx.quadraticCurveTo(bodyCx + bodyRx * 1.2, y - radius * 0.2, bodyCx + bodyRx * 1.45, y + radius * 0.1);
      ctx.stroke();
    }
    ctx.strokeStyle = outline;
    ctx.lineWidth = lineWidth;
  }

  if (isPlayer) {
    ctx.fillStyle = "#ffd95c";
    ctx.strokeStyle = outline;
    ctx.lineWidth = Math.max(2.2, radius * 0.07);
    const crownY = -bodyRy * 1.05;
    ctx.beginPath();
    ctx.moveTo(bodyCx - radius * 0.12, crownY);
    ctx.lineTo(bodyCx + radius * 0.02, crownY - radius * 0.38);
    ctx.lineTo(bodyCx + radius * 0.16, crownY);
    ctx.lineTo(bodyCx + radius * 0.3, crownY - radius * 0.32);
    ctx.lineTo(bodyCx + radius * 0.44, crownY);
    ctx.lineTo(bodyCx - radius * 0.12, crownY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (dangerous) {
    ctx.strokeStyle = "rgba(255, 86, 86, 0.85)";
    ctx.lineWidth = Math.max(2.5, radius * 0.085);
    ctx.beginPath();
    ctx.ellipse(bodyCx, 0, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (isPlayer && player.invincible > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + Math.sin(performance.now() * 0.016) * 0.14})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(bodyCx, 0, bodyRx * 1.05, bodyRy * 1.12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFish(fish, isPlayer = false) {
  if (FISH_RENDER_STYLE === "cartoon") {
    drawFishCartoon(fish, isPlayer);
    return;
  }
  drawFishRealistic(fish, isPlayer);
}

function drawPlayerMarker() {
  const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.5;
  const y = player.y - player.radius * 1.56;
  const pillWidth = clamp(player.radius * 2.1, 66, 104);
  const pillHeight = 30;

  ctx.save();
  ctx.strokeStyle = `rgba(24, 224, 255, ${0.32 + pulse * 0.28})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, player.radius * 1.42, player.radius * 1.02, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(2, 12, 22, 0.88)";
  ctx.strokeStyle = "rgba(24, 224, 255, 0.95)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(player.x - pillWidth / 2, y - pillHeight / 2, pillWidth, pillHeight, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#18e0ff";
  ctx.beginPath();
  ctx.moveTo(player.x - 8, y + pillHeight / 2 - 1);
  ctx.lineTo(player.x + 8, y + pillHeight / 2 - 1);
  ctx.lineTo(player.x, y + pillHeight / 2 + 12);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f8fbff";
  ctx.font = "800 15px Inter, Arial, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("YOU", player.x, y + 1);
  ctx.restore();
}

function drawBubbles() {
  ctx.save();
  for (const bubble of world.bubbles) {
    ctx.globalAlpha = bubble.alpha;
    ctx.strokeStyle = "#d8fbff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWarnings() {
  ctx.save();
  ctx.font = "800 18px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const fish of world.fishes) {
    if (!fish.edible && Math.abs(fish.x - player.x) < 160 && Math.abs(fish.y - player.y) < 120) {
      ctx.fillStyle = "rgba(255, 107, 107, 0.9)";
      ctx.fillText("!", fish.x, fish.y - fish.radius - 16);
    }
  }
  ctx.restore();
}

function draw(time) {
  drawBackground(time);
  drawBubbles();
  const sorted = [...world.fishes].sort((a, b) => a.radius - b.radius);
  for (const fish of sorted) drawFish(fish);
  drawFish({ ...player, wave: time * 0.004, direction: 1, species: playerSpecies, seed: 7777 }, true);
  drawPlayerMarker();
  drawWarnings();
}

function loop(time) {
  const dt = Math.min((time - world.lastTime) / 1000 || 0, 0.033);
  world.lastTime = time;

  if (world.running && !world.paused && !world.gameOver) update(dt);
  draw(time);
  requestAnimationFrame(loop);
}

canvas.addEventListener("pointerdown", resizePointer);
canvas.addEventListener("pointermove", resizePointer);
canvas.addEventListener("pointerleave", () => {
  world.pointer.active = false;
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(key)) {
    event.preventDefault();
  }
  if (key === " ") togglePause();
  else world.keys.add(key);
});

window.addEventListener("keyup", (event) => {
  world.keys.delete(event.key.toLowerCase());
});

startBtn.addEventListener("click", () => {
  if (world.paused && world.running) {
    togglePause();
  } else {
    resetGame();
  }
});

pauseBtn.addEventListener("click", togglePause);
restartBtn.addEventListener("click", resetGame);

makePlants();
for (let i = 0; i < 18; i += 1) spawnFish(true);
for (let i = 0; i < 24; i += 1) spawnBubble(true);
fetchMultiplayerState();
draw(performance.now());
requestAnimationFrame(loop);
