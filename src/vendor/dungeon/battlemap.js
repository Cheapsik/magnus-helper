// Battlemap rendering: textured KayKit floor tiles, thick stone walls with cast shadows, wooden doors,
// stone stairs, lit torches and painted props for the things KayKit does not model.
(function (root) {
  const F = root.Dungeon.FLAGS;
  const PX = 128; // baked sprite resolution per cell

  const FLOORS = {
    stone: { big: 'kaykit/floor_tile_large.png', small: ['kaykit/floor_tile_small.png', 'kaykit/floor_tile_small_broken_a.png', 'kaykit/floor_tile_small_broken_b.png', 'kaykit/floor_tile_small_weeds_a.png', 'kaykit/floor_tile_small_weeds_b.png', 'kaykit/floor_tile_small_decorated.png'], alt: 'kaykit/floor_tile_large_rocks.png' },
    wood: { big: 'kaykit/floor_wood_large.png', small: ['kaykit/floor_wood_small.png'], alt: 'kaykit/floor_wood_large.png' },
    dirt: { big: 'kaykit/floor_dirt_large.png', small: ['kaykit/floor_dirt_small_a.png', 'kaykit/floor_dirt_small_b.png', 'kaykit/floor_dirt_small_c.png', 'kaykit/floor_dirt_small_d.png'], alt: 'kaykit/floor_dirt_large_rocky.png' },
  };
  const FILES = Object.values(FLOORS).flatMap(f => [f.big, f.alt, ...f.small]);
  const WOOD_ROOMS = new Set(['Bedchamber', 'Library', 'Study', 'Dining Hall', 'Barracks']);
  // overall tint per battlemap style: multiply colour over the baked floor and the wall stone
  const LOOKS = {
    Battlemap: { floorTint: 'rgba(70,72,80,0.55)', wall: '#45464c', wallLight: '#62636a', wallDark: '#1c1c20', bg: '#0b0b0d' },
    'Battlemap Sandstone': { floorTint: 'rgba(150,110,60,0.45)', wall: '#6d5741', wallLight: '#8a7155', wallDark: '#2a1f14', bg: '#0d0a07' },
    'Battlemap Basalt': { floorTint: 'rgba(30,32,38,0.7)', wall: '#2f3136', wallLight: '#4a4c53', wallDark: '#101113', bg: '#060607' },
  };

  const hash = (r, c, k = 0) => (((r * 73856093) ^ (c * 19349663) ^ (k * 83492791)) >>> 0) % 1000 / 1000;

  // ---- painted props ------------------------------------------------------------------------
  const painted = {};
  function paintSprite(name, w, h) {
    const key = `${name}:${w}x${h}`;
    if (painted[key]) return painted[key];
    const c = document.createElement('canvas');
    c.width = w * PX; c.height = h * PX;
    const x = c.getContext('2d'), W = c.width, H = c.height;
    const blob = (cx, cy, rx, ry, fill, stroke) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 3; x.stroke(); } };
    const shade = (cx, cy, r, inner, outer) => { const g = x.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); g.addColorStop(0, inner); g.addColorStop(1, outer); return g; };
    switch (name) {
      case 'campfire': {
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; blob(W / 2 + Math.cos(a) * 44, H / 2 + Math.sin(a) * 44, 15, 12, shade(W / 2 + Math.cos(a) * 44, H / 2 + Math.sin(a) * 44, 16, '#9b9ba0', '#4a4a50'), '#26262a'); }
        x.lineCap = 'round';
        [[-28, -20, 28, 22], [-26, 24, 26, -22], [0, -34, 2, 32]].forEach(([a, b, c2, d2]) => { x.strokeStyle = '#3b2414'; x.lineWidth = 16; x.beginPath(); x.moveTo(W / 2 + a, H / 2 + b); x.lineTo(W / 2 + c2, H / 2 + d2); x.stroke(); x.strokeStyle = '#6e4423'; x.lineWidth = 9; x.stroke(); });
        const g = x.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, 34); g.addColorStop(0, '#fff6c2'); g.addColorStop(0.35, '#ffb52e'); g.addColorStop(0.8, 'rgba(230,80,20,0.7)'); g.addColorStop(1, 'rgba(200,40,10,0)');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        break;
      }
      case 'coffin': {
        const path = () => { x.beginPath(); x.moveTo(W * 0.5, H * 0.04); x.lineTo(W * 0.86, H * 0.2); x.lineTo(W * 0.74, H * 0.96); x.lineTo(W * 0.26, H * 0.96); x.lineTo(W * 0.14, H * 0.2); x.closePath(); };
        path(); x.fillStyle = '#3d2616'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#1b1009'; x.stroke();
        x.save(); x.scale(1, 1); path(); x.clip();
        for (let y = 0; y < H; y += 22) { x.fillStyle = y % 44 ? 'rgba(255,220,180,0.05)' : 'rgba(0,0,0,0.12)'; x.fillRect(0, y, W, 11); }
        x.restore();
        x.fillStyle = '#b99a5a'; x.fillRect(W * 0.46, H * 0.24, W * 0.08, H * 0.42); x.fillRect(W * 0.34, H * 0.34, W * 0.32, H * 0.06);
        break;
      }
      case 'rug': {
        x.fillStyle = '#5a1a1d'; x.fillRect(W * 0.06, H * 0.04, W * 0.88, H * 0.92);
        x.strokeStyle = '#c49a3c'; x.lineWidth = 6; x.strokeRect(W * 0.14, H * 0.09, W * 0.72, H * 0.82);
        x.strokeStyle = '#8f2a2e'; x.lineWidth = 10; x.strokeRect(W * 0.24, H * 0.16, W * 0.52, H * 0.68);
        x.fillStyle = '#c49a3c'; x.beginPath(); x.moveTo(W / 2, H * 0.32); x.lineTo(W * 0.66, H / 2); x.lineTo(W / 2, H * 0.68); x.lineTo(W * 0.34, H / 2); x.closePath(); x.fill();
        x.strokeStyle = '#d8c7a0'; x.lineWidth = 2;
        for (let k = W * 0.1; k < W * 0.9; k += 8) { x.beginPath(); x.moveTo(k, H * 0.04); x.lineTo(k, H * 0.0); x.moveTo(k, H * 0.96); x.lineTo(k, H); x.stroke(); }
        break;
      }
      case 'bones': {
        const bone = (cx, cy, a, l) => {
          x.save(); x.translate(cx, cy); x.rotate(a);
          x.fillStyle = '#e6dcc3'; x.strokeStyle = '#6d6452'; x.lineWidth = 2.5;
          x.beginPath(); x.roundRect(-l / 2, -4, l, 8, 4); x.fill(); x.stroke();
          [-1, 1].forEach(s => [-1, 1].forEach(t => { x.beginPath(); x.arc(s * l / 2, t * 5, 6, 0, Math.PI * 2); x.fill(); x.stroke(); }));
          x.restore();
        };
        bone(W * 0.36, H * 0.38, 0.6, 52); bone(W * 0.62, H * 0.66, -0.9, 44); bone(W * 0.3, H * 0.72, 2.1, 36);
        blob(W * 0.66, H * 0.34, 18, 16, shade(W * 0.66, H * 0.34, 18, '#f1e9d4', '#a89c7f'), '#6d6452');
        blob(W * 0.6, H * 0.32, 4, 5, '#2b241a'); blob(W * 0.72, H * 0.32, 4, 5, '#2b241a');
        break;
      }
      case 'cobweb': {
        x.strokeStyle = 'rgba(235,235,240,0.55)'; x.lineWidth = 1.5;
        for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * W, Math.sin(a) * H); x.stroke(); }
        for (let r = 18; r < W; r += 18) { x.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2, rr = r * (1 - (k % 2) * 0.12); k ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke(); }
        break;
      }
      case 'sack': {
        blob(W / 2, H * 0.56, W * 0.32, H * 0.3, shade(W / 2, H * 0.56, W * 0.34, '#d8c08e', '#8a6d3e'), '#4f3b1d');
        blob(W / 2, H * 0.24, W * 0.12, H * 0.08, '#a88a55', '#4f3b1d');
        x.strokeStyle = '#4f3b1d'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.4, H * 0.3); x.quadraticCurveTo(W / 2, H * 0.36, W * 0.6, H * 0.3); x.stroke();
        break;
      }
      case 'altar': {
        x.fillStyle = '#5c5d63'; x.fillRect(W * 0.08, H * 0.18, W * 0.84, H * 0.64);
        x.fillStyle = '#76777e'; x.fillRect(W * 0.12, H * 0.22, W * 0.76, H * 0.56);
        x.strokeStyle = '#26262b'; x.lineWidth = 5; x.strokeRect(W * 0.08, H * 0.18, W * 0.84, H * 0.64);
        x.fillStyle = '#6d1c22'; x.fillRect(W * 0.38, H * 0.2, W * 0.24, H * 0.6);
        [[0.2, 0.32], [0.8, 0.32], [0.2, 0.68], [0.8, 0.68]].forEach(([a, b]) => { blob(W * a, H * b, 7, 7, '#efe6c8', '#5b5340'); blob(W * a, H * b, 4, 4, '#ffcf5a'); });
        break;
      }
      case 'puddle': {
        x.fillStyle = 'rgba(40,70,90,0.6)';
        x.beginPath(); x.moveTo(W * 0.2, H * 0.5);
        [[0.3, 0.2], [0.6, 0.25], [0.85, 0.45], [0.75, 0.8], [0.4, 0.85], [0.15, 0.7]].forEach(([a, b]) => x.quadraticCurveTo(W * (a - 0.05), H * (b - 0.05), W * a, H * b));
        x.closePath(); x.fill();
        x.strokeStyle = 'rgba(180,210,230,0.35)'; x.lineWidth = 3; x.stroke();
        break;
      }
      case 'cage': {
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(W * 0.08, H * 0.08, W * 0.84, H * 0.84);
        x.strokeStyle = '#2b2b2f'; x.lineWidth = 7;
        x.strokeRect(W * 0.08, H * 0.08, W * 0.84, H * 0.84);
        x.lineWidth = 4;
        for (let k = 1; k < 6; k++) { x.beginPath(); x.moveTo(W * (0.08 + k * 0.14), H * 0.08); x.lineTo(W * (0.08 + k * 0.14), H * 0.92); x.stroke(); }
        x.strokeStyle = '#6d6d74'; x.lineWidth = 2; x.strokeRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8);
        break;
      }
      case 'pot': {
        blob(W / 2, H / 2, W * 0.3, H * 0.3, shade(W / 2, H / 2, W * 0.3, '#c47b45', '#6a3518'), '#3a1b0a');
        blob(W / 2, H / 2, W * 0.17, H * 0.17, '#2a140a', '#8e522a');
        break;
      }
      case 'cauldron': {
        blob(W / 2, H / 2, W * 0.36, H * 0.36, shade(W / 2, H / 2, W * 0.36, '#55565c', '#161618'), '#0b0b0c');
        blob(W / 2, H / 2, W * 0.26, H * 0.26, shade(W / 2, H / 2, W * 0.26, '#a7e26b', '#3c7a1d'));
        blob(W * 0.44, H * 0.44, 7, 6, 'rgba(230,255,200,0.7)'); blob(W * 0.58, H * 0.55, 5, 4, 'rgba(230,255,200,0.6)');
        break;
      }
    }
    return (painted[key] = c);
  }

  // ---- drawing ------------------------------------------------------------------------------
  function stonePattern(ctx, look, S) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.max(8, Math.round(S));
    const x = c.getContext('2d'), n = c.width;
    x.fillStyle = look.wall; x.fillRect(0, 0, n, n);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
      const off = row % 2 ? n / 6 : 0, bw = n / 3, bh = n / 3;
      x.fillStyle = `rgba(${hash(row, col) > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + hash(col, row) * 0.08})`;
      x.fillRect(col * bw + off, row * bh, bw - 1, bh - 1);
      x.strokeStyle = look.wallDark; x.lineWidth = Math.max(1, n / 48);
      x.strokeRect(col * bw + off + 0.5, row * bh + 0.5, bw - 1, bh - 1);
    }
    return ctx.createPattern(c, 'repeat');
  }

  function draw(canvas, d, s, opts, helpers) {
    const S = opts.cell, look = LOOKS[opts.style] || LOOKS.Battlemap, img = helpers.image;
    const { rows, cols, cell, rid } = d;
    canvas.width = cols * S; canvas.height = rows * S;
    const ctx = canvas.getContext('2d'), Wd = canvas.width, Ht = canvas.height;
    const at = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols ? cell[r * cols + c] : 0;
    const open = (r, c) => at(r, c) & F.OPEN;
    const roomOf = (r, c) => { const id = rid[r * cols + c]; return id ? d.rooms[id - 1] : null; };
    const shaped = room => room && room.shape !== 'rect' && room.shape !== 'pillars';
    const purposeOf = room => opts.furniture && opts.furniture.rooms[room.id - 1] ? opts.furniture.rooms[room.id - 1].purpose : '';

    ctx.fillStyle = look.bg; ctx.fillRect(0, 0, Wd, Ht);

    // floor path, same rules as the plain renderer
    const floor = new Path2D();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!open(r, c)) continue;
      const room = roomOf(r, c);
      if (shaped(room) && !room.carved.has(r * cols + c)) continue;
      floor.rect(c * S, r * S, S, S);
    }
    d.rooms.filter(shaped).forEach(room => helpers.shapePath(floor, room, S));

    // textured tiles, two-cell tiles aligned to the even grid with a few odd tiles for variety
    ctx.save(); ctx.clip(floor);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const room = roomOf(r, c);
      if (!open(r, c) && !(shaped(room))) continue;
      const set = d.cave ? FLOORS.dirt : room && WOOD_ROOMS.has(purposeOf(room)) ? FLOORS.wood : FLOORS.stone;
      const v = hash(r, c);
      if (v < 0.06) { const t = img(set.small[Math.floor(hash(c, r, 3) * set.small.length)]); if (t) { ctx.drawImage(t, c * S, r * S, S, S); continue; } }
      const big = img(hash(r >> 1, c >> 1, 7) < 0.04 ? set.alt : set.big);
      if (big) ctx.drawImage(big, (c % 2) * PX, (r % 2) * PX, PX, PX, c * S, r * S, S, S);
    }
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = look.floorTint; ctx.fillRect(0, 0, Wd, Ht);
    ctx.globalCompositeOperation = 'source-over';
    if (opts.grid !== 'None') { ctx.globalAlpha = 0.35; helpers.gridLines(ctx, opts.grid, S, Wd, Ht, '#15151a'); ctx.globalAlpha = 1; }
    ctx.restore();

    // walls: a thick band on the rock side of every floor edge, posts at the corners
    const T = S * 0.4, walls = new Path2D(), posts = [];
    // a one-cell rock seam between two floors becomes one solid wall instead of two thin bands
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (open(r, c) || (shaped(roomOf(r, c)) && at(r, c) & F.ROOM)) continue;
      if ((open(r - 1, c) && open(r + 1, c)) || (open(r, c - 1) && open(r, c + 1))) walls.rect(c * S - 0.5, r * S - 0.5, S + 1, S + 1);
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!open(r, c) || (shaped(roomOf(r, c)) && !roomOf(r, c).carved.has(r * cols + c) && at(r, c) & F.ROOM)) continue;
      const x0 = c * S, y0 = r * S;
      if (!open(r - 1, c)) { walls.rect(x0 - 0.5, y0 - T, S + 1, T); }
      if (!open(r + 1, c)) { walls.rect(x0 - 0.5, y0 + S, S + 1, T); }
      if (!open(r, c - 1)) { walls.rect(x0 - T, y0 - 0.5, T, S + 1); }
      if (!open(r, c + 1)) { walls.rect(x0 + S, y0 - 0.5, T, S + 1); }
      // convex corners get a square post; concave ones are already covered by the two bands
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([dr, dc]) => {
        if (!open(r + dr, c) && !open(r, c + dc)) posts.push([dc < 0 ? x0 - T : x0 + S, dr < 0 ? y0 - T : y0 + S]);
        else if (open(r + dr, c) && open(r, c + dc) && !open(r + dr, c + dc)) posts.push([dc < 0 ? x0 - T : x0 + S, dr < 0 ? y0 - T : y0 + S]);
      });
    }
    posts.forEach(([x, y]) => walls.rect(x, y, T, T));
    const ring = new Path2D(); // walls of round and polygonal rooms follow the shape
    d.rooms.filter(shaped).forEach(room => helpers.shapePath(ring, room, S));

    // soft shadow of the walls onto the floor
    // the walls are drawn far off-canvas so only their shadow lands on the floor
    const OFF = (Wd + Ht) * 2;
    ctx.save(); ctx.clip(floor);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = S * 0.55; ctx.shadowOffsetX = OFF;
    ctx.translate(-OFF, 0);
    ctx.fillStyle = '#000'; ctx.fill(walls);
    ctx.lineWidth = T * 2; ctx.strokeStyle = '#000'; ctx.stroke(ring);
    ctx.restore();

    const pattern = stonePattern(ctx, look, S);
    ctx.save();
    const outside = new Path2D(); outside.rect(0, 0, Wd, Ht); outside.addPath(floor);
    ctx.clip(outside, 'evenodd');
    ctx.lineWidth = T * 2; ctx.strokeStyle = pattern; ctx.stroke(ring);
    ctx.fillStyle = pattern; ctx.fill(walls);
    ctx.strokeStyle = look.wallDark; ctx.lineWidth = Math.max(1.5, S / 24); ctx.stroke(walls);
    ctx.restore();
    // pillar posts in lighter stone
    ctx.fillStyle = look.wallLight; ctx.strokeStyle = look.wallDark; ctx.lineWidth = Math.max(1.5, S / 24);
    posts.forEach(([x, y]) => { ctx.fillRect(x - T * 0.12, y - T * 0.12, T * 1.24, T * 1.24); ctx.strokeRect(x - T * 0.12, y - T * 0.12, T * 1.24, T * 1.24); });

    // exits glow like daylight at the map edge
    d.exits.forEach(e => {
      const g = ctx.createRadialGradient(e.c * S + S / 2, e.r * S + S / 2, 0, e.c * S + S / 2, e.r * S + S / 2, S * 2.2);
      g.addColorStop(0, 'rgba(255,250,210,0.55)'); g.addColorStop(1, 'rgba(255,250,210,0)');
      ctx.save(); ctx.clip(floor); ctx.fillStyle = g; ctx.fillRect(e.c * S - 3 * S, e.r * S - 3 * S, 7 * S, 7 * S); ctx.restore();
    });

    d.stairs.forEach(st => drawStairs(ctx, st, S, look));
    // floor links on stairs when the dungeon has several floors
    if (opts.labels !== false) d.stairs.filter(st => st.label).forEach(st => {
      const x = (st.c + (st.dc + 1) / 2) * S, y = (st.r + (st.dr + 1) / 2) * S;
      ctx.save(); ctx.font = `bold ${Math.round(S * 0.42)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, S / 8); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffe08a'; ctx.lineJoin = 'round';
      ctx.strokeText(st.label, x, y); ctx.fillText(st.label, x, y); ctx.restore();
    });
    d.doors.forEach(door => drawDoor(ctx, playerType(door.type, opts), door.c * S, door.r * S, S, door.vertical, look, pattern, opts.player));

    if (opts.furniture && opts.furniture.rooms.length) helpers.drawFurniture(ctx, opts.furniture, S, { shadow: true });

    // warm light around torches, candles and fires
    ctx.save(); ctx.clip(floor); ctx.globalCompositeOperation = 'lighter';
    (opts.furniture ? opts.furniture.rooms : []).forEach(room => room.pieces.forEach(p => {
      const radius = { torch: 2.6, campfire: 3.2, candle: 1.2 }[p.kind];
      if (!radius) return;
      const cx = (p.c + p.w / 2) * S, cy = (p.r + p.h / 2) * S;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * S);
      g.addColorStop(0, 'rgba(255,170,70,0.38)'); g.addColorStop(0.5, 'rgba(255,120,40,0.12)'); g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - radius * S, cy - radius * S, radius * 2 * S, radius * 2 * S);
    }));
    ctx.restore();

    // room numbers and corridor letters, light on dark so they read on stone
    if (opts.labels !== false && !opts.player) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.font = `bold ${Math.round(S * 0.5)}px "Palatino Linotype", Palatino, Georgia, serif`;
      ctx.lineWidth = Math.max(3, S / 8); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#f3ead7';
      d.rooms.forEach(room => { const x = (room.c1 + room.c2 + 1) / 2 * S, y = (room.r1 + room.r2 + 1) / 2 * S; ctx.strokeText(room.id, x, y); ctx.fillText(room.id, x, y); });
      ctx.font = `italic ${Math.round(S * 0.42)}px "Palatino Linotype", Palatino, Georgia, serif`;
      s.corridorFeatures.forEach(f => { const p = d.features.find(q => q.letter === f.letter); ctx.strokeText(f.letter, p.c * S + S / 2, p.r * S + S / 2); ctx.fillText(f.letter, p.c * S + S / 2, p.r * S + S / 2); });
    }
  }

  // doors across the passage, drawn as if the passage runs north-south
  // what players may see: a trapped door looks like any door, a secret one like wall
  const playerType = (type, opts) => !opts.player ? type : type === 'trapped' ? 'door' : type;
  function drawDoor(ctx, type, x, y, S, vertical, look, pattern, player) {
    ctx.save();
    ctx.translate(x + S / 2, y + S / 2);
    if (!vertical) ctx.rotate(Math.PI / 2);
    const u = S / 16;
    if (type === 'secret') { // looks like wall; a faint mark for the GM
      ctx.fillStyle = pattern || look.wall; ctx.fillRect(-8 * u, -3 * u, 16 * u, 6 * u);
      ctx.strokeStyle = look.wallDark; ctx.lineWidth = Math.max(1.5, S / 24); ctx.strokeRect(-8 * u, -3 * u, 16 * u, 6 * u);
      if (player) { ctx.restore(); return; }
      ctx.fillStyle = 'rgba(255,240,200,0.55)'; ctx.font = `bold ${Math.round(S * 0.32)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('S', 0, 0.5);
      ctx.restore(); return;
    }
    // stone jambs on both sides
    ctx.fillStyle = look.wallLight; ctx.strokeStyle = look.wallDark; ctx.lineWidth = Math.max(1, S / 28);
    [-1, 1].forEach(sd => { ctx.fillRect(sd * 8 * u - (sd > 0 ? 2.6 * u : 0), -3 * u, 2.6 * u, 6 * u); ctx.strokeRect(sd * 8 * u - (sd > 0 ? 2.6 * u : 0), -3 * u, 2.6 * u, 6 * u); });
    if (type === 'portcullis') {
      ctx.strokeStyle = '#2a2a2e'; ctx.lineWidth = Math.max(1.5, u * 1.1);
      ctx.beginPath(); ctx.moveTo(-5.4 * u, 0); ctx.lineTo(5.4 * u, 0); ctx.stroke();
      ctx.fillStyle = '#5d5e66';
      for (let k = -4.5; k <= 4.5; k += 1.8) ctx.fillRect(k * u - 0.6 * u, -1.6 * u, 1.2 * u, 3.2 * u);
    } else if (type !== 'arch') {
      const w = 10.8 * u, h = 3.6 * u;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = u * 2; ctx.shadowOffsetY = u * 0.8;
      ctx.fillStyle = '#6e4325'; ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#3a200e'; ctx.lineWidth = Math.max(1, u * 0.5);
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + k * w / 4, -h / 2); ctx.lineTo(-w / 2 + k * w / 4, h / 2); ctx.stroke(); }
      ctx.lineWidth = Math.max(1, u * 0.7); ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillStyle = '#2e2e33'; ctx.fillRect(-w / 2, -h / 2 + h * 0.15, w, h * 0.16); ctx.fillRect(-w / 2, h / 2 - h * 0.31, w, h * 0.16);
      if (type === 'locked') { ctx.fillStyle = '#d8b04a'; ctx.beginPath(); ctx.arc(w * 0.3, 0, u * 0.8, 0, Math.PI * 2); ctx.fill(); }
      if (type === 'trapped') { ctx.fillStyle = 'rgba(200,30,30,0.85)'; ctx.beginPath(); ctx.moveTo(0, -h * 0.9); ctx.lineTo(u * 1.1, -h * 0.55); ctx.lineTo(-u * 1.1, -h * 0.55); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  }

  // stone steps across two cells, darker toward the lower end
  function drawStairs(ctx, st, S, look) {
    const x0 = Math.min(st.c, st.c + st.dc) * S, y0 = Math.min(st.r, st.r + st.dr) * S, vertical = !!st.dr, n = 8;
    const w = vertical ? S : 2 * S, h = vertical ? 2 * S : S;
    ctx.save();
    ctx.fillStyle = look.wallDark; ctx.fillRect(x0, y0, w, h);
    for (let k = 0; k < n; k++) {
      // step k counted from the dead end; descending stairs get darker toward the end
      const fromEnd = k / (n - 1), shade = st.down ? 0.25 + 0.6 * fromEnd : 0.85 - 0.3 * fromEnd;
      const pos = (st.dr || st.dc) > 0 ? n - 1 - k : k;
      const l = Math.round(70 + 90 * shade);
      ctx.fillStyle = `rgb(${l},${l},${l + 6})`;
      if (vertical) ctx.fillRect(x0 + S * 0.08, y0 + pos * h / n + 1, S * 0.84, h / n - 2);
      else ctx.fillRect(x0 + pos * w / n + 1, y0 + S * 0.08, w / n - 2, S * 0.84);
    }
    ctx.strokeStyle = look.wallDark; ctx.lineWidth = Math.max(1, S / 24); ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    ctx.restore();
  }

  root.DungeonBattlemap = { draw, drawDoor, drawStairs, paintSprite, FILES, LOOKS };
})(globalThis);
