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

const player = {
  x: canvas.width * 0.35,
  y: canvas.height * 0.5,
  radius: 28,
  mass: 1,
  speed: 330,
  angle: 0,
  targetAngle: 0,
  invincible: 1.2,
  color: "#18e0ff",
};

const fishColors = ["#ffcd5d", "#ff8f70", "#9d7cff", "#c5f467", "#f28cff", "#ff7aa8"];

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
  player.mass = 1;
  player.radius = 28;
  player.speed = 330;
  player.angle = 0;
  player.invincible = 1.2;

  makePlants();
  for (let i = 0; i < 14; i += 1) spawnFish(true);
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
  const playerScale = player.radius / 28;
  const side = Math.random() > 0.5 ? "left" : "right";
  const sizeBias = Math.random();
  const radius =
    sizeBias < 0.62
      ? random(12, player.radius * 0.88)
      : random(player.radius * 0.92, player.radius * 1.65);
  const safeRadius = clamp(radius, 10, 104);
  const speed = random(55, 170) + Math.min(playerScale * 12, 70);
  const direction = side === "left" ? 1 : -1;

  world.fishes.push({
    x: initial ? random(0, world.width) : side === "left" ? -120 : world.width + 120,
    y: random(70, world.height - 70),
    radius: safeRadius,
    speed,
    direction,
    color: fishColors[Math.floor(random(0, fishColors.length))],
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
  sizeEl.textContent = `${(player.radius / 28).toFixed(1)}x`;
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
        size: player.radius / 28,
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
  player.mass += fish.radius / 70;
  player.radius = clamp(28 + player.mass * 6.4, 28, 122);
  player.speed = clamp(340 - player.radius * 0.82, 220, 330);
  updateHud();
  reportScore();
}

function endGame() {
  world.gameOver = true;
  world.running = false;
  setOverlay(
    "游戏结束",
    `最终得分 ${world.score}`,
    `你长到了 ${(player.radius / 28).toFixed(1)}x。避开红色危险边缘的鱼，先吃更小的鱼继续成长。`,
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
  if (world.spawnTimer <= 0 && world.fishes.length < 30) {
    spawnFish();
    world.spawnTimer = random(0.28, 0.72);
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

function drawFish(fish, isPlayer = false) {
  const direction = isPlayer ? Math.cos(player.angle) >= 0 ? 1 : -1 : fish.direction;
  const radius = fish.radius;
  const tail = Math.sin((fish.wave || performance.now() * 0.004) * 2.2) * radius * 0.13;
  const dangerous = !isPlayer && !fish.edible;

  ctx.save();
  ctx.translate(fish.x, fish.y);
  if (isPlayer) ctx.rotate(player.angle);
  else if (direction < 0) ctx.scale(-1, 1);

  const playerGradient = ctx.createLinearGradient(-radius, -radius, radius, radius);
  playerGradient.addColorStop(0, "#f7ffff");
  playerGradient.addColorStop(0.28, "#18e0ff");
  playerGradient.addColorStop(1, "#0674ff");

  ctx.fillStyle = isPlayer ? playerGradient : dangerous ? "#ff6b6b" : fish.color;
  ctx.strokeStyle = isPlayer ? "rgba(255, 255, 255, 0.9)" : dangerous ? "rgba(255, 255, 255, 0.5)" : "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = Math.max(2, radius * 0.06);
  if (isPlayer) {
    ctx.shadowColor = "rgba(24, 224, 255, 0.8)";
    ctx.shadowBlur = 18;
  }

  ctx.beginPath();
  ctx.ellipse(0, 0, radius * (isPlayer ? 1.18 : 1.28), radius * (isPlayer ? 0.82 : 0.76), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(-radius * (isPlayer ? 1.02 : 1.1), 0);
  ctx.lineTo(-radius * (isPlayer ? 1.72 : 1.78), -radius * (isPlayer ? 0.72 : 0.58) + tail);
  ctx.lineTo(-radius * (isPlayer ? 1.42 : 1.68), 0);
  ctx.lineTo(-radius * (isPlayer ? 1.72 : 1.68), radius * (isPlayer ? 0.72 : 0.58) + tail);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isPlayer) {
    ctx.fillStyle = "#ffd95c";
    ctx.strokeStyle = "rgba(4, 19, 28, 0.35)";
    ctx.lineWidth = Math.max(1.5, radius * 0.035);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.18, -radius * 0.78);
    ctx.lineTo(radius * 0.08, -radius * 1.18);
    ctx.lineTo(radius * 0.34, -radius * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
    ctx.beginPath();
    ctx.ellipse(radius * 0.08, radius * 0.25, radius * 0.62, radius * 0.16, -0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
  ctx.beginPath();
  ctx.ellipse(radius * 0.12, -radius * 0.24, radius * 0.55, radius * 0.14, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#06101a";
  ctx.beginPath();
  ctx.arc(radius * 0.72, -radius * 0.18, Math.max(2.5, radius * 0.09), 0, Math.PI * 2);
  ctx.fill();

  if (isPlayer && player.invincible > 0) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 + Math.sin(performance.now() * 0.016) * 0.14})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.48, radius * 0.94, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
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
  drawFish({ ...player, wave: time * 0.004, direction: 1 }, true);
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
