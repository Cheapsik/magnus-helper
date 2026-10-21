// Dungeon map generator modelled on donjon's d20 dungeon (https://donjon.bin.sh/d20/dungeon/).
// donjon builds its maps server-side, so this reimplements the observed output: map sizes and room
// density were measured against construct.cgi, everything else follows the published previews.
(function (root) {
  const BLOCKED = 1, ROOM = 2, CORRIDOR = 4, PERIMETER = 8, DOOR = 16, EXIT = 32, STAIRS = 64, CAVE = 128;
  const OPEN = ROOM | CORRIDOR | DOOR | EXIT | STAIRS | CAVE;
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  const SIDE = ['north', 'south', 'west', 'east'];

  const DUNGEON_SIZE = { Fine: 23, Diminutive: 29, Tiny: 35, Small: 39, Medium: 51, Large: 63, Huge: 73, Gargantuan: 91, Colossal: 115 };
  const ROOM_UNITS = { Small: [2, 3], Medium: [2, 4], Large: [2, 5], Huge: [2, 6], Gargantuan: [3, 7], Colossal: [3, 8] }; // cells = 2u - 1
  const STRAIGHT = { Labyrinth: 0, Errant: 0.5, Straight: 0.9 };
  const DEADENDS = { '': 0, Some: 0.5, All: 1 };
  const POLYMORPH = { '': [0, 0], Yes: [0.5, 0.1], Many: [0.9, 0.35] }; // chance of a shaped room: [central complex, other rooms]
  const SHAPES = ['circle', 'octagon', 'hexagon', 'pillars'];
  const DOOR_SET = {
    None: { arch: 1 },
    Basic: { arch: 30, door: 70 },
    Secure: { arch: 10, door: 35, locked: 35, trapped: 10, portcullis: 10 },
    Standard: { arch: 15, door: 50, locked: 12, trapped: 10, secret: 8, portcullis: 5 },
    Deathtrap: { arch: 5, door: 25, locked: 20, trapped: 30, secret: 15, portcullis: 5 },
  };
  const grid = g => (x, y) => g[Math.floor((y + 1) / 2 * g.length)][Math.floor((x + 1) / 2 * g[0].length)];
  const MASK = {
    Box: grid([[1, 1, 1], [1, 0, 1], [1, 1, 1]]),
    Cross: grid([[0, 1, 0], [1, 1, 1], [0, 1, 0]]),
    Dagger: grid([[0, 1, 0], [1, 1, 1], [0, 1, 0], [0, 1, 0]]),
    Keep: grid([[1, 1, 0, 0, 1, 1], [1, 1, 1, 1, 1, 1], [0, 1, 1, 1, 1, 0], [0, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1], [1, 1, 0, 0, 1, 1]]),
    Saltire: (x, y) => Math.abs(Math.abs(x) - Math.abs(y)) < 0.45,
    Hexagon: (x, y) => Math.abs(x) <= 0.9 && Math.abs(y) <= 1 - Math.abs(x) * 0.55,
    Round: (x, y) => x * x + y * y <= 1,
  };

  function mulberry32(a) {
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // donjon's sizes round half to even (65 rows for 51 columns)
  const roundEven = x => { const f = Math.floor(x); return x - f === 0.5 ? (f % 2 ? f + 1 : f) : Math.round(x); };

  function dimensions(o) {
    if (o.dungeon_size === 'Custom') {
      const odd = n => Math.max(11, Math.min(301, (n | 0) % 2 ? n | 0 : (n | 0) - 1));
      return [odd(+o.map_cols || 51), odd(+o.map_rows || 51)];
    }
    const cols = DUNGEON_SIZE[o.dungeon_size] || 51;
    const tall = o.dungeon_layout === 'Rectangle' || o.dungeon_layout === 'Dagger';
    return [cols, tall ? 2 * roundEven((cols - 1) / 2 * 1.3) + 1 : cols];
  }

  function generate(o) {
    const rnd = mulberry32(Number(o.seed) >>> 0);
    const rand = n => Math.floor(rnd() * n);
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const pick = a => a[rand(a.length)];

    const [cols, rows] = dimensions(o);
    const cell = new Uint8Array(rows * cols), rid = new Int16Array(rows * cols);
    const idx = (r, c) => r * cols + c;
    const inb = (r, c) => r >= 0 && c >= 0 && r < rows && c < cols;
    let rooms = [];
    const doors = new Map(); // cell index -> door
    function openCount(r, c) { return [0, 1, 2, 3].filter(d => inb(r + DR[d], c + DC[d]) && cell[idx(r + DR[d], c + DC[d])] & OPEN).length; }

    if (o.dungeon_layout === 'Cavernous') return caves();

    const mask = MASK[o.dungeon_layout];
    if (mask) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
      if (!mask((2 * c + 1) / cols - 1, (2 * r + 1) / rows - 1)) cell[idx(r, c)] |= BLOCKED;

    // ---- rooms -------------------------------------------------------------------------------
    const [umin, umax] = ROOM_UNITS[o.room_size] || ROOM_UNITS.Medium;
    const [polyComplex, polyRoom] = POLYMORPH[o.room_polymorph || ''];
    const sym = o.room_layout === 'Symmetric';

    function fits(r1, c1, h, w) {
      const r2 = r1 + h - 1, c2 = c1 + w - 1;
      if (r1 < 1 || c1 < 1 || r2 > rows - 2 || c2 > cols - 2) return false;
      for (let r = r1 - 1; r <= r2 + 1; r++) for (let c = c1 - 1; c <= c2 + 1; c++) {
        const i = idx(r, c);
        if (rid[i] || (r >= r1 && r <= r2 && c >= c1 && c <= c2 && cell[i] & (BLOCKED | PERIMETER))) return false;
      }
      return true;
    }
    function inShape(shape, r, c, room) {
      const h = room.r2 - room.r1 + 1, R = h / 2;
      const dy = r - (room.r1 + room.r2) / 2, dx = c - (room.c1 + room.c2) / 2;
      switch (shape) {
        case 'circle': return dx * dx + dy * dy <= R * R - 0.5;
        case 'octagon': return Math.abs(dx) + Math.abs(dy) <= R * 1.45;
        case 'hexagon': return Math.abs(dy) <= R - Math.abs(dx) * 0.5 + 0.25;
        case 'pillars': return h < 7 || Math.abs(dx) > (room.c2 - room.c1) / 2 - 2 || Math.abs(dy) > (room.r2 - room.r1) / 2 - 2;
        default: return true;
      }
    }
    function place(r1, c1, h, w, shape, complex) {
      const room = { id: rooms.length + 1, r1, c1, r2: r1 + h - 1, c2: c1 + w - 1, shape, complex: !!complex, doors: [], carved: new Set() };
      for (let r = r1 - 1; r <= room.r2 + 1; r++) for (let c = c1 - 1; c <= room.c2 + 1; c++) {
        const i = idx(r, c);
        if (r >= r1 && r <= room.r2 && c >= c1 && c <= room.c2) { rid[i] = room.id; if (inShape(shape, r, c, room)) cell[i] |= ROOM; }
        else cell[i] |= PERIMETER;
      }
      rooms.push(room);
      return room;
    }
    const roomShape = complex => rnd() < (complex ? polyComplex : polyRoom) ? pick(SHAPES) : 'rect';
    const units = () => umin + rand(umax - umin + 1);
    const mirrorC = (c1, w) => cols - c1 - w;
    // place a room and, for symmetric layouts, its mirror image (or keep it centred on the axis)
    function placeSym(r1, c1, h, w, shape, complex) {
      if (!sym) return fits(r1, c1, h, w) ? [place(r1, c1, h, w, shape, complex)] : null;
      const cm = mirrorC(c1, w);
      if (cm === c1) return fits(r1, c1, h, w) ? [place(r1, c1, h, w, shape, complex)] : null;
      if (cm - 1 < c1 + w || !fits(r1, c1, h, w) || !fits(r1, cm, h, w)) return null;
      return [place(r1, c1, h, w, shape, complex), place(r1, cm, h, w, shape, complex)];
    }

    // the central complex: a grid of rooms sharing walls, a hub with satellites, or one great hall
    const links = [];
    (function complex() {
      const shape = roomShape(true), kind = rnd();
      const centre = (span, size, jitter) => {
        let p = Math.floor((span - size) / 2) + (sym ? 0 : rand(2 * jitter + 1) - jitter);
        if (p % 2 === 0) p += sym ? -1 : 1;
        return p;
      };
      for (let tries = 0; tries < 6; tries++) {
        if (kind < 0.3 || shape !== 'rect' && kind < 0.5) { // hub with two satellites per side
          const s = 2 * Math.max(umin, umax - 1) - 1, hub = 2 * s + 1, total = hub + 2 * (s + 1);
          const r0 = centre(rows, total, rows >> 3), c0 = centre(cols, total, cols >> 3);
          const hr = r0 + s + 1, hc = c0 + s + 1;
          const spots = [[r0, hc], [r0, hc + s + 1], [hr, c0], [hr + s + 1, c0], [hr, hc + hub + 1], [hr + s + 1, hc + hub + 1], [hr + hub + 1, hc], [hr + hub + 1, hc + s + 1]];
          if (!fits(hr, hc, hub, hub) || spots.some(([r, c]) => !fits(r, c, s, s))) continue;
          const h = place(hr, hc, hub, hub, shape, true);
          spots.forEach(([r, c], k) => {
            const sat = place(r, c, s, s, shape, true);
            if (rnd() < 0.75) links.push([h, sat]);
            if (k % 2 && rnd() < 0.3) links.push([rooms[rooms.length - 2], sat]);
          });
          return;
        }
        if (kind < 0.85) { // grid of equal rooms
          const a = 1 + rand(3), b = 1 + rand(3);
          if (a * b === 1) continue;
          const u = shape === 'rect' ? units() : umax, s = 2 * Math.max(u, umin + 1) - 1;
          const r0 = centre(rows, b * (s + 1) - 1, rows >> 3), c0 = centre(cols, a * (s + 1) - 1, cols >> 3);
          const cellsOk = [];
          for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) cellsOk.push(fits(r0 + y * (s + 1), c0 + x * (s + 1), s, s));
          if (cellsOk.includes(false)) continue;
          const g = [];
          for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) g.push(place(r0 + y * (s + 1), c0 + x * (s + 1), s, s, shape, true));
          // spanning tree over the grid, plus a few extra links
          const seen = new Set([0]), edges = [];
          for (let y = 0; y < b; y++) for (let x = 0; x < a; x++) {
            if (x + 1 < a) edges.push([y * a + x, y * a + x + 1]);
            if (y + 1 < b) edges.push([y * a + x, (y + 1) * a + x]);
          }
          shuffle(edges);
          while (seen.size < g.length) {
            const e = edges.find(([p, q]) => seen.has(p) !== seen.has(q));
            links.push([g[e[0]], g[e[1]]]); seen.add(e[0]); seen.add(e[1]);
            edges.splice(edges.indexOf(e), 1);
          }
          edges.forEach(([p, q]) => { if (rnd() < 0.35) links.push([g[p], g[q]]); });
          return;
        }
        // one great hall
        const hu = Math.round(umax * (1.4 + rnd() * 0.6)), wu = Math.round(umax * (1.4 + rnd() * 0.8));
        const h = 2 * hu - 1, w = shape === 'rect' ? 2 * wu - 1 : h;
        const r0 = centre(rows, h, rows >> 3), c0 = centre(cols, w, cols >> 3);
        if (fits(r0, c0, h, w)) { place(r0, c0, h, w, shape, true); return; }
      }
    })();

    // the rest of the rooms
    const maxCells = 2 * umax - 1;
    const attempts = Math.floor(rows * cols / (maxCells * maxCells));
    const randomOdd = (span, size) => span - size < 2 ? -1 : rand((span - size) / 2) * 2 + 1;
    if (o.room_layout === 'Dense') {
      for (let r = 1; r < rows - 1; r += 2) for (let c = 1; c < cols - 1; c += 2) {
        if (rid[idx(r, c)] || cell[idx(r, c)] & BLOCKED) continue;
        for (let t = 0; t < 4; t++) {
          const shape = roomShape(false);
          let h = 2 * units() - 1, w = shape === 'rect' ? 2 * units() - 1 : h;
          if (t === 3) h = w = 2 * umin - 1;
          if (fits(r, c, h, w)) { place(r, c, h, w, shape); break; }
        }
      }
    } else {
      const n = o.room_layout === 'Sparse' ? Math.ceil(attempts / 10) : attempts;
      for (let k = 0; k < n; k++) for (let t = 0; t < 8; t++) {
        const shape = roomShape(false);
        const h = 2 * units() - 1, w = shape === 'rect' ? 2 * units() - 1 : h;
        const r1 = randomOdd(rows, h), c1 = randomOdd(sym ? Math.ceil(cols / 2) + w : cols, w);
        if (r1 > 0 && c1 > 0 && placeSym(r1, c1, h, w, shape)) break;
      }
    }
    if (!rooms.length) { // big rooms on a thin layout: settle for one minimal room
      const free = [];
      for (let r = 1; r < rows - 3; r += 2) for (let c = 1; c < cols - 3; c += 2) if (fits(r, c, 3, 3)) free.push([r, c]);
      if (free.length) place(...pick(free), 3, 3, 'rect');
    }

    // ---- doors -------------------------------------------------------------------------------
    const doorTable = Object.entries(DOOR_SET[o.door_set] || DOOR_SET.Standard);
    const doorTotal = doorTable.reduce((s, [, w]) => s + w, 0);
    const roomAt = i => rid[i] ? rooms[rid[i] - 1] : null;
    // shaped rooms: open floor between the wall and the shape so the door is reachable
    function carve(r, c, dr, dc) {
      const room = roomAt(idx(r, c));
      while (room && inb(r, c) && rid[idx(r, c)] === room.id && !(cell[idx(r, c)] & ROOM)) { cell[idx(r, c)] |= ROOM; room.carved.add(idx(r, c)); r += dr; c += dc; }
    }
    function addDoor(r, c, d) {
      const i = idx(r, c);
      let roll = rand(doorTotal);
      const type = doorTable.find(([, w]) => (roll -= w) < 0)[0];
      const door = { r, c, type, vertical: d < 2 };
      doors.set(i, door);
      cell[i] |= DOOR;
      carve(r - DR[d], c - DC[d], -DR[d], -DC[d]);
      carve(r + DR[d], c + DC[d], DR[d], DC[d]);
      return door;
    }
    const linked = new Set();
    const linkKey = (a, b) => Math.min(a, b) + ':' + Math.max(a, b);
    // candidate door cells on a room's walls; shaped rooms only near the middle of each wall
    function sills(room) {
      const out = [], shaped = room.shape !== 'rect' && room.shape !== 'pillars';
      const mid = (a, b) => (a + b) / 2, near = (v, a, b) => !shaped || Math.abs(v - mid(a, b)) <= Math.max(1, (b - a) / 6);
      for (let c = room.c1; c <= room.c2; c += 2) if (near(c, room.c1, room.c2)) out.push([room.r1 - 1, c, 0], [room.r2 + 1, c, 1]);
      for (let r = room.r1; r <= room.r2; r += 2) if (near(r, room.r1, room.r2)) out.push([r, room.c1 - 1, 2], [r, room.c2 + 1, 3]);
      return out.filter(([r, c, d]) => inb(r + DR[d], c + DC[d]) && !(cell[idx(r + DR[d], c + DC[d])] & BLOCKED) && !(cell[idx(r, c)] & (BLOCKED | DOOR)));
    }
    links.forEach(([a, b]) => {
      const opts = sills(a).filter(([r, c, d]) => rid[idx(r + DR[d], c + DC[d])] === b.id);
      if (!opts.length) return;
      opts.sort((p, q) => Math.abs(p[0] + p[1] - (b.r1 + b.r2 + b.c1 + b.c2) / 2) - Math.abs(q[0] + q[1] - (b.r1 + b.r2 + b.c1 + b.c2) / 2));
      const [r, c, d] = opts[0];
      addDoor(r, c, d);
      linked.add(linkKey(a.id, b.id));
    });
    rooms.forEach(room => {
      const ok = sills(room);
      const k = Math.floor(Math.sqrt(((room.r2 - room.r1) / 2 + 1) * ((room.c2 - room.c1) / 2 + 1)));
      let n = k + rand(k) - (room.complex ? 1 : 0);
      while (n-- > 0 && ok.length) {
        const [r, c, d] = ok.splice(rand(ok.length), 1)[0];
        if (cell[idx(r, c)] & DOOR) continue;
        const other = rid[idx(r + DR[d], c + DC[d])];
        if (other) {
          if (linked.has(linkKey(room.id, other))) continue;
          linked.add(linkKey(room.id, other));
        }
        addDoor(r, c, d);
      }
    });

    // ---- corridors: growing-tree maze over the free odd nodes --------------------------------
    const p = STRAIGHT[o.corridor_layout] ?? 0.5;
    for (let r0 = 1; r0 < rows - 1; r0 += 2) for (let c0 = 1; c0 < cols - 1; c0 += 2) {
      if (rid[idx(r0, c0)] || cell[idx(r0, c0)] & (CORRIDOR | BLOCKED)) continue;
      cell[idx(r0, c0)] |= CORRIDOR;
      const stack = [[r0, c0, -1]];
      while (stack.length) {
        const [r, c, last] = stack[stack.length - 1];
        const order = shuffle([0, 1, 2, 3]);
        if (last >= 0 && rnd() < p) order.unshift(last);
        const d = order.find(d => {
          const nr = r + 2 * DR[d], nc = c + 2 * DC[d];
          return nr > 0 && nc > 0 && nr < rows - 1 && nc < cols - 1 && !rid[idx(nr, nc)] &&
            !(cell[idx(nr, nc)] & (CORRIDOR | BLOCKED)) && !(cell[idx(r + DR[d], c + DC[d])] & (BLOCKED | PERIMETER));
        });
        if (d === undefined) { stack.pop(); continue; }
        cell[idx(r + DR[d], c + DC[d])] |= CORRIDOR;
        cell[idx(r + 2 * DR[d], c + 2 * DC[d])] |= CORRIDOR;
        stack.push([r + 2 * DR[d], c + 2 * DC[d], d]);
      }
    }

    // ---- connectivity: join regions through walls, drop what stays unreachable ---------------
    function components() {
      const comp = new Int32Array(rows * cols).fill(-1), sizes = [];
      for (let s = 0; s < cell.length; s++) {
        if (!(cell[s] & OPEN) || comp[s] >= 0) continue;
        const id = sizes.length, q = [s];
        comp[s] = id;
        for (let k = 0; k < q.length; k++) {
          const r = Math.floor(q[k] / cols), c = q[k] % cols;
          for (let d = 0; d < 4; d++) {
            const nr = r + DR[d], nc = c + DC[d], ni = idx(nr, nc);
            if (inb(nr, nc) && cell[ni] & OPEN && comp[ni] < 0) { comp[ni] = id; q.push(ni); }
          }
        }
        sizes.push(q.length);
      }
      return { comp, sizes };
    }
    for (;;) {
      const { comp, sizes } = components();
      if (sizes.length <= 1) break;
      const bridges = [];
      for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
        const i = idx(r, c);
        if ((cell[i] & (PERIMETER | DOOR | BLOCKED)) !== PERIMETER) continue;
        for (const d of [1, 3]) {
          const a = idx(r - DR[d], c - DC[d]), b = idx(r + DR[d], c + DC[d]);
          if (cell[a] & OPEN && cell[b] & OPEN && comp[a] !== comp[b]) bridges.push([r, c, d]);
        }
      }
      if (!bridges.length) {
        const main = sizes.indexOf(Math.max(...sizes));
        for (let i = 0; i < cell.length; i++) if (cell[i] & OPEN && comp[i] !== main) { cell[i] &= ~OPEN; doors.delete(i); }
        break;
      }
      addDoor(...pick(bridges));
    }

    // ---- peripheral egress ---------------------------------------------------------------------
    const exits = [];
    if (o.peripheral_egress) {
      const cand = [];
      for (let r = 1; r < rows - 1; r += 2) for (let c = 1; c < cols - 1; c += 2) {
        if (!(cell[idx(r, c)] & CORRIDOR)) continue;
        for (let d = 0; d < 4; d++) {
          const er = r + DR[d], ec = c + DC[d], br = r + 2 * DR[d], bc = c + 2 * DC[d];
          if (!(cell[idx(er, ec)] & (PERIMETER | OPEN)) && (!inb(br, bc) || cell[idx(br, bc)] & BLOCKED)) cand.push({ r: er, c: ec, d });
        }
      }
      let picks;
      if (o.peripheral_egress === 'Tiling') {
        picks = [0, 1, 2, 3].map(d => cand.filter(e => e.d === d)
          .sort((a, b) => d < 2 ? Math.abs(a.c - cols / 2) - Math.abs(b.c - cols / 2) : Math.abs(a.r - rows / 2) - Math.abs(b.r - rows / 2))[0]).filter(Boolean);
      } else picks = shuffle(cand).slice(0, o.peripheral_egress === 'Many' ? 4 + rand(5) : 1 + rand(2));
      for (const e of picks) { const i = idx(e.r, e.c); cell[i] &= ~BLOCKED; cell[i] |= EXIT; exits.push(e); }
    }

    // ---- stairs fill two cells at a corridor dead end ------------------------------------------
    const stairs = [];
    if (o.add_stairs) {
      const ends = [], passages = [], floors = [];
      for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
        const f = cell[idx(r, c)];
        if (f & CORRIDOR && r % 2 && c % 2) (openCount(r, c) === 1 ? ends : passages).push([r, c]);
        else if (f & ROOM) floors.push([r, c]);
      }
      // dead ends first; with too few of them, plain corridor and then room floor (so every floor links up and down)
      const need = o.add_stairs === 'Many' ? 3 + rand(4) : 2;
      for (const [r, c] of [...shuffle(ends), ...shuffle(passages), ...shuffle(floors)]) {
        if (stairs.length >= need) break;
        if (cell[idx(r, c)] & (STAIRS | DOOR)) continue;
        const d = [0, 1, 2, 3].find(k => !(cell[idx(r + DR[k], c + DC[k])] & (DOOR | STAIRS | EXIT)) && cell[idx(r + DR[k], c + DC[k])] & (ROOM | CORRIDOR));
        if (d === undefined) continue;
        cell[idx(r, c)] |= STAIRS; cell[idx(r + DR[d], c + DC[d])] |= STAIRS;
        stairs.push({ r, c, dr: DR[d], dc: DC[d], down: stairs.length % 2 === 1 });
      }
    }

    // ---- dead ends: only leaves are removed, so the map stays connected ------------------------
    const chance = DEADENDS[o.remove_deadends || ''];
    if (chance) {
      const prune = i => {
        for (;;) {
          const r = Math.floor(i / cols), c = i % cols;
          if (cell[i] & (ROOM | EXIT | STAIRS) || openCount(r, c) !== 1) return;
          const d = [0, 1, 2, 3].find(d => inb(r + DR[d], c + DC[d]) && cell[idx(r + DR[d], c + DC[d])] & OPEN);
          cell[i] &= ~(CORRIDOR | DOOR);
          doors.delete(i);
          i = idx(r + DR[d], c + DC[d]);
        }
      };
      for (let r = 1; r < rows - 1; r += 2) for (let c = 1; c < cols - 1; c += 2) {
        const i = idx(r, c);
        if (cell[i] & CORRIDOR && openCount(r, c) === 1 && rnd() < chance) prune(i);
      }
    }

    // ---- renumber surviving rooms, attach doors, trace where each door leads ------------------
    rooms = rooms.filter(q => { for (let r = q.r1; r <= q.r2; r++) for (let c = q.c1; c <= q.c2; c++) if (cell[idx(r, c)] & ROOM) return true; return false; });
    const renum = new Map(rooms.map((q, k) => [q.id, k + 1]));
    rooms.forEach(q => { q.id = renum.get(q.id); });
    for (let i = 0; i < rid.length; i++) rid[i] = renum.get(rid[i]) || 0;
    for (const door of doors.values()) {
      for (const d of door.vertical ? [0, 1] : [2, 3]) {
        const room = roomAt(idx(door.r + DR[d], door.c + DC[d]));
        if (room) room.doors.push({ door, side: SIDE[d ^ 1], toward: d ^ 1 });
      }
    }
    // follow an unbranched corridor from a door to the next room's door
    function leadsTo(door, d, from) {
      let r = door.r + DR[d], c = door.c + DC[d], pr = door.r, pc = door.c;
      for (let steps = 0; steps < rows * cols; steps++) {
        const i = idx(r, c);
        if (rid[i] && rid[i] !== from) return rid[i];
        if (rid[i] === from) return 0;
        const next = [0, 1, 2, 3].map(k => [r + DR[k], c + DC[k]]).filter(([nr, nc]) => (nr !== pr || nc !== pc) && inb(nr, nc) && cell[idx(nr, nc)] & OPEN);
        if (next.length !== 1 || cell[i] & (STAIRS | EXIT)) return 0;
        [pr, pc] = [r, c];
        [r, c] = next[0];
      }
      return 0;
    }
    const order = { north: 0, west: 1, east: 2, south: 3 };
    rooms.forEach(room => {
      room.doors.forEach(e => { e.leadsTo = leadsTo(e.door, e.toward, room.id); });
      room.doors.sort((a, b) => order[a.side] - order[b.side] || a.door.r - b.door.r || a.door.c - b.door.c);
    });

    return { rows, cols, cell, rid, rooms, doors: [...doors.values()], stairs, exits, features: featureSpots(CORRIDOR), seedRng: rnd };

    // corridor features are lettered in reading order; roughly half the spots get one
    function featureSpots(flag) {
      const cand = [];
      for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++)
        if ((flag === CAVE || (r % 2 && c % 2)) && cell[idx(r, c)] & flag && !(cell[idx(r, c)] & (STAIRS | EXIT))) cand.push([r, c]);
      const want = flag === CAVE ? Math.max(4, Math.round(cand.length / 60)) : Math.max(3, Math.round(rooms.length * 0.42));
      const spots = [];
      for (const [r, c] of shuffle(cand)) {
        if (spots.length >= Math.min(want, 26)) break;
        if (spots.every(s => Math.abs(s.r - r) + Math.abs(s.c - c) >= 6)) spots.push({ r, c });
      }
      spots.sort((a, b) => a.r - b.r || a.c - b.c);
      spots.forEach((s, k) => { s.letter = String.fromCharCode(97 + k); });
      return spots.filter(() => rnd() < 0.5);
    }

    // Cavernous: cellular-automaton cave, largest region kept, no rooms
    function caves() {
      let wall = new Uint8Array(rows * cols);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
        wall[idx(r, c)] = r === 0 || c === 0 || r === rows - 1 || c === cols - 1 || rnd() < 0.45 ? 1 : 0;
      for (let it = 0; it < 5; it++) {
        const next = new Uint8Array(wall);
        for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
          let n1 = 0, n2 = 0;
          for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) {
            const w = inb(r + y, c + x) ? wall[idx(r + y, c + x)] : 1;
            if (Math.abs(y) <= 1 && Math.abs(x) <= 1) n1 += w;
            n2 += w;
          }
          next[idx(r, c)] = n1 >= 5 || (it < 3 && n2 <= 2) ? 1 : 0;
        }
        wall = next;
      }
      for (let i = 0; i < cell.length; i++) if (!wall[i]) cell[i] = CAVE;
      const { comp, sizes } = components();
      const main = sizes.indexOf(Math.max(...sizes));
      for (let i = 0; i < cell.length; i++) if (cell[i] && comp[i] !== main) cell[i] = 0;
      const stairs = [];
      if (o.add_stairs) {
        const spots = [];
        for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 2; c++)
          if (cell[idx(r, c)] && cell[idx(r, c + 1)] && openCount(r, c) + openCount(r, c + 1) <= 5) spots.push([r, c]);
        shuffle(spots).slice(0, o.add_stairs === 'Many' ? 3 + rand(4) : 2).forEach(([r, c], k) => {
          cell[idx(r, c)] |= STAIRS; cell[idx(r, c + 1)] |= STAIRS;
          stairs.push({ r, c, dr: 0, dc: 1, down: k % 2 === 1 });
        });
      }
      return { rows, cols, cell, rid, rooms: [], doors: [], stairs, exits: [], features: featureSpots(CAVE), cave: true, seedRng: rnd };
    }
  }

  const api = { generate, dimensions, FLAGS: { BLOCKED, ROOM, CORRIDOR, PERIMETER, DOOR, EXIT, STAIRS, CAVE, OPEN } };
  if (typeof module !== 'undefined') module.exports = api; else root.Dungeon = api;
})(globalThis);
