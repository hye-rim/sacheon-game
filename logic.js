'use strict';

// 사천성: 판 규칙만 모아 둔 파일 (그리기·입력 없음). 브라우저와 테스트(Node)가 같이 쓴다.
//
// g[r][c] = 패 종류(0..KINDS-1), 빈칸은 -1.
// 같은 패 두 개를 '두 번 이하로 꺾이는 빈 길'로 이을 수 있으면 없앤다. 판 바깥 한 줄도 길로 쓸 수 있다.
const ROWS = 10, COLS = 8, KINDS = 20;           // 80칸 = 20종류 × 4개
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// 판 밖(바깥 테두리 한 줄 포함)은 빈칸으로 본다
const at = (g, r, c) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? -1 : g[r][c]);
const inPad = (r, c) => r >= -1 && r <= ROWS && c >= -1 && c <= COLS;
const same = (a, b) => a[0] === b[0] && a[1] === b[1];

// a, b 가 한 줄에 있고 그 사이(양 끝 제외)가 모두 비었는가
function clearLine(g, a, b) {
  if (a[0] === b[0]) {
    const lo = Math.min(a[1], b[1]), hi = Math.max(a[1], b[1]);
    for (let c = lo + 1; c < hi; c++) if (at(g, a[0], c) !== -1) return false;
    return true;
  }
  if (a[1] === b[1]) {
    const lo = Math.min(a[0], b[0]), hi = Math.max(a[0], b[0]);
    for (let r = lo + 1; r < hi; r++) if (at(g, r, a[1]) !== -1) return false;
    return true;
  }
  return false;
}

const plen = (p) => p.reduce((s, q, i) => (i ? s + Math.abs(q[0] - p[i - 1][0]) + Math.abs(q[1] - p[i - 1][1]) : 0), 0);

// a 에서 b 로 가는 길(꺾이는 점 목록). 없으면 null. 여러 개면 가장 짧은 길
function path(g, a, b) {
  if (same(a, b)) return null;
  if (clearLine(g, a, b)) return [a, b];
  // 한 번 꺾기
  for (const m of [[a[0], b[1]], [b[0], a[1]]]) {
    if (at(g, m[0], m[1]) === -1 && clearLine(g, a, m) && clearLine(g, m, b)) return [a, m, b];
  }
  // 두 번 꺾기: a 에서 네 방향으로 빈칸을 따라가다가, 그 점에서 한 번 꺾어 b 로
  let best = null;
  for (const [dr, dc] of DIRS) {
    let r = a[0] + dr, c = a[1] + dc;
    while (inPad(r, c) && at(g, r, c) === -1) {
      const m = [r, c];
      for (const n of [[r, b[1]], [b[0], c]]) {
        if (same(n, m) || same(n, b) || at(g, n[0], n[1]) !== -1) continue;
        if (clearLine(g, m, n) && clearLine(g, n, b)) {
          const p = [a, m, n, b];
          if (!best || plen(p) < plen(best)) best = p;
        }
      }
      r += dr; c += dc;
    }
  }
  return best;
}

const canMatch = (g, a, b) => g[a[0]][a[1]] !== -1 && g[a[0]][a[1]] === g[b[0]][b[1]] && !same(a, b) && path(g, a, b);

// 지금 없앨 수 있는 짝 하나 (힌트용). 없으면 null
function findPair(g) {
  const byKind = new Map();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = g[r][c];
    if (k === -1) continue;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push([r, c]);
  }
  for (const cells of byKind.values()) {
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      const p = path(g, cells[i], cells[j]);
      if (p) return { a: cells[i], b: cells[j], path: p };
    }
  }
  return null;
}

const left = (g) => g.reduce((s, row) => s + row.filter((k) => k !== -1).length, 0);

function shuffled(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// 지금 이을 수 있는 짝 전부. 남은 개수가 적은 종류부터 (풀이 탐색이 빨리 끝난다)
function allPairs(g) {
  const byKind = new Map();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = g[r][c];
    if (k === -1) continue;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push([r, c]);
  }
  const out = [];
  for (const cells of byKind.values()) {
    for (let i = 0; i < cells.length; i++) for (let j = i + 1; j < cells.length; j++) {
      if (path(g, cells[i], cells[j])) out.push([cells[i], cells[j], cells.length]);
    }
  }
  return out.sort((x, y) => x[2] - y[2]);
}

// 끝까지 풀 수 있는지 찾아본다 (정해진 만큼만 뒤져 보고 못 찾으면 false)
function solvable(g, budget = 3000) {
  const seen = new Set();
  let n = 0;
  const rec = (rest) => {
    if (!rest) return true;
    if (++n > budget) return false;
    const key = g.map((row) => row.join(',')).join(';');
    if (seen.has(key)) return false;
    seen.add(key);
    for (const [a, b] of allPairs(g)) {
      const k = g[a[0]][a[1]];
      g[a[0]][a[1]] = -1; g[b[0]][b[1]] = -1;
      const ok = rec(rest - 2);
      g[a[0]][a[1]] = k; g[b[0]][b[1]] = k;
      if (ok) return true;
      if (n > budget) return false;
    }
    return false;
  };
  return rec(left(g));
}

