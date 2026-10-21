// Furnishes rooms with props: each room gets a purpose from the chosen habitat theme, and the
// purpose's recipe places furniture against walls, in corners, around tables and across the floor.
// Art comes from CC0 packs: KayKit Dungeon Pack models (baked top-down by _src/bake.html), Mark
// Gosbell's flat greyscale dungeon assets, Kenney's Scribble Dungeons and Kenney's 1-Bit Pack
// (see assets/*/License.txt and README.txt). Props KayKit lacks are painted in battlemap.js.
(function (root) {
  const F = (typeof module !== 'undefined' ? require('./dungeon.js') : root.Dungeon).FLAGS;

  // kind -> sprites. Gosbell sizes come from the file names (1x2 = one cell wide, two tall);
  // top-down sets are drawn with their back edge up and rotate to face into the room.
  const g = (...names) => names.map(n => ({ file: `gosbell/${n}.png`, w: +(n.match(/(\d)x(\d)/) || [0, 1])[1], h: +(n.match(/(\d)x(\d)/) || [0, 1, 1])[2] }));
  const s = (...names) => names.map(n => ({ file: `kenney-scribble/${n}.png`, w: 1, h: 1 }));
  const t = (...tiles) => tiles.map(tile => ({ tile, w: 1, h: 1 }));
  const k = (...specs) => specs.map(spec => { const [n, w = 1, h = 1] = spec.split(':'); return { file: `kaykit/${n}.png`, w: +w, h: +h }; });
  const paint = (...names) => names.map(n => ({ paint: n, w: 1, h: 1 }));
  const ART = {
    painted: {
      label: 'Painted (KayKit)', rotate: true, shadow: true,
      kinds: {
        chair: k('chair'), stool: k('stool'), table: k('table_medium', 'table_medium_decorated_a', 'table_medium_tablecloth', 'table_medium_tablecloth_decorated_b', 'table_small_decorated_a', 'table_small_decorated_b'),
        table_long: k('table_long:1:2', 'table_long_decorated_a:1:2', 'table_long_decorated_c:1:2', 'table_long_tablecloth:1:2', 'table_long_tablecloth_decorated_a:1:2'),
        table_round: k('table_small', 'table_small_decorated_a'), table_broken: k('table_long_broken:1:2', 'table_medium_broken'),
        barrel: k('barrel_large', 'barrel_large_decorated', 'barrel_small', 'keg'), barrels: k('barrel_small_stack', 'keg_decorated:2:1'),
        crate: k('box_large', 'box_small', 'box_small_decorated'), crates: k('crates_stacked', 'box_stacked:2:2'), crate_open: k('box_small_decorated'),
        chest: k('chest', 'trunk_large_a', 'trunk_large_b', 'trunk_medium_a', 'trunk_medium_b', 'trunk_small_a', 'trunk_small_c'),
        treasure: k('coin_stack_large', 'coin_stack_medium', 'coin_stack_small', 'chest_gold'), treasure_big: k('chest_gold'), coins: k('coin_stack_small', 'coin_stack_medium'),
        bed: k('bed_decorated:1:2', 'bed_frame:1:2'), hay: k('bed_floor:1:2'), bookcase: k('shelves', 'shelf_large'), shelf: k('shelf_small', 'shelf_small_candles', 'shelf_large'),
        candle: k('candle_lit', 'candle_triple', 'candle_melted', 'candle_thin_lit'), torch: k('torch_mounted'), bottle: k('bottle_a_brown', 'bottle_b_green', 'bottle_c_brown'),
        plate: k('plate_food_a', 'plate_food_b', 'plate_stack'), rubble: k('rubble_half:2:2'), weapon: k('sword_shield', 'sword_shield_broken', 'sword_shield_gold'),
        pillar: k('pillar', 'pillar_decorated', 'column'), keyring: k('keyring'), pit: k('floor_tile_big_grate:2:2'), trapdoor: k('floor_tile_grate_open:2:1'),
        campfire: paint('campfire'), coffin: paint('coffin'), rug: paint('rug'), bones: paint('bones'), skull: paint('bones'), cobweb: paint('cobweb'),
        sack: paint('sack'), altar: paint('altar'), puddle: paint('puddle'), cage: paint('cage'), pot: paint('pot'), cauldron: paint('cauldron'),
      },
    },
    ink: {
      label: 'Ink Sketch (Mark Gosbell)', rotate: true,
      kinds: {
        chair: g('Chair1x1'), barrel: g('barrel1x1', 'barreltwo1x1'), bed: g('bed1x2', 'bedtwo1x2'), bed_double: g('beddouble2x2', 'bedtwodouble2x2'),
        bath: g('bath1x2'), book: g('book1x1', 'booktwo1x1'), bookcase: g('bookcase1x1'), campfire: g('campfire1x1', 'campfiretwo1x1'),
        chest: g('chest1x1', 'chesttwo1x1'), crate: g('crate1x1', 'cratetwo1x1'), crate_open: g('opencrate1x1'), dresser: g('dresser1x1'),
        hay: g('hay1x1'), hay_big: g('hay2x2'), paper: g('paper1x1', 'paper-pile1x1'), pot: g('pot1x1'), plant: g('potplant1x1', 'potplanttwo1x1'),
        sack: g('sack1x1', 'sacktwo1x1'), shelf: g('shelf1x1'), table: g('table1x1', 'tableRough1x1'), table_long: g('table1x2', 'table1x2-rough'),
        table_round: g('TableCircle1x1', 'tableCircleRough1x1'), table_round_big: g('tableCircleRough2x2'), toilet: g('toilet1x1'),
        treasure: g('treasurepile1x1'), treasure_big: g('treasurepile2x2'), pit: g('Pitcircle1x1'),
      },
    },
    scribble: {
      label: 'Scribble (Kenney)', rotate: true, passes: 3, // thin grey pencil lines, darkened by repeated multiply
      kinds: {
        barrel: s('barrel'), barrels: s('barrels', 'barrels_stacked'), bed: s('bed'), bed_double: s('bed_luxurious'), campfire: s('campfire'),
        rug: s('carpet'), cart: s('cart'), chair: s('chair'), chest: s('chest'), coffin: s('coffin'), crate: s('crate', 'crate_small'),
        table: s('table'), plant: s('plants'), puddle: s('puddle'), trapdoor: s('trapdoor_round', 'trapdoor_square'), statue: s('dragon'),
        weapon: s('weapon_sword', 'weapon_axe', 'weapon_spear', 'weapon_bow', 'weapon_hammer', 'weapon_staff', 'shield_curved', 'shield_straight'),
      },
    },
    pixel: {
      label: 'Pixel 1-Bit (Kenney)', rotate: false, tint: true, sheet: 'kenney-1bit/colored-transparent_packed.png', tileSize: 16, sheetCols: 49, // tint: recoloured to each map style's ink
      kinds: {
        chair: t(452), table: t(456, 394), table_long: t(395, 396), bed: t(397, 398), bed_double: t(399), bookcase: t(299, 346, 347), shelf: t(298),
        chest: t(302, 303), crate: t(748), barrel: t(650), pot: t(691), cauldron: t(690), campfire: t(504), fire: t(505), altar: t(688),
        candle: t(738, 740), skull: t(735), bones: t(736), cobweb: t(737), treasure: t(553), cage: t(543), grave: t(686, 687), cart: t(652),
        dresser: t(350, 348), stove: t(400, 403), toilet: t(454), bath: t(455), rope: t(697), hay: t(745, 746), plant: t(307, 308, 309),
      },
    },
  };

  // what can stand in for a kind a set does not draw
  const SUBSTITUTE = {
    barrels: ['barrel'], crate_open: ['crate'], hay_big: ['hay', 'bed'], hay: ['bed', 'sack'], bed_double: ['bed'], table_round: ['table'],
    table_round_big: ['table_round', 'table'], table_long: ['table'], treasure_big: ['treasure', 'chest'], treasure: ['chest'],
    coffin: ['grave', 'chest'], grave: ['coffin'], altar: ['statue', 'table'], statue: ['altar'], candle: ['fire'], bones: ['skull', 'paper'],
    skull: ['bones'], cobweb: [], cauldron: ['pot', 'campfire'], stove: ['campfire', 'fire'], book: ['paper'], paper: ['book'], shelf: ['bookcase', 'dresser'],
    bookcase: ['shelf'], weapon: ['crate'], cage: ['hay'], rug: [], rope: ['sack'], sack: ['crate'], pot: ['barrel'], dresser: ['shelf', 'chest'],
    campfire: ['fire'], fire: ['campfire'], cart: ['crate'], puddle: [], trapdoor: ['pit'], pit: ['trapdoor'], plant: ['pot'], bath: ['barrel'], toilet: ['pot'],
    torch: ['candle'], plate: ['pot'], bottle: ['pot'], rubble: ['bones'], crates: ['barrels', 'crate'], coins: ['treasure'], table_broken: ['table'], stool: ['chair'], pillar: ['statue'], keyring: [],
  };

  // room purposes: placements run in order; count is [min, max] or a fraction of the free wall cells
  const PURPOSES = {
    storeroom: { name: 'Storeroom', place: [
      { kind: ['barrels', 'barrel', 'crate'], at: 'corner', count: [2, 4] },
      { kind: ['crate', 'barrel', 'sack', 'crate_open'], at: 'wall', density: 0.45 },
      { kind: ['crates', 'barrels'], at: 'wall', count: [0, 2] },
      { kind: ['sack', 'crate_open', 'pot', 'bottle'], at: 'floor', count: [0, 3] }] },
    barracks: { name: 'Barracks', minArea: 15, place: [
      { kind: ['bed'], at: 'wall', density: 0.5, spacing: 2 },
      { kind: ['chest'], at: 'floor', count: [1, 3] },
      { kind: ['table'], at: 'center', chairs: [1, 4] },
      { kind: ['weapon', 'torch'], at: 'wall', count: [0, 2] }] },
    bedchamber: { name: 'Bedchamber', place: [
      { kind: ['bed_double', 'bed'], at: 'wall', count: [1, 1] },
      { kind: ['dresser', 'chest'], at: 'wall', count: [1, 2] },
      { kind: ['rug'], at: 'center', count: [0, 1] },
      { kind: ['plant', 'book'], at: 'corner', count: [0, 2] }] },
    dining: { name: 'Dining Hall', minArea: 20, place: [
      { kind: ['table_long', 'table'], at: 'center', count: [1, 2], chairs: [3, 8] },
      { kind: ['barrel', 'shelf', 'torch'], at: 'wall', count: [1, 3] },
      { kind: ['plate', 'bottle'], at: 'floor', count: [0, 2] }] },
    kitchen: { name: 'Kitchen', place: [
      { kind: ['stove', 'campfire', 'fire'], at: 'wall', count: [1, 1] },
      { kind: ['table'], at: 'center', count: [1, 1] },
      { kind: ['cauldron', 'pot'], at: 'floor', count: [1, 3] },
      { kind: ['barrel', 'sack', 'shelf'], at: 'wall', count: [1, 4] },
      { kind: ['plate', 'bottle'], at: 'floor', count: [1, 3] }] },
    library: { name: 'Library', place: [
      { kind: ['bookcase', 'shelf'], at: 'wall', density: 0.75 },
      { kind: ['table', 'table_round'], at: 'center', chairs: [1, 3] },
      { kind: ['book', 'paper'], at: 'floor', count: [1, 3] }] },
    study: { name: 'Study', place: [
      { kind: ['table'], at: 'center', chairs: [1, 1] },
      { kind: ['bookcase', 'shelf'], at: 'wall', count: [1, 3] },
      { kind: ['paper', 'book'], at: 'floor', count: [1, 3] },
      { kind: ['chest', 'candle'], at: 'corner', count: [0, 1] }] },
    treasury: { name: 'Treasury', place: [
      { kind: ['treasure_big', 'treasure'], at: 'center', count: [1, 1] },
      { kind: ['chest'], at: 'wall', count: [2, 5] },
      { kind: ['treasure', 'coins'], at: 'floor', count: [1, 3] },
      { kind: ['torch'], at: 'wall', count: [1, 2] }] },
    shrine: { name: 'Shrine', place: [
      { kind: ['altar', 'statue'], at: 'center', count: [1, 1] },
      { kind: ['pillar'], at: 'corner', count: [0, 4] },
      { kind: ['candle', 'plant', 'pot'], at: 'floor', count: [2, 4] },
      { kind: ['rug'], at: 'floor', count: [0, 1] }] },
    crypt: { name: 'Crypt', place: [
      { kind: ['coffin', 'grave'], at: 'wall', density: 0.4, spacing: 2 },
      { kind: ['coffin', 'grave'], at: 'center', count: [0, 2] },
      { kind: ['candle'], at: 'corner', count: [1, 3] },
      { kind: ['skull', 'bones'], at: 'floor', count: [1, 4] },
      { kind: ['cobweb'], at: 'corner', count: [1, 2] }] },
    latrine: { name: 'Latrine', maxArea: 30, place: [
      { kind: ['toilet'], at: 'wall', count: [1, 3] },
      { kind: ['bath', 'pot'], at: 'wall', count: [0, 1] }] },
    armory: { name: 'Armory', place: [
      { kind: ['weapon', 'shelf', 'crate'], at: 'wall', density: 0.55 },
      { kind: ['chest', 'barrel'], at: 'corner', count: [1, 2] },
      { kind: ['table'], at: 'center', count: [0, 1] },
      { kind: ['torch'], at: 'wall', count: [0, 1] }] },
    workshop: { name: 'Workshop', place: [
      { kind: ['table', 'table_long'], at: 'center', count: [1, 2] },
      { kind: ['cart', 'crate'], at: 'floor', count: [1, 2] },
      { kind: ['barrel', 'crate', 'shelf', 'sack'], at: 'wall', count: [2, 5] }] },
    prison: { name: 'Prison', place: [
      { kind: ['cage', 'hay'], at: 'wall', count: [1, 4], spacing: 2 },
      { kind: ['pot', 'rope', 'bones'], at: 'floor', count: [1, 3] }] },
    den: { name: 'Den', place: [
      { kind: ['campfire'], at: 'center', count: [1, 1] },
      { kind: ['hay_big', 'hay', 'bed'], at: 'wall', count: [2, 5], spacing: 2 },
      { kind: ['bones', 'skull', 'sack', 'pot'], at: 'floor', count: [2, 5] },
      { kind: ['treasure', 'crate_open'], at: 'corner', count: [0, 1] },
      { kind: ['table_broken', 'rubble'], at: 'floor', count: [0, 1] }] },
    camp: { name: 'Hideout', place: [
      { kind: ['campfire', 'table_round_big', 'table_round'], at: 'center', count: [1, 1], chairs: [0, 4] },
      { kind: ['bed', 'hay'], at: 'wall', count: [2, 4], spacing: 2 },
      { kind: ['barrels', 'crate', 'chest'], at: 'corner', count: [1, 3] },
      { kind: ['paper', 'sack', 'bottle', 'plate'], at: 'floor', count: [1, 3] },
      { kind: ['torch'], at: 'wall', count: [0, 2] }] },
    lair: { name: 'Lair', place: [
      { kind: ['hay_big', 'hay'], at: 'center', count: [0, 1] },
      { kind: ['treasure', 'treasure_big'], at: 'corner', count: [0, 1] },
      { kind: ['rubble'], at: 'corner', count: [0, 1] },
      { kind: ['bones', 'skull', 'puddle', 'crate_open'], at: 'floor', count: [3, 7] },
      { kind: ['cobweb'], at: 'corner', count: [1, 3] }] },
    pit: { name: 'Pit Room', place: [
      { kind: ['pit', 'trapdoor'], at: 'center', count: [1, 1] },
      { kind: ['bones', 'sack'], at: 'floor', count: [0, 2] }] },
    empty: { name: '', place: [{ kind: ['rubble', 'table_broken'], at: 'corner', count: [0, 1] }, { kind: ['crate_open', 'paper', 'pot', 'bones', 'cobweb'], at: 'floor', count: [0, 2] }] },
  };

  const THEMES = {
    Generic: { storeroom: 4, barracks: 2, bedchamber: 1, dining: 2, kitchen: 1, library: 1, study: 1, treasury: 1, shrine: 1, latrine: 1, armory: 1, workshop: 2, empty: 3 },
    'Goblinoid Den': { den: 5, storeroom: 3, lair: 1, kitchen: 1, armory: 1, prison: 1, treasury: 1, pit: 1, empty: 2 },
    'Bandit Hideout': { camp: 3, barracks: 3, storeroom: 4, dining: 2, treasury: 1, armory: 1, study: 1, prison: 1, kitchen: 1, empty: 2 },
    'Monster Infested': { lair: 5, storeroom: 1, crypt: 1, pit: 1, treasury: 1, empty: 4 },
    'Haunted Crypt': { crypt: 5, shrine: 2, storeroom: 1, lair: 1, library: 1, empty: 2 },
  };

  function mulberry32(a) {
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let x = Math.imul(a ^ a >>> 15, 1 | a);
      x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
      return ((x ^ x >>> 14) >>> 0) / 4294967296;
    };
  }
  const DR = [-1, 1, 0, 0], DC = [0, 0, -1, 1];
  const ROT_FOR_WALL = [0, 180, 270, 90]; // back edge against the north, south, west, east wall

  // separate random stream, so turning furnishing on never changes the rest of the dungeon
  function furnish(d, o) {
    const themeName = o.furnish === 'Random' ? null : o.furnish;
    if (!o.furnish || o.furnish === 'None' || d.cave) return { theme: null, rooms: [] };
    const rnd = mulberry32((Number(o.seed) >>> 0) ^ 0x5f3759df);
    const rand = n => Math.floor(rnd() * n);
    const pick = a => a[rand(a.length)];
    const theme = themeName || pick(Object.keys(THEMES));
    const art = ART[o.furniture_art] || ART.painted;
    const { rows, cols, cell, rid } = d;
    const idx = (r, c) => r * cols + c;

    // the first kind this art set draws, following substitutes
    function resolve(kinds) {
      const seen = new Set(), queue = [...kinds];
      while (queue.length) {
        const k = queue.shift();
        if (seen.has(k)) continue;
        seen.add(k);
        if (art.kinds[k]) return k;
        queue.push(...(SUBSTITUTE[k] || []));
      }
      return null;
    }
    function weighted(table) {
      const entries = Object.entries(table);
      let roll = rnd() * entries.reduce((s, [, w]) => s + w, 0);
      return entries.find(([, w]) => (roll -= w) < 0)[0];
    }

    const rooms = d.rooms.map(room => {
      const floor = new Set();
      for (let r = room.r1; r <= room.r2; r++) for (let c = room.c1; c <= room.c2; c++)
        if (cell[idx(r, c)] & F.ROOM && !(cell[idx(r, c)] & F.STAIRS) && rid[idx(r, c)] === room.id) floor.add(idx(r, c));
      const area = floor.size;
      let purpose;
      for (let tries = 0; tries < 10; tries++) {
        purpose = weighted(THEMES[theme]);
        const p = PURPOSES[purpose];
        if ((!p.minArea || area >= p.minArea) && (!p.maxArea || area <= p.maxArea)) break;
        purpose = 'empty';
      }
      const pieces = [], used = new Set(), reserved = new Set();
      const inner = room.doors.map(e => idx(e.door.r - DR[e.toward], e.door.c - DC[e.toward])).filter(i => floor.has(i));
      inner.forEach(i => reserved.add(i));
      // keep a walkway between every door so furniture never seals a room
      for (const target of inner.slice(1)) {
        const prev = new Map([[inner[0], -1]]), q = [inner[0]];
        for (let k = 0; k < q.length && !prev.has(target); k++) {
          const r = Math.floor(q[k] / cols), c = q[k] % cols;
          for (let dd = 0; dd < 4; dd++) {
            const n = idx(r + DR[dd], c + DC[dd]);
            if (floor.has(n) && !prev.has(n)) { prev.set(n, q[k]); q.push(n); }
          }
        }
        for (let i = target; i >= 0 && prev.has(i); i = prev.get(i)) reserved.add(i);
      }
      const cr = Math.round((room.r1 + room.r2) / 2), cc = Math.round((room.c1 + room.c2) / 2);
      reserved.add(idx(cr, cc)); // the room number stays readable

      const free = i => floor.has(i) && !used.has(i) && !reserved.has(i);
      const wallDirs = i => {
        const r = Math.floor(i / cols), c = i % cols;
        return [0, 1, 2, 3].filter(dd => !floor.has(idx(r + DR[dd], c + DC[dd])) && !(cell[idx(r + DR[dd], c + DC[dd])] & F.DOOR));
      };
      // footprint cells for a sprite at (r, c) top-left, rotated
      const footprint = (r, c, w, h) => { const out = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out.push(idx(r + y, c + x)); return out; };
      function put(kind, sprite, r, c, rot, fw, fh) {
        const cells = footprint(r, c, fw, fh);
        if (!cells.every(free)) return false;
        cells.forEach(i => used.add(i));
        pieces.push({ kind, sprite, r, c, w: fw, h: fh, rot });
        return true;
      }
      const spriteFor = kind => pick(art.kinds[kind]);
      const dims = (sprite, rot) => rot % 180 ? [sprite.h, sprite.w] : [sprite.w, sprite.h];

      // against a wall: back edge on the wall, footprint grows into the room
      function atWall(kind, sprite, i, dd) {
        const rot = art.rotate ? ROT_FOR_WALL[dd] : 0;
        const [fw, fh] = dims(sprite, rot);
        let r = Math.floor(i / cols), c = i % cols;
        if (dd === 1) r -= fh - 1;
        if (dd === 3) c -= fw - 1;
        return put(kind, sprite, r, c, rot, fw, fh);
      }
      function chairsAround(piece, n) {
        const spots = [];
        for (let y = piece.r; y < piece.r + piece.h; y++) { spots.push([y, piece.c - 1, 270]); spots.push([y, piece.c + piece.w, 90]); }
        for (let x = piece.c; x < piece.c + piece.w; x++) { spots.push([piece.r - 1, x, 0]); spots.push([piece.r + piece.h, x, 180]); }
        const chair = resolve(['chair']);
        if (!chair) return;
        for (const [r, c, rot] of spots.sort(() => rnd() - 0.5).slice(0, n)) put(chair, spriteFor(chair), r, c, art.rotate ? rot : 0, 1, 1);
      }

      for (const step of PURPOSES[purpose].place) {
        const kind = resolve(step.kind);
        if (!kind) continue;
        const cells = [...floor].filter(free);
        const walls = cells.filter(i => wallDirs(i).length);
        // bigger rooms get proportionally more loose clutter and wall pieces
        const scale = step.at === 'floor' || step.at === 'wall' ? Math.min(3, Math.max(1, Math.sqrt(area / 25))) : 1;
        let n = step.count ? Math.round((step.count[0] + rand(step.count[1] - step.count[0] + 1)) * scale) : Math.round(walls.length * step.density);
        if (step.at === 'center') {
          // centre outwards, long tables along the room's longer side
          const long = room.c2 - room.c1 > room.r2 - room.r1;
          const order = cells.filter(i => !wallDirs(i).length).sort((a, b) => {
            const da = Math.abs(Math.floor(a / cols) - cr) + Math.abs(a % cols - cc), db = Math.abs(Math.floor(b / cols) - cr) + Math.abs(b % cols - cc);
            return da - db || rnd() - 0.5;
          });
          for (const i of order) {
            if (n <= 0) break;
            const sprite = spriteFor(kind);
            const rot = art.rotate && sprite.h > sprite.w && long ? 90 : 0;
            const [fw, fh] = dims(sprite, rot);
            const r = Math.floor(i / cols) - Math.floor((fh - 1) / 2), c = i % cols - Math.floor((fw - 1) / 2);
            // leave a ring around centre pieces so chairs and people fit
            const ring = footprint(r - 1, c - 1, fw + 2, fh + 2).filter(j => floor.has(j));
            if (ring.some(j => used.has(j))) continue;
            if (put(kind, sprite, r, c, rot, fw, fh)) {
              n--;
              if (step.chairs) chairsAround(pieces[pieces.length - 1], step.chairs[0] + rand(step.chairs[1] - step.chairs[0] + 1));
            }
          }
        } else if (step.at === 'wall' || step.at === 'corner') {
          const corner = step.at === 'corner';
          const spots = walls.filter(i => corner ? wallDirs(i).length >= 2 : true).sort(() => rnd() - 0.5);
          const taken = [];
          for (const i of spots) {
            if (n <= 0) break;
            const r = Math.floor(i / cols), c = i % cols;
            if (step.spacing && taken.some(([tr, tc]) => Math.abs(tr - r) + Math.abs(tc - c) < step.spacing)) continue;
            const dd = pick(wallDirs(i));
            if (atWall(kind, spriteFor(kind), i, dd)) { n--; taken.push([r, c]); }
          }
        } else {
          for (const i of cells.sort(() => rnd() - 0.5)) {
            if (n <= 0) break;
            const sprite = spriteFor(kind);
            if (sprite.w > 1 || sprite.h > 1) continue;
            if (put(kind, sprite, Math.floor(i / cols), i % cols, art.rotate ? pick([0, 90, 180, 270]) : 0, 1, 1)) n--;
          }
        }
      }
      return { id: room.id, purpose: PURPOSES[purpose].name, pieces };
    });
    return { theme, art: art.label, artKey: o.furniture_art in ART ? o.furniture_art : 'painted', rooms };
  }

  // "Barracks: 4 x Bed, 2 x Chest, 1 x Table, 2 x Chair"
  function describe(room) {
    if (!room || !room.pieces.length) return room && room.purpose ? room.purpose : '';
    const counts = new Map();
    room.pieces.forEach(p => counts.set(p.kind, (counts.get(p.kind) || 0) + 1));
    const label = k => k.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()).replace('Table Long', 'Long Table').replace('Table Round Big', 'Large Round Table')
      .replace('Table Round', 'Round Table').replace('Bed Double', 'Double Bed').replace('Hay Big', 'Hay Pile').replace('Treasure Big', 'Treasure Hoard').replace('Crate Open', 'Open Crate');
    const list = [...counts].map(([k, n]) => `${n} x ${label(k)}`).join(', ');
    return room.purpose ? `${room.purpose}: ${list}` : list;
  }

  const api = { furnish, describe, ART, THEMES, PURPOSES };
  if (typeof module !== 'undefined') module.exports = api; else root.DungeonFurnish = api;
})(globalThis);
