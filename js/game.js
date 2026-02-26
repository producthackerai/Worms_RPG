// ============================================================
//  WORMS!  –  Mobile-first artillery game
// ============================================================

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const WORLD_W = 1600;
  const WORLD_H = 800;
  const WATER_Y = 760;
  const GRAVITY = 0.15;
  const WORMS_PER_TEAM = 3;
  const TURN_TIME = 30;        // seconds
  const MOVE_SPEED = 1.5;
  const JUMP_POWER = -4.5;
  const MAX_MOVE_STEPS = 120;  // movement budget per turn
  const FALL_DAMAGE_THRESHOLD = 40;
  const FALL_DAMAGE_FACTOR = 0.8;

  const WEAPONS = {
    bazooka: {
      name: 'Bazooka', blastRadius: 32, damage: 45,
      speed: 8, affectedByWind: true, bounces: 0, fuse: 0,
      cluster: 0, type: 'projectile'
    },
    grenade: {
      name: 'Grenade', blastRadius: 28, damage: 40,
      speed: 7, affectedByWind: false, bounces: 3, fuse: 3000,
      cluster: 0, type: 'projectile'
    },
    shotgun: {
      name: 'Shotgun', blastRadius: 12, damage: 25,
      speed: 12, affectedByWind: false, bounces: 0, fuse: 0,
      pellets: 2, type: 'projectile'
    },
    holyGrenade: {
      name: 'Holy Grenade', blastRadius: 65, damage: 80,
      speed: 6, affectedByWind: false, bounces: 1, fuse: 4000,
      cluster: 0, type: 'projectile'
    },
    bananaBomb: {
      name: 'Banana Bomb', blastRadius: 24, damage: 30,
      speed: 7, affectedByWind: true, bounces: 2, fuse: 3000,
      cluster: 5, type: 'projectile'
    },
    airstrike: {
      name: 'Airstrike', blastRadius: 22, damage: 35,
      missiles: 5, type: 'airstrike'
    },
    dynamite: {
      name: 'Dynamite', blastRadius: 55, damage: 75,
      speed: 0, affectedByWind: false, bounces: 0, fuse: 3000,
      cluster: 0, type: 'placement'
    },
    sniper: {
      name: 'Sniper', blastRadius: 8, damage: 50,
      speed: 25, affectedByWind: false, bounces: 0, fuse: 0,
      cluster: 0, type: 'projectile'
    }
  };

  const TERRAINS = {
    greenHills: {
      name: 'Green Hills',
      generate(heights) {
        const baseY = WORLD_H * 0.55;
        for (let x = 0; x < WORLD_W; x++) {
          heights[x] = baseY
            + Math.sin(x * 0.003) * 80
            + Math.sin(x * 0.008 + 1.3) * 45
            + Math.sin(x * 0.02 + 4.1) * 20
            + Math.sin(x * 0.05 + 2.7) * 8;
        }
      },
      grass1: [60, 179, 50],
      grass2: [50, 155, 40],
      dirtBase: [139, 90, 43],
      dirtDarken: [30, 25, 15],
      sky: [
        { stop: 0, color: '#1a0a2e' },
        { stop: 0.3, color: '#16213e' },
        { stop: 0.6, color: '#0a3d62' },
        { stop: 1, color: '#1e5f74' }
      ],
      water: [
        { stop: 0, color: 'rgba(30,100,180,0.7)' },
        { stop: 1, color: 'rgba(10,40,80,0.9)' }
      ],
      waterWave: 'rgba(100,180,255,0.3)',
      dirtParticle: '#8B5E3C'
    },
    volcanicPeaks: {
      name: 'Volcanic Peaks',
      generate(heights) {
        const baseY = WORLD_H * 0.50;
        for (let x = 0; x < WORLD_W; x++) {
          heights[x] = baseY
            + Math.sin(x * 0.004) * 110
            + Math.sin(x * 0.012 + 0.7) * 55
            + Math.sin(x * 0.035 + 2.1) * 30
            + Math.sin(x * 0.08 + 5.3) * 15
            + Math.abs(Math.sin(x * 0.006 + 1.0)) * -60;
        }
      },
      grass1: [90, 85, 80],
      grass2: [70, 65, 60],
      dirtBase: [60, 35, 30],
      dirtDarken: [20, 10, 5],
      sky: [
        { stop: 0, color: '#1a0505' },
        { stop: 0.3, color: '#3d1010' },
        { stop: 0.6, color: '#5c1a0a' },
        { stop: 1, color: '#7a3015' }
      ],
      water: [
        { stop: 0, color: 'rgba(220,100,20,0.7)' },
        { stop: 1, color: 'rgba(180,50,10,0.9)' }
      ],
      waterWave: 'rgba(255,150,50,0.4)',
      dirtParticle: '#4a2a20'
    },
    frozenValleys: {
      name: 'Frozen Valleys',
      generate(heights) {
        const baseY = WORLD_H * 0.45;
        for (let x = 0; x < WORLD_W; x++) {
          const nx = x / WORLD_W;
          heights[x] = baseY
            + Math.cos(nx * Math.PI * 3) * 90
            + Math.sin(x * 0.005 + 2.0) * 60
            + Math.sin(x * 0.015 + 0.5) * 25
            + Math.sin(x * 0.04 + 3.8) * 12;
        }
      },
      grass1: [220, 235, 250],
      grass2: [190, 210, 235],
      dirtBase: [160, 180, 200],
      dirtDarken: [20, 20, 25],
      sky: [
        { stop: 0, color: '#c8d8e8' },
        { stop: 0.3, color: '#a0b8cc' },
        { stop: 0.6, color: '#7090a8' },
        { stop: 1, color: '#506878' }
      ],
      water: [
        { stop: 0, color: 'rgba(20,80,90,0.7)' },
        { stop: 1, color: 'rgba(10,50,60,0.9)' }
      ],
      waterWave: 'rgba(100,200,210,0.3)',
      dirtParticle: '#8aa8c0'
    },
    alienFloaters: {
      name: 'Alien Floaters',
      generate(heights) {
        const baseY = WORLD_H * 0.60;
        for (let x = 0; x < WORLD_W; x++) {
          heights[x] = baseY
            + Math.sin(x * 0.004) * 60
            + Math.sin(x * 0.01 + 1.5) * 35
            + Math.sin(x * 0.025 + 3.0) * 18;
        }
      },
      postProcess(terrainData) {
        // carve out gaps to create floating islands (only carve upper portion)
        const gapCount = 4 + Math.floor(Math.random() * 3);
        for (let i = 0; i < gapCount; i++) {
          const gx = 200 + Math.random() * (WORLD_W - 400);
          const gw = 50 + Math.random() * 70;
          for (let x = Math.max(0, Math.floor(gx - gw / 2)); x < Math.min(WORLD_W, Math.floor(gx + gw / 2)); x++) {
            for (let y = 0; y < WATER_Y - 60; y++) {
              terrainData[y * WORLD_W + x] = 0;
            }
          }
        }
        // add floating platforms (generous size for gameplay)
        const platCount = 6 + Math.floor(Math.random() * 4);
        for (let i = 0; i < platCount; i++) {
          const px = 100 + Math.random() * (WORLD_W - 200);
          const py = 180 + Math.random() * 280;
          const pw = 70 + Math.random() * 100;
          const ph = 15 + Math.random() * 12;
          for (let x = Math.max(0, Math.floor(px - pw / 2)); x < Math.min(WORLD_W, Math.floor(px + pw / 2)); x++) {
            for (let y = Math.max(0, Math.floor(py)); y < Math.min(WORLD_H, Math.floor(py + ph)); y++) {
              terrainData[y * WORLD_W + x] = 1;
            }
          }
        }
      },
      grass1: [180, 50, 220],
      grass2: [150, 40, 190],
      dirtBase: [80, 20, 100],
      dirtDarken: [15, 5, 20],
      sky: [
        { stop: 0, color: '#050010' },
        { stop: 0.3, color: '#100025' },
        { stop: 0.6, color: '#1a0040' },
        { stop: 1, color: '#200055' }
      ],
      water: [
        { stop: 0, color: 'rgba(50,220,50,0.6)' },
        { stop: 1, color: 'rgba(20,150,20,0.9)' }
      ],
      waterWave: 'rgba(100,255,100,0.4)',
      dirtParticle: '#6a1a80'
    }
  };

  const DEFAULT_AMMO = {
    bazooka: Infinity,
    grenade: Infinity,
    shotgun: Infinity,
    sniper: 3,
    dynamite: 2,
    holyGrenade: 1,
    bananaBomb: 2,
    airstrike: 1
  };

  const TEAM_COLORS = ['#ff4444', '#4488ff'];
  const TEAM_NAMES  = ['RED', 'BLU'];

  const WORM_NAMES = [
    'Squirmy', 'Wiggles', 'Sir Slithers', 'Noodle', 'Lumpy',
    'Dirt Nap', 'The Worm', 'Crawly', 'Sgt. Soil', 'Big Dig',
    'Mudflap', 'Annelid Andy', 'Slick', 'Compost', 'Wormsworth',
    'Night Crawler', 'Bait', 'Topsoil', 'El Wormo', 'Squish',
    'Professor Squirm', 'Captain Hook(ed)', 'Mulch', 'Boggle',
    'Spaghetti', 'Ripley', 'Gummy', 'Inchworm', 'Pudge',
    'Slinky', 'Nibblet', 'Grub Hub', 'Early Bird Snack',
    'Sir Digs-a-Lot', 'Mr. Moist', 'Tunnel Vision', 'Loam Ranger',
    'Humus Maximus', 'Soily McSoilface', 'Worm Supreme'
  ];

  // ── State ──────────────────────────────────────────────────
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  let terrainCanvas, terrainCtx;
  let terrainData;    // Uint8Array  1=solid 0=air
  let dw, dh;         // display (canvas element) size
  let scale;          // world→screen scale
  let camX = 0, camY = 0;

  let worms = [];
  let projectiles = [];
  let explosions = [];
  let particles = [];
  let floatingTexts = [];

  let teams = [[], []]; // indices into worms[]
  let currentTeam = 0;
  let currentWormIdx = [0, 0]; // per-team worm index
  let activeWorm = null;

  let selectedWeapon = 'bazooka';
  let wind = 0;
  let selectedTerrain = 'greenHills';
  let weaponAmmo = [{}, {}]; // per-team ammo counts
  let paused = false;

  let gameState = 'menu';  // menu | terrainSelect | turnStart | playerMove | aiming | firing | settling | gameOver
  let turnTimer = TURN_TIME;
  let turnTimerInterval = null;
  let turnTimerRemaining = 0; // saved timer for pause
  let moveStepsLeft = 0;
  let hasFired = false;

  let vsAI = false;
  let aiThinking = false;
  let gameStartTime = 0;
  let customTerrainConfig = null;

  // input
  let dragStart = null;   // {x,y} world coords
  let dragCurrent = null;
  let isDragging = false;
  let inputId = null;     // track touch/mouse id

  // ── Audio (tiny Web Audio beeps) ───────────────────────────
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  function playSound(type) {
    try {
      ensureAudio();
      const now = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      if (type === 'shoot') {
        const o = audioCtx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(300, now);
        o.frequency.exponentialRampToValueAtTime(80, now + 0.15);
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g); o.start(now); o.stop(now + 0.2);
      } else if (type === 'explode') {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const src = audioCtx.createBufferSource(); src.buffer = buf;
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.setValueAtTime(800, now);
        filt.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        src.connect(filt); filt.connect(g); src.start(now); src.stop(now + 0.35);
      } else if (type === 'splash') {
        const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.25, audioCtx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI);
        const src = audioCtx.createBufferSource(); src.buffer = buf;
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'bandpass'; filt.frequency.value = 600; filt.Q.value = 2;
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        src.connect(filt); filt.connect(g); src.start(now); src.stop(now + 0.25);
      } else if (type === 'holy') {
        const o = audioCtx.createOscillator();
        o.type = 'sine'; o.frequency.setValueAtTime(523, now);
        g.gain.setValueAtTime(0.3, now);
        g.gain.setValueAtTime(0.3, now + 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        o.connect(g); o.start(now); o.stop(now + 1.0);
      }
    } catch (e) { /* audio not available */ }
  }

  // ── Terrain ────────────────────────────────────────────────
  function generateTerrain() {
    terrainCanvas = document.createElement('canvas');
    terrainCanvas.width = WORLD_W;
    terrainCanvas.height = WORLD_H;
    terrainCtx = terrainCanvas.getContext('2d');
    terrainData = new Uint8Array(WORLD_W * WORLD_H);

    const terrain = TERRAINS[selectedTerrain];

    // build heightmap using terrain-specific generator
    const heights = new Float32Array(WORLD_W);
    terrain.generate(heights);

    // add some flat plateaus for worm placement
    for (let i = 0; i < 4; i++) {
      const px = 200 + Math.random() * (WORLD_W - 400);
      const pw = 60 + Math.random() * 80;
      const flatY = heights[Math.floor(px)];
      for (let x = Math.max(0, Math.floor(px - pw / 2)); x < Math.min(WORLD_W, Math.floor(px + pw / 2)); x++) {
        heights[x] = heights[x] * 0.3 + flatY * 0.7;
      }
    }

    // fill terrain data
    for (let x = 0; x < WORLD_W; x++) {
      const surfaceY = Math.floor(heights[x]);
      for (let y = surfaceY; y < WATER_Y; y++) {
        if (y >= 0 && y < WORLD_H) {
          terrainData[y * WORLD_W + x] = 1;
        }
      }
    }

    // terrain-specific post-processing (e.g. alien floaters)
    if (terrain.postProcess) {
      terrain.postProcess(terrainData);
    }

    renderTerrainCanvas();
  }

  function renderTerrainCanvas() {
    terrainCtx.clearRect(0, 0, WORLD_W, WORLD_H);
    const imgData = terrainCtx.createImageData(WORLD_W, WORLD_H);
    const d = imgData.data;
    const t = TERRAINS[selectedTerrain];

    for (let y = 0; y < WORLD_H; y++) {
      for (let x = 0; x < WORLD_W; x++) {
        const idx = y * WORLD_W + x;
        if (!terrainData[idx]) continue;
        const pi = idx * 4;

        const above = y > 0 ? terrainData[(y - 1) * WORLD_W + x] : 0;
        const above2 = y > 1 ? terrainData[(y - 2) * WORLD_W + x] : 0;

        if (!above) {
          d[pi] = t.grass1[0]; d[pi + 1] = t.grass1[1]; d[pi + 2] = t.grass1[2]; d[pi + 3] = 255;
        } else if (!above2) {
          d[pi] = t.grass2[0]; d[pi + 1] = t.grass2[1]; d[pi + 2] = t.grass2[2]; d[pi + 3] = 255;
        } else {
          const depth = Math.min((y - 200) / 400, 1);
          const r = Math.floor(t.dirtBase[0] - depth * t.dirtDarken[0] + (Math.random() * 8 - 4));
          const g = Math.floor(t.dirtBase[1] - depth * t.dirtDarken[1] + (Math.random() * 6 - 3));
          const b = Math.floor(t.dirtBase[2] - depth * t.dirtDarken[2] + (Math.random() * 4 - 2));
          d[pi] = r; d[pi + 1] = g; d[pi + 2] = b; d[pi + 3] = 255;
        }
      }
    }
    terrainCtx.putImageData(imgData, 0, 0);
  }

  function destroyTerrain(cx, cy, radius) {
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(WORLD_W - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(WORLD_H - 1, Math.ceil(cy + radius));

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          terrainData[y * WORLD_W + x] = 0;
        }
      }
    }

    // update the visual
    terrainCtx.globalCompositeOperation = 'destination-out';
    terrainCtx.beginPath();
    terrainCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    terrainCtx.fill();
    terrainCtx.globalCompositeOperation = 'source-over';

    // redraw grass edges around the crater
    repaintGrassNear(x0 - 2, y0 - 2, x1 + 2, y1 + 2);
  }

  function repaintGrassNear(x0, y0, x1, y1) {
    x0 = Math.max(0, x0); y0 = Math.max(0, y0);
    x1 = Math.min(WORLD_W - 1, x1); y1 = Math.min(WORLD_H - 1, y1);

    const imgData = terrainCtx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    const d = imgData.data;
    const w = x1 - x0 + 1;

    for (let ly = 0; ly < y1 - y0 + 1; ly++) {
      for (let lx = 0; lx < w; lx++) {
        const wx = x0 + lx, wy = y0 + ly;
        if (!terrainData[wy * WORLD_W + wx]) continue;
        const above = wy > 0 ? terrainData[(wy - 1) * WORLD_W + wx] : 0;
        if (!above) {
          const pi = (ly * w + lx) * 4;
          const tc = TERRAINS[selectedTerrain].grass1;
          d[pi] = tc[0]; d[pi + 1] = tc[1]; d[pi + 2] = tc[2]; d[pi + 3] = 255;
        }
      }
    }
    terrainCtx.putImageData(imgData, x0, y0);
  }

  function isSolid(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || ix >= WORLD_W || iy < 0 || iy >= WORLD_H) return false;
    return terrainData[iy * WORLD_W + ix] === 1;
  }

  function findSurfaceY(x) {
    const ix = Math.floor(Math.max(0, Math.min(WORLD_W - 1, x)));
    for (let y = 0; y < WATER_Y; y++) {
      if (terrainData[y * WORLD_W + ix]) return y;
    }
    return WATER_Y;
  }

  // ── Worm ───────────────────────────────────────────────────
  let usedNames = [];

  function pickWormName() {
    const available = WORM_NAMES.filter(n => !usedNames.includes(n));
    const pool = available.length > 0 ? available : WORM_NAMES;
    const name = pool[Math.floor(Math.random() * pool.length)];
    usedNames.push(name);
    return name;
  }

  function createWorm(team, x) {
    const surfY = findSurfaceY(x);
    return {
      team,
      x, y: surfY - 1,
      vx: 0, vy: 0,
      hp: 100,
      alive: true,
      width: 10,
      height: 14,
      grounded: true,
      fallStartY: 0,
      name: pickWormName()
    };
  }

  function placeWorms() {
    worms = [];
    teams = [[], []];

    // spread worms across terrain
    const positions = [];
    const margin = 120;
    const spacing = (WORLD_W - margin * 2) / (WORMS_PER_TEAM * 2);
    for (let i = 0; i < WORMS_PER_TEAM * 2; i++) {
      positions.push(margin + spacing * i + Math.random() * spacing * 0.5);
    }
    // shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    for (let i = 0; i < WORMS_PER_TEAM; i++) {
      const w0 = createWorm(0, positions[i]);
      worms.push(w0);
      teams[0].push(worms.length - 1);

      const w1 = createWorm(1, positions[WORMS_PER_TEAM + i]);
      worms.push(w1);
      teams[1].push(worms.length - 1);
    }
  }

  function getActiveWorm() {
    const idx = teams[currentTeam][currentWormIdx[currentTeam]];
    return worms[idx];
  }

  // ── Projectile ─────────────────────────────────────────────
  function createProjectile(x, y, vx, vy, weapon, team) {
    const w = WEAPONS[weapon];
    return {
      x, y, vx, vy,
      weapon,
      team,
      alive: true,
      age: 0,
      bouncesLeft: w.bounces || 0,
      fuse: w.fuse || 0,
      trail: []
    };
  }

  function updateProjectile(p, dt) {
    p.age += dt;
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 20) p.trail.shift();

    const w = WEAPONS[p.weapon];

    p.vy += GRAVITY * dt;
    if (w.affectedByWind) p.vx += wind * 0.003 * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // out of bounds
    if (p.x < -50 || p.x > WORLD_W + 50 || p.y > WORLD_H + 50) {
      p.alive = false;
      return;
    }

    // water
    if (p.y >= WATER_Y) {
      p.alive = false;
      playSound('splash');
      spawnSplash(p.x, WATER_Y);
      return;
    }

    // terrain collision
    if (isSolid(p.x, p.y)) {
      if (p.bouncesLeft > 0) {
        p.bouncesLeft--;
        // reflect off surface (simple: reverse vy, reduce speed)
        p.y -= p.vy * dt;
        p.vy *= -0.5;
        p.vx *= 0.7;
        if (Math.abs(p.vy) < 0.5 && Math.abs(p.vx) < 0.5) {
          p.bouncesLeft = 0; // stop bouncing
        }
      } else if (p.fuse <= 0 || p.fuse && p.age >= p.fuse) {
        explodeProjectile(p);
      } else {
        // sit and wait for fuse
        p.vx = 0; p.vy = 0;
        // nudge out of terrain
        while (isSolid(p.x, p.y) && p.y > 0) p.y--;
        p.y++;
        // apply gravity to sit on surface
      }
      return;
    }

    // fuse timer (for grenades sitting still)
    if (p.fuse > 0 && p.age >= p.fuse) {
      explodeProjectile(p);
      return;
    }

    // worm collision (not own team on first 10 frames)
    for (const worm of worms) {
      if (!worm.alive) continue;
      if (p.age < 10 && worm.team === p.team) continue;
      if (Math.abs(p.x - worm.x) < worm.width && Math.abs(p.y - worm.y) < worm.height) {
        if (p.fuse > 0 && p.age < p.fuse) continue; // fused weapons don't hit directly
        explodeProjectile(p);
        return;
      }
    }
  }

  function explodeProjectile(p) {
    p.alive = false;
    const w = WEAPONS[p.weapon];
    createExplosion(p.x, p.y, w.blastRadius, w.damage);

    if (p.weapon === 'holyGrenade') playSound('holy');

    // cluster
    if (w.cluster > 0) {
      setTimeout(() => {
        for (let i = 0; i < w.cluster; i++) {
          const angle = (Math.PI * 2 * i) / w.cluster + (Math.random() - 0.5) * 0.5;
          const spd = 3 + Math.random() * 3;
          const cp = createProjectile(
            p.x, p.y - 5,
            Math.cos(angle) * spd,
            Math.sin(angle) * spd - 3,
            'bazooka', p.team
          );
          cp.bouncesLeft = 0;
          cp.fuse = 0;
          projectiles.push(cp);
        }
      }, 100);
    }
  }

  // ── Airstrike ──────────────────────────────────────────────
  function fireAirstrike(targetX, team) {
    const w = WEAPONS.airstrike;
    const spread = 120;
    for (let i = 0; i < w.missiles; i++) {
      setTimeout(() => {
        const px = targetX - spread / 2 + (spread * i) / (w.missiles - 1);
        const p = createProjectile(px, -30 - i * 20, 0, 5, 'bazooka', team);
        p.fuse = 0;
        p.bouncesLeft = 0;
        projectiles.push(p);
      }, i * 120);
    }
  }

  // ── Explosions & Particles ─────────────────────────────────
  function createExplosion(x, y, radius, damage) {
    playSound('explode');
    destroyTerrain(x, y, radius);

    explosions.push({
      x, y, radius,
      maxRadius: radius,
      age: 0,
      duration: 400
    });

    // damage worms
    for (const w of worms) {
      if (!w.alive) continue;
      const dx = w.x - x, dy = w.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius * 1.5) {
        const dmgFactor = Math.max(0, 1 - dist / (radius * 1.5));
        const dmg = Math.floor(damage * dmgFactor);
        w.hp -= dmg;

        // knockback
        const kbForce = dmgFactor * 6;
        const angle = Math.atan2(dy, dx);
        w.vx += Math.cos(angle) * kbForce;
        w.vy += Math.sin(angle) * kbForce - 3 * dmgFactor;
        w.grounded = false;
        w.fallStartY = w.y;

        if (dmg > 0) {
          floatingTexts.push({
            x: w.x, y: w.y - 20,
            text: '-' + dmg,
            color: '#ff4444',
            age: 0, duration: 1500
          });
        }
      }
    }

    // spawn particles
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        life: 300 + Math.random() * 500,
        age: 0,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#ff8800' : '#ffcc00'
      });
    }
    // dirt particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 1 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 3,
        life: 500 + Math.random() * 700,
        age: 0,
        size: 2 + Math.random() * 4,
        color: TERRAINS[selectedTerrain].dirtParticle
      });
    }
  }

  function spawnSplash(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI * 0.1 - Math.random() * Math.PI * 0.8;
      const spd = 1 + Math.random() * 3;
      particles.push({
        x, y,
        vx: Math.cos(angle) * spd * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(angle) * spd,
        life: 300 + Math.random() * 400,
        age: 0,
        size: 2 + Math.random() * 3,
        color: '#4488cc'
      });
    }
  }

  // ── Camera ─────────────────────────────────────────────────
  function cameraFollow(tx, ty, snap) {
    const viewW = WORLD_W * (dw / (WORLD_W * scale));
    const viewH = WORLD_H * (dh / (WORLD_H * scale));

    let targetCamX = tx - viewW / 2;
    let targetCamY = ty - viewH / 2;

    // clamp
    targetCamX = Math.max(0, Math.min(WORLD_W - viewW, targetCamX));
    targetCamY = Math.max(0, Math.min(WORLD_H - viewH, targetCamY));

    if (snap) {
      camX = targetCamX;
      camY = targetCamY;
    } else {
      camX += (targetCamX - camX) * 0.06;
      camY += (targetCamY - camY) * 0.06;
    }
  }

  // ── Physics / Settling ─────────────────────────────────────
  function applyWormPhysics(w, dt) {
    if (!w.alive) return;

    // water death
    if (w.y >= WATER_Y) {
      w.alive = false;
      w.hp = 0;
      playSound('splash');
      spawnSplash(w.x, WATER_Y);
      floatingTexts.push({
        x: w.x, y: WATER_Y - 30,
        text: w.name + ' drowned!',
        color: '#4488cc',
        age: 0, duration: 2000
      });
      return;
    }

    // gravity
    if (!w.grounded) {
      w.vy += GRAVITY * dt;
      w.x += w.vx * dt;
      w.y += w.vy * dt;

      // terrain collision for worm
      if (isSolid(w.x, w.y)) {
        // walk up? check if stepping up 1-3 pixels works
        let landed = false;
        for (let nudge = 1; nudge <= 6; nudge++) {
          if (!isSolid(w.x, w.y - nudge)) {
            w.y = w.y - nudge;
            landed = true;
            break;
          }
        }
        if (!landed) {
          // reverse x movement
          w.x -= w.vx * dt;
          w.vx = 0;
        }

        // check grounded
        if (isSolid(w.x, w.y + 1)) {
          // fall damage
          const fallDist = w.y - w.fallStartY;
          if (fallDist > FALL_DAMAGE_THRESHOLD) {
            const dmg = Math.floor((fallDist - FALL_DAMAGE_THRESHOLD) * FALL_DAMAGE_FACTOR);
            if (dmg > 0) {
              w.hp -= dmg;
              floatingTexts.push({
                x: w.x, y: w.y - 20,
                text: '-' + dmg,
                color: '#ffaa00',
                age: 0, duration: 1200
              });
            }
          }
          w.vy = 0;
          w.vx *= 0.3;
          if (Math.abs(w.vx) < 0.1) w.vx = 0;
          w.grounded = true;
        }
      } else {
        // check if we should be grounded
        if (isSolid(w.x, w.y + 1) && w.vy >= 0) {
          const fallDist = w.y - w.fallStartY;
          if (fallDist > FALL_DAMAGE_THRESHOLD) {
            const dmg = Math.floor((fallDist - FALL_DAMAGE_THRESHOLD) * FALL_DAMAGE_FACTOR);
            if (dmg > 0) {
              w.hp -= dmg;
              floatingTexts.push({
                x: w.x, y: w.y - 20,
                text: '-' + dmg,
                color: '#ffaa00',
                age: 0, duration: 1200
              });
            }
          }
          w.vy = 0;
          w.vx *= 0.3;
          if (Math.abs(w.vx) < 0.1) w.vx = 0;
          w.grounded = true;
        }
      }
    } else {
      // grounded: check if terrain below is gone
      if (!isSolid(w.x, w.y + 1) && !isSolid(w.x, w.y + 2)) {
        w.grounded = false;
        w.fallStartY = w.y;
      }
    }

    // kill if HP <= 0
    if (w.hp <= 0 && w.alive) {
      w.alive = false;
      w.hp = 0;
      createExplosion(w.x, w.y, 15, 0); // death pop
      // team-colored death particles (tombstone confetti)
      const tc = TEAM_COLORS[w.team];
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1.5 + Math.random() * 3;
        particles.push({
          x: w.x, y: w.y - 5,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 3,
          life: 600 + Math.random() * 600,
          age: 0,
          size: 2 + Math.random() * 3,
          color: tc
        });
      }
      floatingTexts.push({
        x: w.x, y: w.y - 30,
        text: w.name + ' died!',
        color: TEAM_COLORS[w.team],
        age: 0, duration: 2000
      });
    }
  }

  function allSettled() {
    for (const w of worms) {
      if (w.alive && (!w.grounded || Math.abs(w.vx) > 0.1 || Math.abs(w.vy) > 0.1)) return false;
    }
    if (projectiles.some(p => p.alive)) return false;
    if (explosions.length > 0) return false;
    return true;
  }

  // ── AI ─────────────────────────────────────────────────────
  function aiTakeTurn() {
    if (aiThinking) return;
    aiThinking = true;

    const me = getActiveWorm();
    if (!me || !me.alive) { aiThinking = false; endTurn(); return; }

    // find nearest alive enemy
    let bestTarget = null;
    let bestDist = Infinity;
    for (const w of worms) {
      if (!w.alive || w.team === me.team) continue;
      const d = Math.abs(w.x - me.x) + Math.abs(w.y - me.y);
      if (d < bestDist) { bestDist = d; bestTarget = w; }
    }

    if (!bestTarget) { aiThinking = false; endTurn(); return; }

    // helper: check if weapon has ammo
    const hasAmmo = (w) => weaponAmmo[me.team][w] > 0;

    // choose weapon based on distance, respecting ammo
    const dist = Math.sqrt((bestTarget.x - me.x) ** 2 + (bestTarget.y - me.y) ** 2);
    let weapon;
    if (dist < 80) {
      if (hasAmmo('dynamite') && Math.random() > 0.5) weapon = 'dynamite';
      else weapon = 'shotgun';
    } else if (dist > 500) {
      const longRange = ['airstrike', 'bazooka', 'sniper'].filter(hasAmmo);
      weapon = longRange.length ? longRange[Math.floor(Math.random() * longRange.length)] : 'bazooka';
    } else {
      const choices = ['bazooka', 'grenade', 'bananaBomb', 'holyGrenade', 'sniper'].filter(hasAmmo);
      weapon = choices.length ? choices[Math.floor(Math.random() * choices.length)] : 'bazooka';
    }
    // fallback if no ammo for chosen
    if (!hasAmmo(weapon)) weapon = 'bazooka';

    selectedWeapon = weapon;
    updateWeaponUI();

    // calculate aim
    setTimeout(() => {
      const wDef = WEAPONS[weapon];

      // dynamite: just drop at feet
      if (wDef.type === 'placement') {
        const p = createProjectile(me.x, me.y - 5, 0, 0, weapon, me.team);
        projectiles.push(p);
        playSound('shoot');
        hasFired = true;
        weaponAmmo[me.team][weapon]--;
        updateWeaponUI();
        aiThinking = false;
        gameState = 'firing';
        return;
      }

      if (weapon === 'airstrike') {
        fireAirstrike(bestTarget.x + (Math.random() - 0.5) * 30, me.team);
        playSound('shoot');
        hasFired = true;
        weaponAmmo[me.team][weapon]--;
        updateWeaponUI();
        aiThinking = false;
        gameState = 'firing';
        return;
      }

      const dx = bestTarget.x - me.x;
      const dy = bestTarget.y - me.y;
      const speed = wDef.speed;

      const g = GRAVITY;
      const d = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);

      const flightTime = d / speed;
      angle -= (g * flightTime * 0.5) / speed;

      angle += (Math.random() - 0.5) * 0.15;
      const powerMod = 0.85 + Math.random() * 0.3;

      const vx = Math.cos(angle) * speed * powerMod;
      const vy = Math.sin(angle) * speed * powerMod;

      const p = createProjectile(me.x, me.y - 10, vx, vy, weapon, me.team);
      projectiles.push(p);
      playSound('shoot');
      hasFired = true;
      weaponAmmo[me.team][weapon]--;
      updateWeaponUI();
      aiThinking = false;
      gameState = 'firing';
    }, 800 + Math.random() * 600);
  }

  // ── Input Handling ─────────────────────────────────────────
  function screenToWorld(sx, sy) {
    return {
      x: sx / scale + camX,
      y: sy / scale + camY
    };
  }

  function worldToScreen(wx, wy) {
    return {
      x: (wx - camX) * scale,
      y: (wy - camY) * scale
    };
  }

  function handlePointerDown(sx, sy, id) {
    if (gameState !== 'playerMove' || hasFired) return;
    const me = getActiveWorm();
    if (!me || !me.alive) return;

    const wp = screenToWorld(sx, sy);
    inputId = id;
    dragStart = { x: wp.x, y: wp.y };
    dragCurrent = { x: wp.x, y: wp.y };
    isDragging = true;
  }

  function handlePointerMove(sx, sy, id) {
    if (!isDragging || id !== inputId) return;
    const wp = screenToWorld(sx, sy);
    dragCurrent = { x: wp.x, y: wp.y };
  }

  function handlePointerUp(sx, sy, id) {
    if (!isDragging || id !== inputId) return;
    isDragging = false;

    const me = getActiveWorm();
    if (!me || !me.alive || gameState !== 'playerMove' || hasFired) return;

    // check ammo
    if (weaponAmmo[currentTeam][selectedWeapon] <= 0) return;

    const wp = screenToWorld(sx, sy);
    const w = WEAPONS[selectedWeapon];

    // dynamite: place at feet, no aiming needed
    if (w.type === 'placement') {
      const p = createProjectile(me.x, me.y - 5, 0, 0, selectedWeapon, me.team);
      projectiles.push(p);
      playSound('shoot');
      hasFired = true;
      weaponAmmo[currentTeam][selectedWeapon]--;
      updateWeaponUI();
      gameState = 'firing';
      return;
    }

    const dx = wp.x - me.x;
    const dy = wp.y - (me.y - 8);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) return; // too close, treat as tap

    if (w.type === 'airstrike') {
      fireAirstrike(wp.x, me.team);
      playSound('shoot');
      hasFired = true;
      weaponAmmo[currentTeam][selectedWeapon]--;
      updateWeaponUI();
      gameState = 'firing';
      return;
    }

    // power = distance mapped to weapon speed
    const maxDrag = 150;
    const power = Math.min(dist / maxDrag, 1) * w.speed;
    const angle = Math.atan2(dy, dx);

    if (w.pellets) {
      // shotgun: multiple pellets
      for (let i = 0; i < w.pellets; i++) {
        const spread = (Math.random() - 0.5) * 0.15;
        const p = createProjectile(
          me.x, me.y - 10,
          Math.cos(angle + spread) * (power + Math.random()),
          Math.sin(angle + spread) * (power + Math.random()),
          selectedWeapon, me.team
        );
        projectiles.push(p);
      }
    } else {
      const p = createProjectile(
        me.x, me.y - 10,
        Math.cos(angle) * power,
        Math.sin(angle) * power,
        selectedWeapon, me.team
      );
      projectiles.push(p);
    }

    playSound('shoot');
    hasFired = true;
    weaponAmmo[currentTeam][selectedWeapon]--;
    updateWeaponUI();
    gameState = 'firing';
  }

  // touch events
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    handlePointerDown(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    handlePointerMove(t.clientX, t.clientY, t.identifier);
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    const t = e.changedTouches[0];
    handlePointerUp(t.clientX, t.clientY, t.identifier);
  }, { passive: false });

  // mouse events
  canvas.addEventListener('mousedown', e => handlePointerDown(e.clientX, e.clientY, -1));
  canvas.addEventListener('mousemove', e => handlePointerMove(e.clientX, e.clientY, -1));
  canvas.addEventListener('mouseup', e => handlePointerUp(e.clientX, e.clientY, -1));

  // movement buttons
  let moveInterval = null;
  function startMove(dir) {
    if (gameState !== 'playerMove' || moveStepsLeft <= 0) return;
    const me = getActiveWorm();
    if (!me || !me.alive || !me.grounded) return;

    stopMove();
    moveInterval = setInterval(() => {
      if (moveStepsLeft <= 0 || !me.grounded || gameState !== 'playerMove') { stopMove(); return; }
      const nx = me.x + dir * MOVE_SPEED;
      // check terrain ahead
      if (isSolid(nx, me.y)) {
        // try step up
        let stepped = false;
        for (let up = 1; up <= 6; up++) {
          if (!isSolid(nx, me.y - up) && isSolid(nx, me.y - up + 1)) {
            me.x = nx;
            me.y = me.y - up;
            stepped = true;
            break;
          }
        }
        if (!stepped) return; // wall
      } else {
        me.x = nx;
        // snap down to surface
        let fell = false;
        for (let d = 1; d <= 8; d++) {
          if (isSolid(me.x, me.y + d)) {
            me.y = me.y + d - 1;
            fell = true;
            break;
          }
        }
        if (!fell) {
          // bigger fall, use physics
          me.grounded = false;
          me.fallStartY = me.y;
          stopMove();
          return;
        }
      }
      moveStepsLeft--;
      me.x = Math.max(5, Math.min(WORLD_W - 5, me.x));
    }, 20);
  }
  function stopMove() {
    if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
  }

  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnJump = document.getElementById('btnJump');

  btnLeft.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); startMove(-1); }, { passive: false });
  btnLeft.addEventListener('mousedown', e => { e.stopPropagation(); startMove(-1); });
  btnRight.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); startMove(1); }, { passive: false });
  btnRight.addEventListener('mousedown', e => { e.stopPropagation(); startMove(1); });

  ['touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(evt => {
    btnLeft.addEventListener(evt, stopMove);
    btnRight.addEventListener(evt, stopMove);
  });

  btnJump.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); doJump(); }, { passive: false });
  btnJump.addEventListener('mousedown', e => { e.stopPropagation(); doJump(); });

  function doJump() {
    if (gameState !== 'playerMove') return;
    const me = getActiveWorm();
    if (!me || !me.alive || !me.grounded) return;
    me.vy = JUMP_POWER;
    me.grounded = false;
    me.fallStartY = me.y;
    moveStepsLeft = Math.max(0, moveStepsLeft - 20);
  }

  // weapon selection
  document.querySelectorAll('.weapon-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (gameState !== 'playerMove' || hasFired) return;
      const wkey = btn.dataset.weapon;
      if (weaponAmmo[currentTeam][wkey] <= 0) return; // out of ammo
      selectedWeapon = wkey;
      updateWeaponUI();
    });
    btn.addEventListener('touchstart', e => {
      e.stopPropagation();
    }, { passive: false });
  });

  function updateWeaponUI() {
    document.querySelectorAll('.weapon-btn').forEach(b => {
      const wkey = b.dataset.weapon;
      const ammo = weaponAmmo[currentTeam] ? weaponAmmo[currentTeam][wkey] : Infinity;
      b.classList.toggle('selected', wkey === selectedWeapon);
      b.classList.toggle('disabled', ammo <= 0);

      // update ammo badge
      let badge = b.querySelector('.ammo-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'ammo-badge';
        b.appendChild(badge);
      }
      badge.textContent = ammo === Infinity ? '' : ammo <= 0 ? '0' : 'x' + ammo;
    });
  }

  // ── Turns ──────────────────────────────────────────────────
  function startGame(ai) {
    vsAI = ai;
    paused = false;
    usedNames = [];
    generateTerrain();
    placeWorms();
    currentTeam = 0;
    currentWormIdx = [0, 0];
    selectedWeapon = 'bazooka';
    wind = (Math.random() - 0.5) * 10;
    projectiles = [];
    explosions = [];
    particles = [];
    floatingTexts = [];
    hasFired = false;
    aiThinking = false;

    // init ammo per team
    weaponAmmo = [
      Object.assign({}, DEFAULT_AMMO),
      Object.assign({}, DEFAULT_AMMO)
    ];

    gameStartTime = Date.now();

    // If a custom terrain config was pending, load it and re-place worms
    if (customTerrainConfig) {
      loadTerrainFromConfig(customTerrainConfig);
      customTerrainConfig = null;
      placeWorms();
    }

    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('terrainScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('gameHUD').classList.remove('hidden');

    updateWeaponUI();
    updateHUD();

    activeWorm = getActiveWorm();
    cameraFollow(activeWorm.x, activeWorm.y, true);

    startTurn();
  }

  function startTurn() {
    // find next alive worm for current team
    const teamWorms = teams[currentTeam];
    let tries = 0;
    while (tries < teamWorms.length) {
      const idx = teamWorms[currentWormIdx[currentTeam]];
      if (worms[idx].alive) break;
      currentWormIdx[currentTeam] = (currentWormIdx[currentTeam] + 1) % teamWorms.length;
      tries++;
    }

    activeWorm = getActiveWorm();
    if (!activeWorm || !activeWorm.alive) {
      // this team is dead, check game over
      checkGameOver();
      return;
    }

    gameState = 'turnStart';
    hasFired = false;
    moveStepsLeft = MAX_MOVE_STEPS;
    wind = wind + (Math.random() - 0.5) * 3;
    wind = Math.max(-8, Math.min(8, wind));

    updateHUD();

    // show banner
    const banner = document.getElementById('turnBanner');
    const bannerText = document.getElementById('bannerText');
    bannerText.textContent = TEAM_NAMES[currentTeam] + "'s Turn!";
    bannerText.style.color = TEAM_COLORS[currentTeam];
    banner.classList.remove('hidden');

    cameraFollow(activeWorm.x, activeWorm.y, false);

    setTimeout(() => {
      banner.classList.add('hidden');
      gameState = 'playerMove';
      startTurnTimer();

      // AI turn
      if (vsAI && currentTeam === 1) {
        aiTakeTurn();
      }
    }, 1200);
  }

  function startTurnTimer(fromTime) {
    turnTimer = fromTime !== undefined ? fromTime : TURN_TIME;
    clearInterval(turnTimerInterval);
    turnTimerInterval = setInterval(() => {
      turnTimer--;
      document.getElementById('turnTimer').textContent = turnTimer;
      if (turnTimer <= 0) {
        clearInterval(turnTimerInterval);
        if (gameState === 'playerMove' || gameState === 'aiming') {
          endTurn();
        }
        // if firing/settling, the update() loop will handle the transition
      }
    }, 1000);
  }

  function endTurn() {
    clearInterval(turnTimerInterval);
    stopMove();

    if (!hasFired && allSettled()) {
      // timer expired with no shot — nothing to settle, advance immediately
      if (checkGameOver()) return;
      currentWormIdx[currentTeam] = (currentWormIdx[currentTeam] + 1) % teams[currentTeam].length;
      currentTeam = 1 - currentTeam;
      gameState = 'turnStart';
      setTimeout(() => startTurn(), 300);
    } else {
      // shot was fired or physics still active — let update() loop handle settling
      gameState = 'settling';
    }
  }

  function checkGameOver() {
    const alive0 = teams[0].some(i => worms[i].alive);
    const alive1 = teams[1].some(i => worms[i].alive);

    if (!alive0 || !alive1) {
      gameState = 'gameOver';
      clearInterval(turnTimerInterval);

      const winner = alive0 ? TEAM_NAMES[0] : (alive1 ? TEAM_NAMES[1] : 'Nobody');
      const winColor = alive0 ? TEAM_COLORS[0] : (alive1 ? TEAM_COLORS[1] : '#fff');

      document.getElementById('gameHUD').classList.add('hidden');
      const screen = document.getElementById('gameOverScreen');
      const text = document.getElementById('winnerText');
      text.textContent = winner + ' Wins!';
      text.style.color = winColor;
      screen.classList.remove('hidden');

      // Record match result for signed-in users
      const durationSec = Math.round((Date.now() - gameStartTime) / 1000);
      const winnerTeamIdx = alive0 ? 0 : (alive1 ? 1 : -1);
      const wormsLeft = winnerTeamIdx >= 0 ? teams[winnerTeamIdx].filter(i => worms[i].alive).length : 0;

      if (window.wormsUser && vsAI) {
        // Team 0 = player, Team 1 = CPU
        const result = alive0 ? 'win' : 'loss';
        if (typeof window.wormsRecordMatch === 'function') {
          window.wormsRecordMatch(result, 'cpu', selectedTerrain, durationSec, wormsLeft);
        }
      } else if (window.wormsUser && !vsAI) {
        // 2-player mode: record for team 0 = player 1
        const result = alive0 ? 'win' : 'loss';
        if (typeof window.wormsRecordMatch === 'function') {
          window.wormsRecordMatch(result, 'human', selectedTerrain, durationSec, wormsLeft);
        }
      }

      return true;
    }
    return false;
  }

  function updateHUD() {
    // team name
    document.getElementById('teamName').textContent = TEAM_NAMES[currentTeam] + "'s Turn";
    document.getElementById('teamName').style.color = TEAM_COLORS[currentTeam];
    document.getElementById('turnTimer').textContent = turnTimer;

    // wind
    const windPct = wind / 8 * 50;
    const indicator = document.getElementById('windIndicator');
    if (windPct >= 0) {
      indicator.style.left = '50%';
      indicator.style.width = Math.abs(windPct) + '%';
      indicator.style.background = '#3498db';
    } else {
      indicator.style.left = (50 + windPct) + '%';
      indicator.style.width = Math.abs(windPct) + '%';
      indicator.style.background = '#e74c3c';
    }

    // team health
    const maxHP = WORMS_PER_TEAM * 100;
    const hp0 = teams[0].reduce((s, i) => s + Math.max(0, worms[i].hp), 0);
    const hp1 = teams[1].reduce((s, i) => s + Math.max(0, worms[i].hp), 0);
    document.getElementById('team1Fill').style.width = (hp0 / maxHP * 100) + '%';
    document.getElementById('team2Fill').style.width = (hp1 / maxHP * 100) + '%';
  }

  // ── Rendering ──────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, dw, dh);
    if (!terrainCanvas) return;

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camX, -camY);

    drawSky();
    drawWater();

    // terrain
    ctx.drawImage(terrainCanvas, 0, 0);

    // worms
    for (const w of worms) {
      if (!w.alive) continue;
      drawWorm(w);
    }

    // projectiles
    for (const p of projectiles) {
      if (!p.alive) continue;
      drawProjectile(p);
    }

    // explosions
    for (const e of explosions) {
      drawExplosion(e);
    }

    // particles
    for (const p of particles) {
      const alpha = 1 - p.age / p.life;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // floating texts
    for (const ft of floatingTexts) {
      const alpha = 1 - ft.age / ft.duration;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y - ft.age * 0.02);
    }
    ctx.globalAlpha = 1;

    // aim line (always show for placement weapons, drag for others)
    if (gameState === 'playerMove' && !hasFired) {
      const w = WEAPONS[selectedWeapon];
      if (w.type === 'placement' || isDragging) {
        drawAimLine();
      }
    }

    ctx.restore();
  }

  function drawSky() {
    const t = TERRAINS[selectedTerrain];
    const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    for (const s of t.sky) grad.addColorStop(s.stop, s.color);
    ctx.fillStyle = grad;
    ctx.fillRect(camX, camY, dw / scale, dh / scale);
  }

  function drawWater() {
    const t = TERRAINS[selectedTerrain];
    const waterGrad = ctx.createLinearGradient(0, WATER_Y, 0, WORLD_H);
    for (const s of t.water) waterGrad.addColorStop(s.stop, s.color);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(camX, WATER_Y, dw / scale, WORLD_H - WATER_Y);

    // animated wave
    ctx.strokeStyle = t.waterWave;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const waveT = Date.now() * 0.002;
    for (let x = Math.floor(camX); x < camX + dw / scale; x += 4) {
      const wy = WATER_Y + Math.sin(x * 0.03 + waveT) * 3;
      x === Math.floor(camX) ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
    }
    ctx.stroke();
  }

  function drawWorm(w) {
    const isActive = w === activeWorm && (gameState === 'playerMove' || gameState === 'turnStart');
    const c = TEAM_COLORS[w.team];
    const hpPct = Math.max(0, w.hp / 100);
    const t = Date.now();

    // idle breathing animation
    const breathe = Math.sin(t * 0.004) * 0.8;
    const squish = isActive ? Math.sin(t * 0.006) * 0.3 : 0;

    ctx.save();
    ctx.translate(w.x, w.y);

    // ── Shadow ──
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 7, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Tail (little nub behind body) ──
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(-4, -2, 3, 2.5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // ── Body (plump segmented look) ──
    // lower body segment
    const darkerC = w.team === 0 ? '#cc2222' : '#2266cc';
    ctx.fillStyle = darkerC;
    ctx.beginPath();
    ctx.ellipse(0, -3 + breathe * 0.5, 6.5 + squish, 7 - squish, 0, 0, Math.PI * 2);
    ctx.fill();

    // main body (lighter, overlapping)
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(0.5, -5 + breathe, 5.5 + squish, 6.5 - squish, 0.05, 0, Math.PI * 2);
    ctx.fill();

    // belly highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.ellipse(1, -4 + breathe, 3, 4, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes ──
    const eyeY = -8 + breathe;
    const eyeSpacing = 3;

    // expression based on HP
    let eyeW = 2.5, eyeH = 2.8;
    let pupilOx = 0.3, pupilOy = 0;
    let browAngle = 0;

    if (hpPct <= 0.25) {
      // worried / scared — wide eyes, raised brows
      eyeW = 3; eyeH = 3.5;
      pupilOy = 0.5;
      browAngle = 0.3;
    } else if (hpPct <= 0.5) {
      // angry — squinted, furrowed brows
      eyeH = 2;
      browAngle = -0.4;
      pupilOx = 0.5;
    }

    // white of eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-eyeSpacing + 1.5, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(eyeSpacing + 1.5, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    // pupils (look toward nearest enemy or track mouse)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 1.5 + pupilOx, eyeY + pupilOy, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 1.5 + pupilOx, eyeY + pupilOy, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // pupil shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-eyeSpacing + 1 + pupilOx, eyeY - 0.5 + pupilOy, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeSpacing + 1 + pupilOx, eyeY - 0.5 + pupilOy, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // eyebrows (mood-dependent)
    if (browAngle !== 0) {
      ctx.strokeStyle = c === '#ff4444' ? '#aa0000' : '#003399';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.save();
      ctx.translate(-eyeSpacing + 1.5, eyeY - eyeH - 1);
      ctx.rotate(browAngle);
      ctx.moveTo(-2.5, 0);
      ctx.lineTo(2.5, 0);
      ctx.restore();
      ctx.stroke();

      ctx.beginPath();
      ctx.save();
      ctx.translate(eyeSpacing + 1.5, eyeY - eyeH - 1);
      ctx.rotate(-browAngle);
      ctx.moveTo(-2.5, 0);
      ctx.lineTo(2.5, 0);
      ctx.restore();
      ctx.stroke();
    }

    // ── Mouth ──
    ctx.strokeStyle = darkerC;
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (hpPct <= 0.25) {
      // worried frown
      ctx.arc(2, -3.5 + breathe, 2, 0.2, Math.PI - 0.2);
    } else if (hpPct <= 0.5) {
      // gritted teeth line
      ctx.moveTo(0.5, -4.5 + breathe);
      ctx.lineTo(3.5, -4.5 + breathe);
    } else {
      // little smile
      ctx.arc(2, -5.5 + breathe, 2, 0.3, Math.PI - 0.3, true);
    }
    ctx.stroke();

    // ── Team Accessory ──
    if (w.team === 0) {
      // Red team: bandana
      ctx.fillStyle = '#cc0000';
      ctx.beginPath();
      ctx.moveTo(-5, -11 + breathe);
      ctx.quadraticCurveTo(0, -14 + breathe, 6, -11 + breathe);
      ctx.lineTo(5, -10 + breathe);
      ctx.quadraticCurveTo(0, -12.5 + breathe, -4, -10 + breathe);
      ctx.fill();
      // bandana knot/tail
      ctx.fillStyle = '#aa0000';
      ctx.beginPath();
      ctx.moveTo(-5, -10.5 + breathe);
      ctx.lineTo(-8, -9 + breathe);
      ctx.lineTo(-7, -11 + breathe);
      ctx.closePath();
      ctx.fill();
    } else {
      // Blue team: helmet
      ctx.fillStyle = '#2255aa';
      ctx.beginPath();
      ctx.arc(1, -10.5 + breathe, 6.5, Math.PI, 0);
      ctx.fill();
      // helmet rim
      ctx.fillStyle = '#1a4488';
      ctx.fillRect(-5.5, -10.5 + breathe, 13, 2);
      // helmet shine
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(-1, -13 + breathe, 3, 1.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // ── Name & HP (drawn in world space, not translated) ──
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';

    // name shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(w.name, w.x + 0.5, w.y - 18.5);
    // name
    ctx.fillStyle = '#fff';
    ctx.fillText(w.name, w.x, w.y - 19);

    // HP bar
    const barW = 22;
    const barH = 3;
    const barX = w.x - barW / 2;
    const barY = w.y - 17;
    // background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.roundRect(barX - 1, barY - 0.5, barW + 2, barH + 1, 2);
    ctx.fill();
    // fill
    const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpPct, barH, 1.5);
    ctx.fill();
    // shine on hp bar
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(barX, barY, barW * hpPct, 1);

    // ── Active indicator (bouncing arrow) ──
    if (isActive) {
      const bobY = Math.sin(t * 0.005) * 3;
      ctx.fillStyle = '#ffdd57';
      ctx.beginPath();
      ctx.moveTo(w.x, w.y - 28 + bobY);
      ctx.lineTo(w.x - 4, w.y - 24 + bobY);
      ctx.lineTo(w.x + 4, w.y - 24 + bobY);
      ctx.closePath();
      ctx.fill();

      // glow
      ctx.shadowColor = '#ffdd57';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawProjectile(p) {
    // trail
    ctx.strokeStyle = 'rgba(255,200,50,0.3)';
    ctx.lineWidth = 1.5;
    if (p.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(p.trail[0].x, p.trail[0].y);
      for (let i = 1; i < p.trail.length; i++) {
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
      }
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // body
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // fuse indicator
    const w = WEAPONS[p.weapon];
    if (w.fuse > 0 && p.age < w.fuse) {
      const remaining = Math.ceil((w.fuse - p.age) / 1000);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(remaining, p.x, p.y - 8);
    }
  }

  function drawExplosion(e) {
    const progress = e.age / e.duration;
    const r = e.maxRadius * (0.3 + progress * 0.7);
    const alpha = 1 - progress;

    // outer glow
    const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
    grad.addColorStop(0, `rgba(255,255,200,${alpha})`);
    grad.addColorStop(0.3, `rgba(255,150,50,${alpha * 0.8})`);
    grad.addColorStop(0.7, `rgba(200,50,0,${alpha * 0.4})`);
    grad.addColorStop(1, `rgba(100,20,0,0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAimLine() {
    const me = getActiveWorm();
    if (!me) return;

    const w = WEAPONS[selectedWeapon];

    // placement weapons show blast radius preview
    if (w.type === 'placement') {
      ctx.strokeStyle = 'rgba(255,100,50,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(me.x, me.y, w.blastRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    const dx = dragCurrent.x - me.x;
    const dy = dragCurrent.y - (me.y - 8);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;

    const maxDrag = 150;
    const power = Math.min(dist / maxDrag, 1) * w.speed;
    const angle = Math.atan2(dy, dx);

    if (w.type === 'airstrike') {
      // show vertical strike zone
      ctx.strokeStyle = 'rgba(255,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(dragCurrent.x - 60, 0);
      ctx.lineTo(dragCurrent.x - 60, WATER_Y);
      ctx.moveTo(dragCurrent.x + 60, 0);
      ctx.lineTo(dragCurrent.x + 60, WATER_Y);
      ctx.stroke();
      ctx.setLineDash([]);

      // crosshair
      ctx.strokeStyle = 'rgba(255,50,50,0.8)';
      ctx.beginPath();
      ctx.arc(dragCurrent.x, dragCurrent.y, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(dragCurrent.x - 20, dragCurrent.y);
      ctx.lineTo(dragCurrent.x + 20, dragCurrent.y);
      ctx.moveTo(dragCurrent.x, dragCurrent.y - 20);
      ctx.lineTo(dragCurrent.x, dragCurrent.y + 20);
      ctx.stroke();
      return;
    }

    const vx = Math.cos(angle) * power;
    const vy = Math.sin(angle) * power;

    // trajectory preview
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();

    let px = me.x, py = me.y - 10;
    let pvx = vx, pvy = vy;
    ctx.moveTo(px, py);

    for (let i = 0; i < 60; i++) {
      pvy += GRAVITY;
      if (w.affectedByWind) pvx += wind * 0.003;
      px += pvx;
      py += pvy;
      if (isSolid(px, py) || py > WATER_Y || px < 0 || px > WORLD_W) break;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // power bar
    const pct = Math.min(dist / maxDrag, 1);
    const barStartX = me.x;
    const barStartY = me.y - 30;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(barStartX - 15, barStartY, 30, 4);
    ctx.fillStyle = pct > 0.7 ? '#e74c3c' : pct > 0.4 ? '#f39c12' : '#2ecc71';
    ctx.fillRect(barStartX - 15, barStartY, 30 * pct, 4);
  }

  // ── Update Loop ────────────────────────────────────────────
  function update(dt) {
    if (gameState === 'menu' || gameState === 'gameOver' || gameState === 'terrainSelect' || paused) return;

    // update projectiles
    for (const p of projectiles) {
      if (p.alive) updateProjectile(p, dt);
    }
    projectiles = projectiles.filter(p => p.alive);

    // update explosions
    for (const e of explosions) {
      e.age += dt * 16;
    }
    explosions = explosions.filter(e => e.age < e.duration);

    // update particles
    for (const p of particles) {
      p.vy += GRAVITY * 0.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.age += dt * 16;
    }
    particles = particles.filter(p => p.age < p.life);

    // update floating texts
    for (const ft of floatingTexts) {
      ft.age += dt * 16;
    }
    floatingTexts = floatingTexts.filter(ft => ft.age < ft.duration);

    // update worm physics
    for (const w of worms) {
      applyWormPhysics(w, dt);
    }

    // camera follow
    if (gameState === 'firing' && projectiles.length > 0) {
      const p = projectiles[projectiles.length - 1];
      cameraFollow(p.x, p.y, false);
    } else if (activeWorm && activeWorm.alive) {
      cameraFollow(activeWorm.x, activeWorm.y, false);
    }

    // state transitions
    if (gameState === 'firing' && projectiles.length === 0 && explosions.length === 0) {
      gameState = 'settling';
    }

    if (gameState === 'settling' && allSettled()) {
      updateHUD();
      if (!checkGameOver()) {
        currentWormIdx[currentTeam] = (currentWormIdx[currentTeam] + 1) % teams[currentTeam].length;
        currentTeam = 1 - currentTeam;
        setTimeout(() => startTurn(), 500);
        gameState = 'turnStart'; // prevent re-entry
      }
    }
  }

  // ── Main Loop ──────────────────────────────────────────────
  let lastTime = 0;
  function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const dt = lastTime ? Math.min((time - lastTime) / 16, 3) : 1;
    lastTime = time;

    update(dt);
    render();
    if (typeof updateExposedState === 'function') updateExposedState();
  }

  // ── Resize ─────────────────────────────────────────────────
  function resize() {
    dw = window.innerWidth;
    dh = window.innerHeight;
    canvas.width = dw;
    canvas.height = dh;

    // scale so world fits width, allow vertical scrolling via camera
    scale = dw / WORLD_W;
    // but if world is very tall compared to screen, adjust
    if (WORLD_H * scale > dh * 1.3) {
      scale = dh / WORLD_H;
    }
  }

  window.addEventListener('resize', resize);
  resize();

  // ── Menu Buttons ───────────────────────────────────────────
  let pendingAI = false;

  function showTerrainSelect(ai) {
    pendingAI = ai;
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('terrainScreen').classList.remove('hidden');
    gameState = 'terrainSelect';
  }

  document.getElementById('btn2Player').addEventListener('click', () => showTerrainSelect(false));
  document.getElementById('btnVsCPU').addEventListener('click', () => showTerrainSelect(true));

  // terrain cards
  document.querySelectorAll('.terrain-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedTerrain = card.dataset.terrain;
      startGame(pendingAI);
    });
  });

  document.getElementById('btnPlayAgain').addEventListener('click', () => {
    startGame(vsAI);
  });
  document.getElementById('btnBackToMenu').addEventListener('click', () => {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
    gameState = 'menu';
  });

  // ── Pause Menu ────────────────────────────────────────────
  document.getElementById('btnPause').addEventListener('click', e => {
    e.stopPropagation();
    if (gameState === 'gameOver' || gameState === 'menu') return;
    paused = true;
    turnTimerRemaining = turnTimer;
    clearInterval(turnTimerInterval);
    document.getElementById('pauseMenu').classList.remove('hidden');
  });

  document.getElementById('btnResume').addEventListener('click', () => {
    paused = false;
    document.getElementById('pauseMenu').classList.add('hidden');
    if (gameState === 'playerMove' || gameState === 'aiming') {
      startTurnTimer(turnTimerRemaining);
    }
  });

  document.getElementById('btnRestart').addEventListener('click', () => {
    paused = false;
    document.getElementById('pauseMenu').classList.add('hidden');
    startGame(vsAI);
  });

  document.getElementById('btnQuitToMenu').addEventListener('click', () => {
    paused = false;
    clearInterval(turnTimerInterval);
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('gameHUD').classList.add('hidden');
    document.getElementById('menuScreen').classList.remove('hidden');
    gameState = 'menu';
  });

  // prevent default touch behaviors
  document.addEventListener('touchmove', e => {
    if (e.target === canvas) e.preventDefault();
  }, { passive: false });

  // ── External Hooks (for auth, chat, community integration) ──

  // Expose game state for chat context
  function updateExposedState() {
    window.wormsGameState = {
      state: gameState,
      selectedTerrain,
      wind,
      activeWorm: activeWorm ? { x: activeWorm.x, y: activeWorm.y, hp: activeWorm.hp, team: activeWorm.team } : null,
      worms: worms.map(w => ({ x: w.x, y: w.y, hp: w.hp, team: w.team, alive: w.alive, name: w.name })),
      weaponAmmo: weaponAmmo[currentTeam] || {},
      currentTeam,
      vsAI
    };
  }

  // updateExposedState is called from the game loop (see gameLoop modification below)

  // Load terrain from config (heights array + theme + modifications)
  function loadTerrainFromConfig(config) {
    if (!config || !config.heights || !terrainData) return;

    // Apply heights
    terrainData.fill(0);
    for (let x = 0; x < WORLD_W; x++) {
      const topY = config.heights[x] || 440;
      for (let y = Math.max(0, Math.floor(topY)); y < WATER_Y; y++) {
        if (y < WORLD_H) terrainData[y * WORLD_W + x] = 1;
      }
    }

    // Apply modifications (carved areas, added platforms, etc.)
    for (const mod of (config.modifications || [])) {
      if (mod.type === 'circle') {
        const r2 = mod.r * mod.r;
        for (let y = Math.max(0, mod.y - mod.r); y <= Math.min(WORLD_H - 1, mod.y + mod.r); y++) {
          for (let x = Math.max(0, mod.x - mod.r); x <= Math.min(WORLD_W - 1, mod.x + mod.r); x++) {
            if ((x - mod.x) ** 2 + (y - mod.y) ** 2 <= r2) {
              terrainData[y * WORLD_W + x] = mod.fill;
            }
          }
        }
      } else if (mod.type === 'rect') {
        for (let y = Math.max(0, Math.floor(mod.y)); y < Math.min(WORLD_H, Math.floor(mod.y + mod.h)); y++) {
          for (let x = Math.max(0, Math.floor(mod.x)); x < Math.min(WORLD_W, Math.floor(mod.x + mod.w)); x++) {
            terrainData[y * WORLD_W + x] = mod.fill;
          }
        }
      }
    }

    // Set theme if specified
    if (config.theme && TERRAINS[config.theme]) {
      selectedTerrain = config.theme;
    }

    renderTerrainCanvas();
  }

  // Extract current terrain as a config
  function getTerrainConfig() {
    if (!terrainData) return null;
    const heights = new Array(WORLD_W);
    for (let x = 0; x < WORLD_W; x++) {
      heights[x] = WATER_Y; // default to water level
      for (let y = 0; y < WATER_Y; y++) {
        if (terrainData[y * WORLD_W + x]) {
          heights[x] = y;
          break;
        }
      }
    }
    return { heights, theme: selectedTerrain, modifications: [] };
  }

  // Start game with a community terrain config
  function startWithTerrain(config) {
    customTerrainConfig = config;
    selectedTerrain = config.theme || 'greenHills';
    startGame(true); // default to vs CPU for community terrains
  }

  // Expose hooks to window
  window.wormsLoadTerrain = loadTerrainFromConfig;
  window.wormsGetTerrainConfig = getTerrainConfig;
  window.wormsStartWithTerrain = startWithTerrain;
  window.wormsGameState = {};

  // ── Start ──────────────────────────────────────────────────
  requestAnimationFrame(gameLoop);

})();
