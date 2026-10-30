// Draws a generated dungeon on a canvas in donjon's map styles, plus the map key.
(function (root) {
  const F = root.Dungeon.FLAGS;
  // rock: background, floor: room/corridor fill, grid: lines on floors, wall: outline (null = none),
  // ink: labels and icons, texture: procedural pattern on the rock, gridAll: grid also over rock
  const STYLES = {
    Battlemap: { battlemap: true, rock: '#0b0b0d', floor: '#77777d', grid: '#15151a', wall: '#45464c', ink: '#111' },
    'Battlemap Sandstone': { battlemap: true, rock: '#0d0a07', floor: '#a88a63', grid: '#2a1f14', wall: '#6d5741', ink: '#1a120a' },
    'Battlemap Basalt': { battlemap: true, rock: '#060607', floor: '#4b4d54', grid: '#101113', wall: '#2f3136', ink: '#0a0a0b' },
    Standard: { rock: '#000', floor: '#fff', grid: '#bbb', wall: null, ink: '#000' },
    Classic: { rock: '#3d85c6', floor: '#fff', grid: '#3d85c6', wall: null, ink: '#000', gridAll: '#8fbbe3' },
    Crosshatch: { rock: '#fff', floor: '#fff', grid: '#ccc', wall: '#000', ink: '#000', texture: 'hatch' },
    GraphPaper: { rock: '#fff', floor: '#fff', grid: '#9fc5e8', wall: '#000', ink: '#000', gridAll: '#cfe2f3' },
    Parchment: { rock: '#d9bf8c', floor: '#f4e7c8', grid: '#c9a96e', wall: '#5b4325', ink: '#3b2a14', texture: 'noise' },
    Marble: { rock: '#8c8c8c', floor: '#f4f4f4', grid: '#c4c4c4', wall: '#333', ink: '#222', texture: 'veins' },
    Sandstone: { rock: '#c9a874', floor: '#f0dfbd', grid: '#c4a272', wall: '#6b4e2a', ink: '#4a3218', texture: 'noise' },
    Slate: { rock: '#3f474f', floor: '#e3e6e9', grid: '#a3abb3', wall: '#15191d', ink: '#15191d', texture: 'noise' },
    Aquatic: { rock: '#2d6b70', floor: '#d3ecea', grid: '#86bdb8', wall: '#0e3436', ink: '#0e3436', texture: 'veins' },
    Infernal: { rock: '#6e1a08', floor: '#f3c9a1', grid: '#c98652', wall: '#2e0700', ink: '#2e0700', texture: 'lava' },
    Glacial: { rock: '#9fc2e6', floor: '#f2f8ff', grid: '#b3cde6', wall: '#2a4a6a', ink: '#1d3550', texture: 'veins' },
    Wooden: { rock: '#5e3f22', floor: '#d2aa72', grid: '#9a7040', wall: '#2a190a', ink: '#2a190a', texture: 'wood' },
    Asylum: { rock: '#d6d6d6', floor: '#fff', grid: '#d6d6d6', wall: '#666', ink: '#444', texture: 'noise' },
    Steampunk: { rock: '#4f3d29', floor: '#dcb781', grid: '#a7814c', wall: '#22170b', ink: '#22170b', texture: 'noise' },
    Gamma: { rock: '#37443a', floor: '#cddcbf', grid: '#8fa57e', wall: '#152015', ink: '#152015', texture: 'noise' },
  };

  function texture(ctx, style, w, h) {
    let s = 12345;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = style.rock; ctx.fillRect(0, 0, w, h);
    if (style.texture === 'hatch') {
      ctx.strokeStyle = '#999'; ctx.lineWidth = 0.7;
      for (let x = -h; x < w; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + h, h); ctx.stroke(); }
      for (let x = 0; x < w + h; x += 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - h, h); ctx.stroke(); }
    } else if (style.texture === 'wood') {
      for (let y = 0; y < h; y += 3) { ctx.fillStyle = `rgba(0,0,0,${r() * 0.18})`; ctx.fillRect(0, y, w, 1 + r() * 2); }
    } else if (style.texture) {
      const n = w * h / 40;
      for (let i = 0; i < n; i++) {
        const light = r() < 0.5;
        ctx.fillStyle = light ? `rgba(255,255,255,${r() * 0.12})` : `rgba(0,0,0,${r() * 0.15})`;
        ctx.fillRect(r() * w, r() * h, 1 + r() * 4, 1 + r() * 4);
      }
      if (style.texture === 'veins' || style.texture === 'lava') {
        ctx.strokeStyle = style.texture === 'lava' ? 'rgba(255,140,0,0.45)' : 'rgba(255,255,255,0.35)';
        for (let i = 0; i < w * h / 9000; i++) {
          ctx.lineWidth = 0.5 + r() * 1.5; ctx.beginPath();
          let x = r() * w, y = r() * h; ctx.moveTo(x, y);
          for (let k = 0; k < 12; k++) { x += (r() - 0.5) * 60; y += (r() - 0.3) * 40; ctx.lineTo(x, y); }
          ctx.stroke();
        }
      }
    }
  }

  function shapePath(path, room, S) {
    const x = room.c1 * S, y = room.r1 * S, w = (room.c2 - room.c1 + 1) * S, h = (room.r2 - room.r1 + 1) * S, cx = x + w / 2, cy = y + h / 2, R = h / 2;
    if (room.shape === 'circle') { path.moveTo(cx + R, cy); path.arc(cx, cy, R, 0, Math.PI * 2); return; }
    let pts;
    if (room.shape === 'octagon') { const k = R * 0.45; pts = [[-k, -R], [k, -R], [R, -k], [R, k], [k, R], [-k, R], [-R, k], [-R, -k]]; }
    else { const k = R * 0.5; pts = [[0, -R], [R, -k], [R, k], [0, R], [-R, k], [-R, -k]]; }
    pts.forEach(([px, py], i) => path[i ? 'lineTo' : 'moveTo'](cx + px, cy + py));
    path.closePath();
  }

  function draw(canvas, d, s, opts) {
    const S = opts.cell || 16, style = STYLES[opts.style] || STYLES.Standard;
    if (style.battlemap) return root.DungeonBattlemap.draw(canvas, d, s, { ...opts, cell: S }, { image: f => loaded[f], shapePath, gridLines, drawFurniture });
    const { rows, cols, cell, rid } = d;
    canvas.width = cols * S + 1; canvas.height = rows * S + 1;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const at = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols ? cell[r * cols + c] : 0;
    const open = (r, c) => at(r, c) & F.OPEN;
    const shaped = room => room && room.shape !== 'rect' && room.shape !== 'pillars';
    const roomOf = (r, c) => { const id = rid[r * cols + c]; return id ? d.rooms[id - 1] : null; };

    texture(ctx, style, W, H);
    if (style.gridAll) gridLines(ctx, opts.grid, S, W, H, style.gridAll);

    // the floor as one path: grid squares plus smooth shapes for polymorphed rooms
    const floor = new Path2D();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (!open(r, c)) continue;
      const room = roomOf(r, c);
      if (shaped(room) && !room.carved.has(r * cols + c)) continue;
      floor.rect(c * S, r * S, S, S);
    }
    d.rooms.filter(shaped).forEach(room => shapePath(floor, room, S));
    ctx.fillStyle = style.floor; ctx.fill(floor);
    ctx.save(); ctx.clip(floor); gridLines(ctx, opts.grid, S, W, H, style.grid); ctx.restore();

    if (style.wall) { // outline every floor edge that touches rock
      ctx.strokeStyle = style.wall; ctx.lineWidth = Math.max(2, S / 8); ctx.beginPath();
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        if (!open(r, c) || (shaped(roomOf(r, c)) && !roomOf(r, c).carved.has(r * cols + c))) continue;
        const x = c * S, y = r * S;
        if (!open(r - 1, c)) { ctx.moveTo(x, y); ctx.lineTo(x + S, y); }
        if (!open(r + 1, c)) { ctx.moveTo(x, y + S); ctx.lineTo(x + S, y + S); }
        if (!open(r, c - 1)) { ctx.moveTo(x, y); ctx.lineTo(x, y + S); }
        if (!open(r, c + 1)) { ctx.moveTo(x + S, y); ctx.lineTo(x + S, y + S); }
      }
      ctx.stroke();
      d.rooms.filter(shaped).forEach(room => { const p = new Path2D(); shapePath(p, room, S); ctx.stroke(p); });
    }

    if (opts.furniture && opts.furniture.rooms.length) drawFurniture(ctx, opts.furniture, S, style);

    ctx.fillStyle = style.ink; ctx.strokeStyle = style.ink;
    d.doors.forEach(door => {
      if (opts.player && door.type === 'secret') { ctx.fillStyle = style.rock; ctx.fillRect(door.c * S, door.r * S, S, S); ctx.fillStyle = style.ink; return; }
      drawDoor(ctx, opts.player && door.type === 'trapped' ? 'door' : door.type, door.c * S, door.r * S, S, door.vertical, style);
    });
    d.stairs.forEach(st => drawStairs(ctx, st, S, style));
    // floor links on stairs when the dungeon has several floors
    if (opts.labels !== false) d.stairs.filter(st => st.label).forEach(st => {
      const x = (st.c + (st.dc + 1) / 2) * S, y = (st.r + (st.dr + 1) / 2) * S;
      ctx.save(); ctx.font = `bold ${Math.round(S * 0.42)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, S / 8); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = '#ffe08a'; ctx.lineJoin = 'round';
      ctx.strokeText(st.label, x, y); ctx.fillText(st.label, x, y); ctx.restore();
    });

    // room numbers and corridor letters, haloed so they read over furniture
    ctx.fillStyle = style.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(S * 0.85)}px "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif`;
    ctx.lineWidth = Math.max(3, S / 6); ctx.strokeStyle = style.floor; ctx.lineJoin = 'round';
    if (opts.labels !== false && !opts.player) d.rooms.forEach(room => {
      const label = String(room.id).split('').join(' '), x = (room.c1 + room.c2 + 1) / 2 * S, y = (room.r1 + room.r2 + 1) / 2 * S + 1;
      if (opts.furniture && opts.furniture.rooms.length) ctx.strokeText(label, x, y);
      ctx.fillText(label, x, y);
    });
    ctx.font = `${Math.round(S * 0.75)}px "Palatino Linotype", Palatino, Georgia, serif`;
    if (opts.labels !== false && !opts.player) s.corridorFeatures.forEach(f => {
      const spot = d.features.find(p => p.letter === f.letter);
      ctx.fillText(f.letter, spot.c * S + S / 2, spot.r * S + S / 2);
    });
  }

  // furniture sprites come from assets.js as data URLs; load them once per art set
  const loaded = {}, pending = {};
  function loadArt(key) {
    const set = root.DungeonFurnish.ART[key];
    const files = new Set([...(set.sheet ? [set.sheet] : []), ...(root.DungeonBattlemap ? root.DungeonBattlemap.FILES : [])]);
    Object.values(set.kinds).forEach(list => list.forEach(s => s.file && files.add(s.file)));
    return Promise.all([...files].map(f => pending[f] || (pending[f] = new Promise(res => {
      const img = new Image();
      img.onload = () => { loaded[f] = img; res(img); };
      img.onerror = () => res(null);
      img.src = (root.DungeonAssets || {})[f] || 'assets/' + f;
    }))));
  }
  const tinted = {};
  function tintSheet(img, color) {
    const key = img.src.length + color;
    if (tinted[key]) return tinted[key];
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return (tinted[key] = c);
  }
  function drawFurniture(ctx, furniture, S, style) {
    const set = root.DungeonFurnish.ART[furniture.artKey];
    ctx.save();
    if (style.shadow || set.shadow) { // painted props cast a soft shadow onto the floor
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = S * 0.14; ctx.shadowOffsetX = S * 0.05; ctx.shadowOffsetY = S * 0.08;
    } else ctx.globalCompositeOperation = 'multiply'; // white paint takes the floor colour of every map style
    ctx.imageSmoothingEnabled = !set.sheet;
    furniture.rooms.forEach(room => room.pieces.forEach(p => {
      let img = p.sprite.paint ? root.DungeonBattlemap.paintSprite(p.sprite.paint, p.sprite.w, p.sprite.h) : loaded[p.sprite.file || set.sheet];
      if (!img) return;
      if (set.tint) img = tintSheet(img, style.ink || '#222');
      ctx.save();
      ctx.translate((p.c + p.w / 2) * S, (p.r + p.h / 2) * S);
      ctx.rotate(p.rot * Math.PI / 180);
      const w = p.sprite.w * S, h = p.sprite.h * S;
      if (set.sheet) {
        const ts = set.tileSize, k = 0.8; // pixel icons sit inside the square with a margin
        ctx.drawImage(img, (p.sprite.tile % set.sheetCols) * ts, Math.floor(p.sprite.tile / set.sheetCols) * ts, ts, ts, -w * k / 2, -h * k / 2, w * k, h * k);
      } else for (let k = 0; k < (set.passes || 1); k++) ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }));
    ctx.restore();
  }

  function gridLines(ctx, type, S, W, H, color) {
    if (type === 'None') return;
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    if (type === 'Hex' || type === 'VertHex') {
      const R = S / Math.sqrt(3), vert = type === 'VertHex';
      const [stepA, stepB] = vert ? [S, R * 1.5] : [R * 1.5, S];
      for (let a = 0, i = 0; a < (vert ? H : W) + S; a += stepB, i++) for (let b = (i % 2) * stepA / 2; b < (vert ? W : H) + S; b += stepA) {
        const [cx, cy] = vert ? [b, a] : [a, b];
        for (let k = 0; k < 6; k++) {
          const t0 = Math.PI / 3 * k + (vert ? Math.PI / 6 : 0), t1 = t0 + Math.PI / 3;
          ctx.moveTo(cx + R * Math.cos(t0), cy + R * Math.sin(t0)); ctx.lineTo(cx + R * Math.cos(t1), cy + R * Math.sin(t1));
        }
      }
    } else {
      for (let x = 0.5; x <= W; x += S) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0.5; y <= H; y += S) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    }
    ctx.stroke();
  }

  // door icons follow donjon's key: archway, portcullis, door, locked, trapped, secret
  function drawDoor(ctx, type, x, y, S, vertical, style) {
    ctx.save();
    ctx.translate(x + S / 2, y + S / 2);
    if (!vertical) ctx.rotate(Math.PI / 2); // draw as if the passage runs north-south
    const u = S / 16;
    ctx.fillStyle = style.ink; ctx.strokeStyle = style.ink; ctx.lineWidth = Math.max(1, u * 1.2);
    if (type === 'secret') {
      ctx.fillStyle = style.ink;
      ctx.font = `bold ${Math.round(S * 0.8)}px "Palatino Linotype", Palatino, Georgia, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (!vertical) ctx.rotate(-Math.PI / 2);
      ctx.fillText('s', 0, 0);
      ctx.restore();
      return;
    }
    ctx.fillRect(-8 * u, -2 * u, 2 * u, 4 * u); ctx.fillRect(6 * u, -2 * u, 2 * u, 4 * u); // jambs
    if (type === 'portcullis') {
      for (let k = -5; k <= 5; k += 2.5) ctx.fillRect(k * u - u * 0.6, -u * 0.6, u * 1.2, u * 1.2);
    } else if (type !== 'arch') {
      ctx.fillStyle = style.floor;
      ctx.fillRect(-5 * u, -3.5 * u, 10 * u, 7 * u);
      ctx.strokeRect(-5 * u, -3.5 * u, 10 * u, 7 * u);
      ctx.fillStyle = style.ink;
      if (type === 'locked') ctx.fillRect(-3 * u, -1 * u, 6 * u, 2 * u);
      if (type === 'trapped') { ctx.beginPath(); ctx.moveTo(-5 * u, 0); ctx.lineTo(5 * u, 0); ctx.moveTo(0, -3.5 * u); ctx.lineTo(0, 3.5 * u); ctx.stroke(); }
      if (type === 'door') ctx.strokeRect(-3 * u, -1.5 * u, 6 * u, 3 * u);
    }
    ctx.restore();
  }

  // stairs span the dead-end cell and the one before it; descending treads narrow toward the end
  function drawStairs(ctx, st, S, style) {
    const x0 = Math.min(st.c, st.c + st.dc) * S, y0 = Math.min(st.r, st.r + st.dr) * S;
    const along = st.dr ? 'y' : 'x', len = 2 * S, n = 9;
    ctx.save();
    ctx.fillStyle = style.floor; ctx.fillRect(x0, y0, st.dr ? S : len, st.dr ? len : S);
    ctx.strokeStyle = style.ink; ctx.lineWidth = Math.max(1, S / 16); ctx.beginPath();
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n * len;
      // distance from the dead end decides tread width when descending
      const fromEnd = (st.dr || st.dc) > 0 ? t : len - t;
      const half = st.down ? S * 0.45 * Math.min(1, 0.15 + fromEnd / len) : S * 0.42;
      if (along === 'y') { ctx.moveTo(x0 + S / 2 - half, y0 + t); ctx.lineTo(x0 + S / 2 + half, y0 + t); }
      else { ctx.moveTo(x0 + t, y0 + S / 2 - half); ctx.lineTo(x0 + t, y0 + S / 2 + half); }
    }
    ctx.stroke(); ctx.restore();
  }

  function drawKey(canvas, styleName) {
    const style = STYLES[styleName] || STYLES.Standard, S = 24;
    const bm = style.battlemap && root.DungeonBattlemap, look = bm && bm.LOOKS[styleName];
    const items = [['arch', 'Archway'], ['portcullis', 'Portcullis'], ['door', 'Door'], ['locked', 'Locked'], ['trapped', 'Trapped'], ['secret', 'Secret'], ['up', 'Up'], ['down', 'Down']];
    const ctx = canvas.getContext('2d');
    ctx.font = '14px system-ui, sans-serif';
    const widths = items.map(([, l]) => ctx.measureText(l).width);
    canvas.width = items.reduce((s, it, i) => s + (it[0] === 'up' || it[0] === 'down' ? 2 * S : S) + widths[i] + 22, 0); canvas.height = S + 8;
    const c2 = canvas.getContext('2d');
    c2.fillStyle = style.floor; c2.fillRect(0, 0, canvas.width, canvas.height);
    c2.font = '14px system-ui, sans-serif'; c2.textBaseline = 'middle';
    let x = 4;
    items.forEach(([type, label], i) => {
      c2.save(); c2.translate(x, 4);
      if (type === 'up' || type === 'down') (bm ? bm.drawStairs : drawStairs)(c2, { r: 0, c: 1, dr: 0, dc: -1, down: type === 'down' }, S, bm ? look : style);
      else {
        c2.fillStyle = style.rock; c2.fillRect(0, 0, S, S); c2.fillStyle = style.floor; c2.fillRect(S * 0.25, 0, S * 0.5, S);
        if (bm) bm.drawDoor(c2, type, 0, 0, S, true, look); else drawDoor(c2, type, 0, 0, S, true, style);
      }
      c2.restore();
      x += (type === 'up' || type === 'down' ? 2 * S : S) + 4;
      c2.fillStyle = '#222'; c2.fillText(label, x, S / 2 + 4);
      x += widths[i] + 18;
    });
  }

  root.DungeonRender = { draw, drawKey, loadArt, STYLES };
})(globalThis);