// 주어진 칸들에 패를 무작위로 놓되, 끝까지 풀리는 배치가 나올 때까지 다시 섞는다
function fill(g, cells, tiles, rng) {
  for (let t = 0; t < 300; t++) {
    shuffled(tiles, rng);
    cells.forEach(([r, c], i) => { g[r][c] = tiles[i]; });
    if (solvable(g.map((row) => row.slice()))) return true;
  }
  return !!findPair(g);
}

// ---- 단계별 난이도 ----
// 처음엔 그림 종류도 패도 적게 시작해서, 단계가 오를수록 늘어난다. 판(10×8) 가운데 rows 줄만 채운다
// (빈 줄은 선이 지나갈 수 있는 길이라 그만큼 쉽다). 8단계부터는 꽉 찬 80칸 · 20종이고, 그 뒤로는 시간이 줄어든다.
const STAGES = [
  { rows: 4, kinds: 6 }, { rows: 5, kinds: 8 }, { rows: 6, kinds: 10 }, { rows: 7, kinds: 12 },
  { rows: 8, kinds: 14 }, { rows: 9, kinds: 16 }, { rows: 10, kinds: 18 }, { rows: 10, kinds: 20 },
];
function stageParams(n) {
  const s = STAGES[Math.min(n, STAGES.length) - 1];
  const tiles = s.rows * COLS;
  // 패 하나당 주는 시간: 3.2초에서 단계마다 0.1초씩 줄어 8단계에 2.5초(200초). 그 뒤로는 단계마다 12초씩 줄어 최소 100초
  const time = n <= STAGES.length ? Math.round(tiles * (3.2 - 0.1 * (n - 1))) : Math.max(100, 200 - (n - STAGES.length) * 12);
  const hints = Math.max(1, 3 - Math.floor((n - 1) / 4));      // 1~4단계 3번, 5~8단계 2번, 9단계부터 1번
  const shuffles = n <= 6 ? 2 : 1;
  return { rows: s.rows, kinds: s.kinds, tiles, time, hints, shuffles };
}
// 남은 시간 1초당 보너스 점수: 10점에서 시작해 단계가 오를수록 커진다 (최대 40점)
const bonusRate = (n) => 10 + 2 * Math.min(n - 1, 15);

// 새 판. opts.rows 줄, opts.kinds 종류 (기본은 꽉 찬 80칸 · 20종). 종류마다 개수는 짝수
function deal(rng = Math.random, opts = {}) {
  const rows = opts.rows || ROWS, kinds = opts.kinds || KINDS;
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
  const top = Math.floor((ROWS - rows) / 2);
  const cells = [], tiles = [];
  for (let r = top; r < top + rows; r++) for (let c = 0; c < COLS; c++) cells.push([r, c]);
  const pairs = cells.length / 2, base = Math.floor(pairs / kinds), extra = pairs % kinds;
  const order = shuffled(Array.from({ length: KINDS }, (_, i) => i), rng).slice(0, kinds);   // 이번 단계에 쓸 그림
  const bonus = new Set(shuffled(Array.from({ length: kinds }, (_, i) => i), rng).slice(0, extra));
  order.forEach((k, i) => { const n = (base + (bonus.has(i) ? 1 : 0)) * 2; for (let j = 0; j < n; j++) tiles.push(k); });
  fill(g, cells, tiles, rng);
  return g;
}

// 이을 짝이 하나도 없으면, 같은 그림 한 쌍을 나란히 붙여서라도 만든다 (자리는 그대로, 패만 서로 바꾼다)
function ensurePair(g) {
  if (findPair(g)) return true;
  const byKind = new Map();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = g[r][c];
    if (k === -1) continue;
    if (!byKind.has(k)) byKind.set(k, []);
    byKind.get(k).push([r, c]);
  }
  for (const cells of byKind.values()) {
    for (const a of cells) for (const b of cells) {
      if (same(a, b)) continue;
      for (const [dr, dc] of DIRS) {
        const n = [a[0] + dr, a[1] + dc];
        if (at(g, n[0], n[1]) === -1 || same(n, b)) continue;
        const t = g[n[0]][n[1]];
        g[n[0]][n[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = t;      // b 자리의 패와 a 옆 패를 맞바꾼다
        if (findPair(g)) return true;
        g[b[0]][b[1]] = g[n[0]][n[1]]; g[n[0]][n[1]] = t;
      }
    }
  }
  return false;
}

// 남은 패만 다시 섞기 (자리는 그대로, 다시 끝까지 풀 수 있게). 이을 짝이 없는 판으로는 절대 끝나지 않는다
function reshuffle(g, rng = Math.random) {
  const cells = [], tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== -1) { cells.push([r, c]); tiles.push(g[r][c]); }
  }
  for (let i = 0; i < 20; i++) {
    const solved = fill(g, cells, tiles, rng);
    if (solved || findPair(g)) return true;
  }
  return ensurePair(g);
}

const LOGIC = { ROWS, COLS, KINDS, STAGES, stageParams, bonusRate, at, path, canMatch, findPair, allPairs, solvable, left, deal, reshuffle, ensurePair };
if (typeof module !== 'undefined') module.exports = LOGIC;
