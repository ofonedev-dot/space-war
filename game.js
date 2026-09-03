(() => {
  "use strict";

  const VERSION = "0.1.6";
  const HEX_R = 6;
  const PAL = {
    wall: "#0C0A09",
    hex: "#1C1917",
    line: "#3F3A36",
    type: "#E7E0D6",
    ember: "#D97757",
    dim: "#A8A29E",
    mute: "#78716C",
    raised: "#292524",
    sage: "#6B8F7A",
  };

  const CLASSES = {
    union: {
      id: "union",
      name: "Union",
      tag: "Balanced · move 3 · hull 100",
      blurb: "Patrol hull. Honest guns, honest speed. The default for a reason.",
      hp: 100, move: 3,
      phaserRange: 4, phaserDmg: 18,
      torpRange: 6, torpDmg: 34, torpAmmo: 4,
      collision: 20, color: "#6B8F7A",
    },
    empire: {
      id: "empire",
      name: "Empire",
      tag: "Fast · thin skin · move 4",
      blurb: "A raider. First to the hex, first to leak.",
      hp: 72, move: 4,
      phaserRange: 4, phaserDmg: 16,
      torpRange: 7, torpDmg: 32, torpAmmo: 3,
      collision: 16, color: "#C45C4A",
    },
    web: {
      id: "web",
      name: "Web",
      tag: "Slow · heavy · move 2",
      blurb: "Lattice fortress. Crawls, then holds the lane.",
      hp: 128, move: 2,
      phaserRange: 5, phaserDmg: 22,
      torpRange: 5, torpDmg: 40, torpAmmo: 5,
      collision: 24, color: "#C4A574",
    },
    swarm: {
      id: "swarm",
      name: "Swarm",
      tag: "Fragile · extra move · 5",
      blurb: "Glass dart. Five hexes of regret if you miss.",
      hp: 54, move: 5,
      phaserRange: 3, phaserDmg: 14,
      torpRange: 5, torpDmg: 28, torpAmmo: 3,
      collision: 14, color: "#8B9BB4",
    },
    cube: {
      id: "cube",
      name: "Cube",
      tag: "Tank · short move · 2",
      blurb: "A brick with a reactor. Two hexes, then you endure.",
      hp: 152, move: 2,
      phaserRange: 3, phaserDmg: 20,
      torpRange: 4, torpDmg: 38, torpAmmo: 5,
      collision: 28, color: "#A67C68",
    },
  };

  const RANKS = [
    { min: 0, name: "Cadet", line: "Fresh paint. Unproven guns." },
    { min: 1, name: "Ensign", line: "You lived. The night noticed." },
    { min: 2, name: "Lieutenant", line: "Your plots start to land." },
    { min: 4, name: "Lt. Commander", line: "The grid obeys, sometimes." },
    { min: 6, name: "Commander", line: "Hulls open when you say so." },
    { min: 9, name: "Captain", line: "A seat in the dark, earned." },
    { min: 12, name: "Commodore", line: "Fleets give you the lane." },
    { min: 16, name: "Admiral", line: "The map is a habit now." },
    { min: 20, name: "Fleet Admiral", line: "Nothing left to prove. Fight anyway." },
  ];

  const DIRS = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  ];

  function key(h) { return h.q + "," + h.r; }
  function eq(a, b) { return !!a && !!b && a.q === b.q && a.r === b.r; }
  function hex(q, r) { return { q, r }; }
  function cubeS(h) { return -h.q - h.r; }
  function hexDist(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }
  function hexRound(q, r) {
    const s = -q - r;
    let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
    const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) rq = -rr - rs;
    else if (dr > ds) rr = -rq - rs;
    return hex(rq, rr);
  }
  function inBoard(h) {
    return hexDist(h, hex(0, 0)) <= HEX_R;
  }
  function neighbors(h) {
    return DIRS.map(([dq, dr]) => hex(h.q + dq, h.r + dr));
  }
  function hexLerp(a, b, t) {
    return hexRound(a.q + (b.q - a.q) * t + 1e-6, a.r + (b.r - a.r) * t + 1e-6);
  }
  function hexLine(a, b) {
    const n = hexDist(a, b);
    if (n === 0) return [hex(a.q, a.r)];
    const out = [];
    for (let i = 0; i <= n; i++) out.push(hexLerp(a, b, i / n));
    return out;
  }
  function stepToward(from, to, steps) {
    const n = hexDist(from, to);
    if (n === 0) return hex(from.q, from.r);
    const t = Math.min(1, steps / n);
    return hexLerp(from, to, t);
  }
  function hexesInRange(origin, range) {
    const out = [];
    for (let q = -HEX_R; q <= HEX_R; q++) {
      for (let r = -HEX_R; r <= HEX_R; r++) {
        const h = hex(q, r);
        if (!inBoard(h)) continue;
        if (hexDist(origin, h) <= range) out.push(h);
      }
    }
    return out;
  }
  function allHexes() {
    const out = [];
    for (let q = -HEX_R; q <= HEX_R; q++) {
      for (let r = -HEX_R; r <= HEX_R; r++) {
        const h = hex(q, r);
        if (inBoard(h)) out.push(h);
      }
    }
    return out;
  }
  function hexToPixel(h, layout) {
    const x = layout.size * Math.sqrt(3) * (h.q + h.r / 2) + layout.ox;
    const y = layout.size * (3 / 2) * h.r + layout.oy;
    return { x, y };
  }
  function pixelToHex(x, y, layout) {
    const px = (x - layout.ox) / layout.size;
    const py = (y - layout.oy) / layout.size;
    const q = (Math.sqrt(3) / 3) * px - (1 / 3) * py;
    const r = (2 / 3) * py;
    const h = hexRound(q, r);
    return inBoard(h) ? h : null;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function wins() {
    try { return parseInt(localStorage.getItem("spacewar-wins") || "0", 10) || 0; }
    catch (e) { return 0; }
  }
  function addWin() {
    try { localStorage.setItem("spacewar-wins", String(wins() + 1)); }
    catch (e) { /* ignore */ }
  }
  function rankFor(n) {
    let r = RANKS[0];
    for (const x of RANKS) if (n >= x.min) r = x;
    return r;
  }

  const els = {
    start: document.getElementById("screen-start"),
    game: document.getElementById("screen-game"),
    overlay: document.getElementById("overlay"),
    classList: document.getElementById("class-list"),
    blurb: document.getElementById("class-blurb"),
    engage: document.getElementById("btn-engage"),
    rankChip: document.getElementById("rank-chip"),
    board: document.getElementById("board"),
    hint: document.getElementById("phase-hint"),
    log: document.getElementById("log"),
    turn: document.getElementById("turn-label"),
    hpFill: document.getElementById("hp-fill"),
    hpText: document.getElementById("hp-text"),
    torpPips: document.getElementById("torp-pips"),
    moveRead: document.getElementById("move-readout"),
    fireText: document.getElementById("fire-text"),
    phaser: document.getElementById("btn-phaser"),
    torp: document.getElementById("btn-torp"),
    skip: document.getElementById("btn-skip"),
    go: document.getElementById("btn-go"),
    replot: document.getElementById("btn-replot"),
    again: document.getElementById("btn-again"),
    endKicker: document.getElementById("end-kicker"),
    endTitle: document.getElementById("end-title"),
    endFlavor: document.getElementById("end-flavor"),
    startBg: document.getElementById("start-bg"),
  };
  const ctx = els.board.getContext("2d");
  const bgCtx = els.startBg.getContext("2d");

  const layout = { w: 390, h: 460, size: 16, ox: 195, oy: 230, dpr: 1 };
  const BOARD = allHexes();
  const STARS = Array.from({ length: 70 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3, a: 0.12 + Math.random() * 0.35,
  }));

  const state = {
    screen: "start",
    picked: null,
    ships: [],
    turn: 1,
    phase: "move",
    weapon: "phaser",
    weaponArmed: false,
    moveHex: null,
    fireHex: null,
    fireSkipped: false,
    hover: null,
    resolving: false,
    anim: null,
    particles: [],
    floaters: [],
    shots: [],
    log: "Awaiting orders.",
    ended: false,
    god: false,
    godGhost: false,
  };

  function player() { return state.ships.find((s) => s.team === "player" && s.alive); }

  function makeShip(id, clsId, team, pos, facing) {
    const cls = CLASSES[clsId];
    return {
      id, clsId, name: cls.name, team, pos: hex(pos.q, pos.r),
      hp: cls.hp, hpMax: cls.hp, torp: cls.torpAmmo,
      facing, alive: true, lastDelta: hex(0, 0), flash: 0,
    };
  }

  /* —— original silhouettes (procedural, not Palm PRC) —— */
  function paintHull(c, clsId, s) {
    c.lineJoin = "round";
    c.lineCap = "round";
    c.lineWidth = Math.max(1, s * 0.08);
    if (clsId === "union") {
      c.beginPath();
      c.moveTo(s * 0.95, 0);
      c.lineTo(s * 0.2, s * 0.36);
      c.lineTo(-s * 0.55, s * 0.22);
      c.lineTo(-s * 0.28, 0);
      c.lineTo(-s * 0.55, -s * 0.22);
      c.lineTo(s * 0.2, -s * 0.36);
      c.closePath();
    } else if (clsId === "empire") {
      c.beginPath();
      c.moveTo(s * 1.0, 0);
      c.lineTo(-s * 0.15, s * 0.22);
      c.lineTo(-s * 0.7, s * 0.55);
      c.lineTo(-s * 0.4, 0);
      c.lineTo(-s * 0.7, -s * 0.55);
      c.lineTo(-s * 0.15, -s * 0.22);
      c.closePath();
    } else if (clsId === "web") {
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const fn = i === 0 ? "moveTo" : "lineTo";
        c[fn](Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78);
      }
      c.closePath();
    } else if (clsId === "swarm") {
      c.beginPath();
      c.moveTo(s * 0.9, 0);
      c.lineTo(-s * 0.15, s * 0.18);
      c.lineTo(-s * 0.55, s * 0.62);
      c.lineTo(-s * 0.25, 0);
      c.lineTo(-s * 0.55, -s * 0.62);
      c.lineTo(-s * 0.15, -s * 0.18);
      c.closePath();
    } else {
      const k = s * 0.55;
      c.beginPath();
      c.moveTo(0, -k);
      c.lineTo(k, 0);
      c.lineTo(0, k);
      c.lineTo(-k, 0);
      c.closePath();
    }
    c.fill();
    c.stroke();
    if (clsId === "web") {
      c.beginPath();
      c.moveTo(s * 0.45, 0); c.lineTo(-s * 0.22, s * 0.38);
      c.lineTo(-s * 0.22, -s * 0.38); c.closePath();
      c.globalAlpha = 0.85;
      c.stroke();
    }
    if (clsId === "cube") {
      c.beginPath();
      c.arc(0, 0, s * 0.18, 0, Math.PI * 2);
      c.stroke();
    }
    if (clsId === "union") {
      c.beginPath();
      c.moveTo(-s * 0.1, s * 0.28); c.lineTo(-s * 0.62, s * 0.42);
      c.moveTo(-s * 0.1, -s * 0.28); c.lineTo(-s * 0.62, -s * 0.42);
      c.stroke();
    }
  }

  function drawShipSprite(c, ship, x, y, scale, angle) {
    const cls = CLASSES[ship.clsId];
    const s = scale;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.fillStyle = cls.color;
    c.strokeStyle = PAL.type;
    c.globalAlpha = 0.92;
    paintHull(c, ship.clsId, s);
    c.fillStyle = PAL.ember;
    c.globalAlpha = 0.7;
    c.beginPath();
    c.arc(-s * 0.35, 0, s * 0.08, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.04 + Math.random() * 0.14;
      state.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 500 + Math.random() * 500, max: 900, r: 1.5 + Math.random() * 2.5, color,
      });
    }
  }
  function floater(x, y, text, color) {
    state.floaters.push({ x, y, text, color, life: 900, max: 900 });
  }

  /* —— screens —— */
  function showStart() {
    state.screen = "start";
    els.start.classList.remove("hidden");
    els.game.classList.add("hidden");
    els.overlay.classList.add("hidden");
    const r = rankFor(wins());
    els.rankChip.textContent = r.name + " · " + r.line;
    resizeStartBg();
    drawStartBg();
  }

  function buildClassList() {
    els.classList.innerHTML = "";
    Object.values(CLASSES).forEach((cls) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "class-card";
      btn.dataset.class = cls.id;
      const cv = document.createElement("canvas");
      cv.width = 84; cv.height = 56;
      const c = cv.getContext("2d");
      c.fillStyle = PAL.hex;
      c.fillRect(0, 0, 84, 56);
      const dummy = { clsId: cls.id };
      c.save();
      drawShipSprite(c, dummy, 42, 28, 18, 0);
      c.restore();
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = "<strong>" + cls.name + "</strong><span>" + cls.tag + "</span>";
      btn.appendChild(cv);
      btn.appendChild(meta);
      btn.addEventListener("click", () => pickClass(cls.id));
      els.classList.appendChild(btn);
    });
  }

  function pickClass(id) {
    state.picked = id;
    els.classList.querySelectorAll(".class-card").forEach((el) => {
      el.classList.toggle("selected", el.dataset.class === id);
    });
    els.blurb.textContent = CLASSES[id].blurb;
    els.engage.disabled = false;
  }

  function startBattle(clsId) {
    const id = clsId || state.picked;
    if (!id) return;
    const cpuIds = shuffle(Object.keys(CLASSES).filter((k) => k !== id)).slice(0, 3);
    const spots = [hex(-4, -2), hex(1, -5), hex(5, -3)];
    state.ships = [
      makeShip("p1", id, "player", hex(0, 5), -Math.PI / 2),
    ];
    cpuIds.forEach((cid, i) => {
      state.ships.push(makeShip("c" + (i + 1), cid, "cpu", spots[i], Math.PI / 2));
    });
    state.turn = 1;
    state.phase = "move";
    state.weapon = "phaser";
    state.weaponArmed = false;
    state.moveHex = null;
    state.fireHex = null;
    state.fireSkipped = false;
    state.resolving = false;
    state.anim = null;
    state.particles = [];
    state.floaters = [];
    state.shots = [];
    state.ended = false;
    state.log = "Plot a course. Tap a hex within range.";
    state.screen = "game";
    els.start.classList.add("hidden");
    els.game.classList.remove("hidden");
    els.overlay.classList.add("hidden");
    resizeBoard();
    refreshHud();
    setLog(state.log);
  }

  /* —— HUD —— */
  function setLog(t) {
    state.log = t;
    els.log.textContent = t;
  }
  function fmtHex(h) {
    if (!h) return "—";
    return h.q + "," + h.r;
  }
  function refreshHud() {
    const p = player();
    const cls = p ? CLASSES[p.clsId] : CLASSES[state.picked] || CLASSES.union;
    const hp = p ? p.hp : cls.hp;
    const hpMax = p ? p.hpMax : cls.hp;
    const frac = hpMax ? hp / hpMax : 0;
    els.hpFill.style.width = clamp(frac, 0, 1) * 100 + "%";
    els.hpFill.style.background = frac < 0.3 ? "#B85C4A" : frac < 0.55 ? PAL.ember : PAL.sage;
    els.hpText.textContent = Math.max(0, Math.ceil(hp));
    const ammo = p ? p.torp : cls.torpAmmo;
    const maxA = cls.torpAmmo;
    els.torpPips.innerHTML = "";
    for (let i = 0; i < maxA; i++) {
      const d = document.createElement("i");
      if (i < ammo) d.className = "on";
      els.torpPips.appendChild(d);
    }
    els.moveRead.textContent = fmtHex(state.moveHex);
    if (state.fireSkipped) els.fireText.textContent = "skip";
    else els.fireText.textContent = fmtHex(state.fireHex);
    els.phaser.classList.toggle("on", state.weaponArmed && state.weapon === "phaser");
    els.torp.classList.toggle("on", state.weaponArmed && state.weapon === "torpedo");
    els.torp.disabled = !!(p && p.torp <= 0);
    if (p && p.torp <= 0 && state.weapon === "torpedo") {
      state.weapon = "phaser";
      els.phaser.classList.add("on");
      els.torp.classList.remove("on");
    }
    els.turn.textContent = "Turn " + state.turn;
    const goOk = !state.resolving && !state.ended && !!state.moveHex && (!!state.fireHex || state.fireSkipped);
    els.go.disabled = !goOk;
    if (state.resolving) els.hint.textContent = "Resolving…";
    else if (state.ended) els.hint.textContent = "";
    else if (state.phase === "move") els.hint.textContent = "Plot your course";
    else if (!state.weaponArmed) els.hint.textContent = "Pick Phaser or Torpedo";
    else els.hint.textContent = (state.weapon === "torpedo" ? "Aim torpedo" : "Aim phaser") + " · Course chip to replot";
  }

  function weaponRange() {
    const p = player();
    if (!p) return 4;
    const cls = CLASSES[p.clsId];
    return state.weapon === "torpedo" ? cls.torpRange : cls.phaserRange;
  }
  function originForFire() {
    return state.moveHex || (player() && player().pos);
  }

  /* —— input —— */
  function onBoardTap(h) {
    if (!h || state.resolving || state.ended) return;
    const p = player();
    if (!p) return;
    const cls = CLASSES[p.clsId];
    if (state.phase === "move") {
      if (hexDist(p.pos, h) <= cls.move && inBoard(h)) {
        state.moveHex = h;
        state.phase = "fire";
        state.fireHex = null;
        state.fireSkipped = false;
        setLog("Course locked " + fmtHex(h) + ". Pick a gun, then aim. Course chip to replot.");
        refreshHud();
      }
      return;
    }
    if (!state.weaponArmed) {
      setLog("Pick Phaser or Torpedo, then tap a hex to aim.");
      return;
    }
    const origin = originForFire();
    const range = weaponRange();
    if (hexDist(origin, h) <= range && inBoard(h) && !eq(h, origin)) {
      state.fireHex = h;
      state.fireSkipped = false;
      setLog((state.weapon === "torpedo" ? "Torpedo" : "Phaser") + " aimed at " + fmtHex(h) + ". Tap GO.");
      refreshHud();
    }
  }

  function skipFire() {
    if (state.resolving || state.ended) return;
    if (!state.moveHex && player()) state.moveHex = hex(player().pos.q, player().pos.r);
    state.fireHex = null;
    state.fireSkipped = true;
    state.phase = "fire";
    setLog("Weapons cold. Tap GO to move only.");
    refreshHud();
  }

  function replot() {
    if (state.resolving || state.ended) return;
    state.phase = "move";
    state.moveHex = null;
    state.fireHex = null;
    state.fireSkipped = false;
    state.weaponArmed = false;
    setLog("Replot. Tap a hex within range.");
    refreshHud();
  }

  function setWeapon(w) {
    if (state.resolving || state.ended) return;
    const p = player();
    if (w === "torpedo" && p && p.torp <= 0) return;
    state.weapon = w;
    state.weaponArmed = true;
    state.fireSkipped = false;
    if (state.fireHex && originForFire()) {
      if (hexDist(originForFire(), state.fireHex) > weaponRange()) {
        state.fireHex = null;
        state.fireSkipped = false;
      }
    }
    refreshHud();
  }

  /* —— CPU —— */
  function thinkCpu(ship) {
    const p = player();
    const cls = CLASSES[ship.clsId];
    const spots = hexesInRange(ship.pos, cls.move);
    if (!p) {
      return { to: ship.pos, weapon: null, fireHex: null };
    }
    const pred = inBoard(hex(p.pos.q + p.lastDelta.q, p.pos.r + p.lastDelta.r))
      ? hex(p.pos.q + p.lastDelta.q, p.pos.r + p.lastDelta.r)
      : hex(p.pos.q, p.pos.r);
    const aim = Math.random() < 0.55 ? pred : hex(p.pos.q, p.pos.r);
    const flank = neighbors(aim)[Math.floor(Math.random() * 6)];
    const desired = Math.random() < 0.4 && flank && inBoard(flank) ? flank : aim;
    const wantDist = Math.max(1, cls.phaserRange - 1);
    let best = spots[0], bestScore = -1e9;
    for (const s of spots) {
      const d = hexDist(s, desired);
      let score = -Math.abs(d - wantDist) * 2 - hexDist(s, desired) * 0.35 + Math.random() * 1.4;
      if (eq(s, p.pos) && Math.random() > 0.12) score -= 4;
      if (eq(s, ship.pos) && hexDist(ship.pos, aim) > cls.phaserRange) score -= 1.5;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    const dAim = hexDist(best, aim);
    let weapon = null, fireHex = null;
    if (ship.torp > 0 && dAim > cls.phaserRange && dAim <= cls.torpRange) {
      weapon = "torpedo"; fireHex = aim;
    } else if (dAim <= cls.phaserRange && dAim > 0) {
      weapon = "phaser"; fireHex = aim;
    } else if (ship.torp > 0 && dAim <= cls.torpRange && dAim > 0) {
      weapon = "torpedo"; fireHex = aim;
    } else if (dAim > 0) {
      const line = hexLine(best, aim);
      const maxR = ship.torp > 0 ? cls.torpRange : cls.phaserRange;
      const idx = Math.min(line.length - 1, maxR);
      if (idx > 0) {
        weapon = ship.torp > 0 && maxR === cls.torpRange ? "torpedo" : "phaser";
        fireHex = line[idx];
      }
    }
    return { to: best, weapon, fireHex };
  }

  /* —— resolve —— */
  function occupiedSet(exceptId) {
    const s = new Set();
    for (const sh of state.ships) {
      if (!sh.alive) continue;
      if (exceptId && sh.id === exceptId) continue;
      s.add(key(sh.pos));
    }
    return s;
  }

  function resolveEnds(orders) {
    const tent = new Map();
    orders.forEach((o) => tent.set(o.ship.id, o.to));
    const groups = new Map();
    for (const [id, to] of tent) {
      const k = key(to);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(id);
    }
    const end = new Map();
    const collided = new Set();
    const reserved = new Set();
    for (const [k, ids] of groups) {
      if (ids.length === 1) {
        end.set(ids[0], tent.get(ids[0]));
        reserved.add(k);
      } else {
        ids.forEach((id) => collided.add(id));
      }
    }
    for (const id of collided) {
      const ship = state.ships.find((s) => s.id === id);
      const dest = tent.get(id);
      const back = hexDist(dest, ship.pos) > 0 ? stepToward(dest, ship.pos, 1) : neighbors(dest)[0];
      const cands = [back, ship.pos, ...shuffle(neighbors(dest)), ...shuffle(neighbors(ship.pos))];
      let placed = null;
      for (const c of cands) {
        if (!c || !inBoard(c)) continue;
        const ck = key(c);
        if (reserved.has(ck)) continue;
        placed = c;
        reserved.add(ck);
        break;
      }
      end.set(id, placed || ship.pos);
    }
    return { end, collided };
  }

  function damage(ship, amt, src) {
    if (!ship.alive) return;
    ship.hp -= amt;
    ship.flash = 220;
    const p = hexToPixel(ship.pos, layout);
    floater(p.x, p.y - 12, "−" + amt, PAL.ember);
    if (ship.hp <= 0) {
      ship.hp = 0;
      ship.alive = false;
      burst(p.x, p.y, CLASSES[ship.clsId].color, 22);
      burst(p.x, p.y, PAL.ember, 14);
      setLog(ship.name + " hull lost" + (src ? " (" + src + ")" : "") + ".");
    }
  }

  function go() {
    if (els.go.disabled || state.resolving || state.ended) return;
    const p = player();
    if (!p || !state.moveHex) return;
    const orders = [];
    orders.push({
      ship: p,
      from: hex(p.pos.q, p.pos.r),
      to: hex(state.moveHex.q, state.moveHex.r),
      weapon: state.fireSkipped ? null : state.weapon,
      fireHex: state.fireSkipped ? null : state.fireHex,
    });
    state.ships.filter((s) => s.team === "cpu" && s.alive).forEach((s) => {
      const t = thinkCpu(s);
      orders.push({ ship: s, from: hex(s.pos.q, s.pos.r), to: t.to, weapon: t.weapon, fireHex: t.fireHex });
    });
    const { end, collided } = resolveEnds(orders);
    orders.forEach((o) => {
      o.end = end.get(o.ship.id);
      o.collided = collided.has(o.ship.id);
      const dq = o.end.q - o.from.q, dr = o.end.r - o.from.r;
      o.ship.lastDelta = hex(dq, dr);
      if (dq !== 0 || dr !== 0) {
        const a = hexToPixel(o.from, layout), b = hexToPixel(o.end, layout);
        o.ship.facing = Math.atan2(b.y - a.y, b.x - a.x);
      }
    });
    state.resolving = true;
    state.shots = [];
    state.anim = { t0: performance.now(), phase: "move", orders, collided };
    setLog("All ships underway.");
    refreshHud();
  }

  function beamHexes(from, to, range) {
    const line = hexLine(from, to);
    const out = [];
    for (let i = 1; i < line.length && i <= range; i++) out.push(line[i]);
    return out;
  }

  function applyShots(orders) {
    const logs = [];
    for (const o of orders) {
      const ship = o.ship;
      if (!ship.alive) continue;
      if (!o.weapon || !o.fireHex) continue;
      const cls = CLASSES[ship.clsId];
      if (o.weapon === "torpedo") {
        if (ship.torp <= 0) continue;
        ship.torp -= 1;
        const dest = o.fireHex;
        if (hexDist(o.end, dest) > cls.torpRange) continue;
        const p0 = hexToPixel(o.end, layout);
        const p1 = hexToPixel(dest, layout);
        state.shots.push({
          kind: "torp", x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, t: 0, life: 380, color: PAL.ember,
        });
        const hit = state.ships.find((s) => s.alive && s.id !== ship.id && eq(s.pos, dest));
        if (hit) {
          damage(hit, cls.torpDmg, "torpedo");
          logs.push(ship.name + " torpedo hits " + hit.name + " for " + cls.torpDmg);
        } else {
          const px = hexToPixel(dest, layout);
          burst(px.x, px.y, PAL.ember, 8);
          logs.push(ship.name + " torpedo misses " + fmtHex(dest));
        }
      } else {
        const hexes = beamHexes(o.end, o.fireHex, cls.phaserRange);
        if (!hexes.length) continue;
        const last = hexes[hexes.length - 1];
        const p0 = hexToPixel(o.end, layout);
        const p1 = hexToPixel(last, layout);
        state.shots.push({
          kind: "beam", x0: p0.x, y0: p0.y, x1: p1.x, y1: p1.y, t: 0, life: 420, color: PAL.ember,
          hexes,
        });
        let any = false;
        for (const h of hexes) {
          const hit = state.ships.find((s) => s.alive && s.id !== ship.id && eq(s.pos, h));
          if (hit) {
            damage(hit, cls.phaserDmg, "phaser");
            logs.push(ship.name + " phaser hits " + hit.name + " for " + cls.phaserDmg);
            any = true;
          }
        }
        if (!any) logs.push(ship.name + " phaser cuts empty space");
      }
    }
    if (logs.length) setLog(logs.slice(0, 3).join(" · "));
  }

  function finishTurn(orders) {
    state.shots = state.shots.filter((s) => s.t < s.life);
    const p = player();
    const cpus = state.ships.filter((s) => s.team === "cpu" && s.alive);
    if (!p) {
      endGame(false);
      return;
    }
    if (!cpus.length) {
      endGame(true);
      return;
    }
    state.turn += 1;
    state.resolving = false;
    state.anim = null;
    state.phase = "move";
    state.moveHex = null;
    state.fireHex = null;
    state.fireSkipped = false;
    state.weaponArmed = false;
    setLog("Turn " + state.turn + ". Plot a course.");
    refreshHud();
  }

  function endGame(won) {
    state.ended = true;
    state.resolving = false;
    state.anim = null;
    if (won) addWin();
    const r = rankFor(wins());
    els.endKicker.textContent = won ? "Last hull standing" : "Your hull opened";
    els.endTitle.textContent = won ? "VICTORY" : "LOST";
    els.endFlavor.textContent = won
      ? r.name + ". " + r.line
      : "The night keeps your name. " + r.name + " still.";
    els.overlay.classList.remove("hidden");
    refreshHud();
  }

  function tickAnim(now) {
    const a = state.anim;
    if (!a) return;
    const dt = now - a.t0;
    if (a.phase === "move") {
      const t = clamp(dt / 560, 0, 1);
      a.u = ease(t);
      if (t >= 1) {
        a.orders.forEach((o) => { o.ship.pos = hex(o.end.q, o.end.r); });
        for (const id of a.collided) {
          const sh = state.ships.find((s) => s.id === id);
          if (sh && sh.alive) {
            const cls = CLASSES[sh.clsId];
            damage(sh, cls.collision, "collision");
            const p = hexToPixel(sh.pos, layout);
            burst(p.x, p.y, PAL.ember, 8);
          }
        }
        if ([...a.collided].some((id) => {
          const sh = state.ships.find((s) => s.id === id);
          return sh && !sh.alive;
        })) {
          /* explosions already queued */
        }
        a.phase = "fire";
        a.t0 = now;
        a.u = 1;
        applyShots(a.orders);
      }
    } else if (a.phase === "fire") {
      a.u = 1;
      if (dt > 700) {
        a.phase = "hold";
        a.t0 = now;
      }
    } else if (a.phase === "hold") {
      if (dt > 420) finishTurn(a.orders);
    }
  }

  /* —— render —— */
  function hexCorners(cx, cy, size) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
    }
    return pts;
  }
  function pathHex(c, cx, cy, size) {
    const pts = hexCorners(cx, cy, size);
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < 6; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
  }

  function shipDrawPos(ship) {
    const a = state.anim;
    if (a && a.phase === "move") {
      const o = a.orders.find((x) => x.ship.id === ship.id);
      if (o) {
        const p0 = hexToPixel(o.from, layout);
        const p1 = hexToPixel(o.end, layout);
        const u = a.u || 0;
        return { x: p0.x + (p1.x - p0.x) * u, y: p0.y + (p1.y - p0.y) * u };
      }
    }
    return hexToPixel(ship.pos, layout);
  }

  function drawGame() {
    const c = ctx;
    const w = layout.w, h = layout.h;
    c.fillStyle = PAL.wall;
    c.fillRect(0, 0, w, h);
    for (const s of STARS) {
      c.fillStyle = PAL.dim;
      c.globalAlpha = s.a;
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    const g = c.createRadialGradient(w * 0.3, h * 0.2, 10, w * 0.3, h * 0.2, w * 0.7);
    g.addColorStop(0, "rgba(217,119,87,0.07)");
    g.addColorStop(1, "rgba(12,10,9,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);

    const p = player();
    const cls = p ? CLASSES[p.clsId] : null;
    const moveSet = new Set();
    const fireSet = new Set();
    if (p && !state.resolving && !state.ended) {
      hexesInRange(p.pos, cls.move).forEach((h) => moveSet.add(key(h)));
      const origin = originForFire();
      if (state.phase === "fire" && origin && state.weaponArmed) {
        hexesInRange(origin, weaponRange()).forEach((h) => fireSet.add(key(h)));
      }
    }

    const showMove = state.phase === "move" || !state.weaponArmed;
    for (const h of BOARD) {
      const pxl = hexToPixel(h, layout);
      pathHex(c, pxl.x, pxl.y, layout.size * 0.96);
      let fill = PAL.hex;
      if (fireSet.has(key(h)) && !eq(h, state.moveHex)) fill = "rgba(217,119,87,0.20)";
      else if (showMove && moveSet.has(key(h))) fill = "#24211F";
      if (state.hover && eq(state.hover, h)) fill = PAL.raised;
      c.fillStyle = fill;
      c.strokeStyle = PAL.line;
      c.lineWidth = 1;
      c.fill();
      c.stroke();
      if (fireSet.has(key(h)) && !eq(h, state.moveHex)) {
        pathHex(c, pxl.x, pxl.y, layout.size * 0.92);
        c.strokeStyle = PAL.ember;
        c.globalAlpha = 0.55;
        c.lineWidth = 1.4;
        c.stroke();
        c.globalAlpha = 1;
      }
    }

    if (p && state.moveHex) {
      const from = hexToPixel(p.pos, layout);
      const to = hexToPixel(state.moveHex, layout);
      c.strokeStyle = PAL.sage;
      c.globalAlpha = 0.7;
      c.lineWidth = 2;
      c.setLineDash([]);
      c.beginPath();
      c.moveTo(from.x, from.y);
      c.lineTo(to.x, to.y);
      c.stroke();
      c.globalAlpha = 1;
      pathHex(c, to.x, to.y, layout.size * 0.96);
      c.fillStyle = "rgba(107,143,122,0.18)";
      c.strokeStyle = PAL.sage;
      c.lineWidth = 2.5;
      c.fill();
      c.stroke();
    }

    if (state.fireHex) {
      const pxl = hexToPixel(state.fireHex, layout);
      const r = layout.size;
      c.strokeStyle = PAL.ember;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(pxl.x, pxl.y, r * 0.28, 0, Math.PI * 2);
      c.stroke();
      const arm = r * 0.5, gap = r * 0.14;
      c.beginPath();
      c.moveTo(pxl.x, pxl.y - arm); c.lineTo(pxl.x, pxl.y - gap);
      c.moveTo(pxl.x, pxl.y + gap); c.lineTo(pxl.x, pxl.y + arm);
      c.moveTo(pxl.x - arm, pxl.y); c.lineTo(pxl.x - gap, pxl.y);
      c.moveTo(pxl.x + gap, pxl.y); c.lineTo(pxl.x + arm, pxl.y);
      c.stroke();
      const origin = originForFire();
      if (origin && state.weapon === "phaser" && p) {
        const hexes = beamHexes(origin, state.fireHex, CLASSES[p.clsId].phaserRange);
        c.fillStyle = PAL.ember;
        hexes.forEach((hh) => {
          const q = hexToPixel(hh, layout);
          c.globalAlpha = 0.5;
          c.beginPath();
          c.arc(q.x, q.y, 2.4, 0, Math.PI * 2);
          c.fill();
        });
        c.globalAlpha = 1;
      }
    }

    if (state.god && state.godGhost && !state.resolving && player()) {
      state.ships.filter((s) => s.team === "cpu" && s.alive).forEach((s) => {
        const t = thinkCpu(s);
        if (!t.to) return;
        const pxl = hexToPixel(t.to, layout);
        pathHex(c, pxl.x, pxl.y, layout.size * 0.7);
        c.strokeStyle = CLASSES[s.clsId].color;
        c.globalAlpha = 0.45;
        c.setLineDash([3, 3]);
        c.lineWidth = 1.5;
        c.stroke();
        c.setLineDash([]);
        c.globalAlpha = 1;
        if (t.fireHex) {
          const f = hexToPixel(t.fireHex, layout);
          c.strokeStyle = PAL.ember;
          c.globalAlpha = 0.35;
          c.beginPath();
          c.arc(f.x, f.y, 4, 0, Math.PI * 2);
          c.stroke();
          c.globalAlpha = 1;
        }
      });
    }

    for (const sh of state.ships) {
      if (!sh.alive && !state.particles.length) continue;
      if (!sh.alive) continue;
      const pos = shipDrawPos(sh);
      if (sh.team === "player") {
        pathHex(c, pos.x, pos.y, layout.size * 0.7);
        c.strokeStyle = PAL.sage;
        c.globalAlpha = 0.55;
        c.lineWidth = 1.5;
        c.stroke();
        c.globalAlpha = 1;
      }
      if (sh.flash > 0) {
        c.globalAlpha = 0.45;
        c.fillStyle = PAL.ember;
        pathHex(c, pos.x, pos.y, layout.size * 0.88);
        c.fill();
        c.globalAlpha = 1;
      }
      drawShipSprite(c, sh, pos.x, pos.y, layout.size * 0.88, sh.facing);
      const bw = layout.size * 1.15, bh = 3.5;
      c.fillStyle = PAL.raised;
      c.fillRect(pos.x - bw / 2, pos.y - layout.size * 0.95, bw, bh);
      c.fillStyle = sh.team === "player" ? PAL.sage : PAL.ember;
      c.fillRect(pos.x - bw / 2, pos.y - layout.size * 0.95, bw * clamp(sh.hp / sh.hpMax, 0, 1), bh);
    }

    for (const s of state.shots) {
      const u = clamp(s.t / s.life, 0, 1);
      c.save();
      if (s.kind === "beam") {
        c.strokeStyle = PAL.ember;
        c.globalAlpha = 0.85 * (1 - u);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(s.x0, s.y0);
        c.lineTo(s.x1, s.y1);
        c.stroke();
        c.strokeStyle = PAL.type;
        c.globalAlpha = 0.4 * (1 - u);
        c.lineWidth = 1.2;
        c.stroke();
      } else {
        const x = s.x0 + (s.x1 - s.x0) * u;
        const y = s.y0 + (s.y1 - s.y0) * u;
        c.fillStyle = PAL.ember;
        c.globalAlpha = 0.9;
        c.beginPath();
        c.arc(x, y, 3.2, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }

    for (const pt of state.particles) {
      c.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      c.fillStyle = pt.color;
      c.beginPath();
      c.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    c.font = "11px ui-sans-serif, system-ui, sans-serif";
    c.textAlign = "center";
    for (const f of state.floaters) {
      c.globalAlpha = clamp(f.life / f.max, 0, 1);
      c.fillStyle = f.color;
      const rise = (1 - f.life / f.max) * 16;
      c.fillText(f.text, f.x, f.y - rise);
    }
    c.globalAlpha = 1;
  }

  function updateFx(dt) {
    for (const pt of state.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.vy += 0.00004 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floaters) f.life -= dt;
    state.floaters = state.floaters.filter((f) => f.life > 0);
    for (const sh of state.ships) if (sh.flash > 0) sh.flash -= dt;
    for (const s of state.shots) s.t += dt;
    state.shots = state.shots.filter((s) => s.t < s.life + 80);
  }

  function resizeBoard() {
    const wrap = els.board.parentElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = wrap.clientWidth || 390;
    const h = Math.max(300, wrap.clientHeight || 420);
    els.board.width = Math.floor(w * dpr);
    els.board.height = Math.floor(h * dpr);
    els.board.style.width = w + "px";
    els.board.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout.w = w; layout.h = h; layout.dpr = dpr;
    layout.size = Math.min(w / (13 * Math.sqrt(3)), h / 20.4) * 0.98;
    layout.ox = w / 2;
    layout.oy = h / 2 + 4;
  }

  function resizeStartBg() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = els.start.clientWidth || 390;
    const h = els.start.clientHeight || 720;
    els.startBg.width = Math.floor(w * dpr);
    els.startBg.height = Math.floor(h * dpr);
    els.startBg.style.width = w + "px";
    els.startBg.style.height = h + "px";
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    els.startBg._w = w; els.startBg._h = h;
  }

  function drawStartBg() {
    const c = bgCtx;
    const w = els.startBg._w || 390, h = els.startBg._h || 720;
    c.fillStyle = PAL.wall;
    c.fillRect(0, 0, w, h);
    for (const s of STARS) {
      c.fillStyle = PAL.dim;
      c.globalAlpha = s.a;
      c.beginPath();
      c.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    const size = 14;
    const ox = w / 2, oy = h * 0.42;
    const L = { size, ox, oy };
    for (const hhex of BOARD) {
      const p = hexToPixel(hhex, L);
      pathHex(c, p.x, p.y, size * 0.96);
      c.fillStyle = PAL.hex;
      c.strokeStyle = PAL.line;
      c.globalAlpha = 0.55;
      c.fill();
      c.stroke();
    }
    c.globalAlpha = 1;
    const g = c.createRadialGradient(w * 0.5, h * 0.18, 8, w * 0.5, h * 0.18, w * 0.8);
    g.addColorStop(0, "rgba(217,119,87,0.12)");
    g.addColorStop(1, "rgba(12,10,9,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }

  function canvasPos(ev) {
    const r = els.board.getBoundingClientRect();
    const src = ev.touches ? ev.touches[0] : ev;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  els.board.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    const pt = canvasPos(ev);
    const h = pixelToHex(pt.x, pt.y, layout);
    onBoardTap(h);
  });
  els.board.addEventListener("pointermove", (ev) => {
    const pt = canvasPos(ev);
    state.hover = pixelToHex(pt.x, pt.y, layout);
  });

  els.engage.addEventListener("click", () => startBattle(state.picked));
  els.go.addEventListener("click", go);
  els.skip.addEventListener("click", skipFire);
  els.replot.addEventListener("click", replot);
  els.phaser.addEventListener("click", () => setWeapon("phaser"));
  els.torp.addEventListener("click", () => setWeapon("torpedo"));
  els.again.addEventListener("click", () => {
    els.overlay.classList.add("hidden");
    showStart();
  });

  function setWinsCount(n) {
    try { localStorage.setItem("spacewar-wins", String(Math.max(0, n|0))); }
    catch (e) { /* ignore */ }
    const r = rankFor(wins());
    if (els.rankChip) els.rankChip.textContent = r.name + " · " + r.line;
  }

  function mountGod() {
    const params = new URLSearchParams(location.search);
    state.god = params.get("god") === "1" || params.get("god") === "true";
    const panel = document.getElementById("god-panel");
    if (!panel || !state.god) return;
    panel.classList.remove("hidden");
    const sel = document.getElementById("god-rank");
    sel.innerHTML = "";
    RANKS.forEach((r) => {
      const o = document.createElement("option");
      o.value = String(r.min);
      o.textContent = r.min + " · " + r.name;
      sel.appendChild(o);
    });
    sel.value = String(rankFor(wins()).min);
    sel.addEventListener("change", () => setWinsCount(parseInt(sel.value, 10)));
    document.getElementById("god-heal").addEventListener("click", () => {
      const p = player();
      if (!p) return;
      p.hp = p.hpMax;
      p.alive = true;
      refreshHud();
    });
    document.getElementById("god-torps").addEventListener("click", () => {
      const p = player();
      if (!p) return;
      p.torp = CLASSES[p.clsId].torpAmmo;
      refreshHud();
    });
    document.getElementById("god-ghost").addEventListener("click", (ev) => {
      state.godGhost = !state.godGhost;
      ev.currentTarget.classList.toggle("on", state.godGhost);
    });
    document.getElementById("god-win").addEventListener("click", () => {
      if (!player()) return;
      state.ships.forEach((s) => { if (s.team === "cpu") { s.hp = 0; s.alive = false; } });
      endGame(true);
    });
    document.getElementById("god-lose").addEventListener("click", () => {
      const p = player();
      if (!p) return;
      p.hp = 0; p.alive = false;
      endGame(false);
    });
  }

  window.addEventListener("resize", () => {
    if (state.screen === "game") resizeBoard();
    else { resizeStartBg(); drawStartBg(); }
  });

  let lastTs = 0;
  function loop(ts) {
    const dt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts;
    if (state.screen === "game") {
      if (state.anim) tickAnim(ts);
      updateFx(dt);
      drawGame();
    }
    requestAnimationFrame(loop);
  }

  window.SpaceWar = {
    VERSION, pickClass, startBattle, tapHex: onBoardTap, skipFire, setWeapon, go, replot,
    setWins: setWinsCount, wins, rankFor,
    hexToPixel: (q, r) => hexToPixel(hex(q, r), layout),
    getState: () => ({
      screen: state.screen, phase: state.phase, turn: state.turn,
      moveHex: state.moveHex, fireHex: state.fireHex, resolving: state.resolving,
      ships: state.ships.map((s) => ({ id: s.id, name: s.name, hp: s.hp, pos: s.pos, alive: s.alive, team: s.team })),
    }),
  };

  buildClassList();
  showStart();
  mountGod();
  requestAnimationFrame(loop);

  const params = new URLSearchParams(location.search);
  if (params.get("autotest") === "1") {
    pickClass("union");
    startBattle("union");
    const p = player();
    const dest = stepToward(p.pos, hex(0, 0), 3);
    onBoardTap(dest);
    const aim = hex(0, -1);
    if (hexDist(dest, aim) <= weaponRange()) onBoardTap(aim);
    else skipFire();
    setTimeout(() => { go(); }, 120);
  }
})();
