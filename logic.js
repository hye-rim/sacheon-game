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

// 새 판
function deal(rng = Math.random) {
  const g = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1));
  const cells = [], tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push([r, c]);
  for (let k = 0; k < KINDS; k++) tiles.push(k, k, k, k);
  fill(g, cells, tiles, rng);
  return g;
}

// 남은 패만 다시 섞기 (자리는 그대로, 다시 끝까지 풀 수 있게)
function reshuffle(g, rng = Math.random) {
  const cells = [], tiles = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (g[r][c] !== -1) { cells.push([r, c]); tiles.push(g[r][c]); }
  }
  return fill(g, cells, tiles, rng);
}

const LOGIC = { ROWS, COLS, KINDS, at, path, canMatch, findPair, allPairs, solvable, left, deal, reshuffle };
if (typeof module !== 'undefined') module.exports = LOGIC;
