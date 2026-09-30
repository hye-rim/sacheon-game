'use strict';

// 사천성: 화면·입력·흐름. 판 규칙은 logic.js (LOGIC) 에 있다.
(() => {
const L = LOGIC;
const { ROWS, COLS } = L;

// ---------- 모양 ----------
const W = 400;
const CW = 44, CH = 50;                             // 패 한 칸
const BX = (W - COLS * CW) / 2, BY = 92;            // 판 왼쪽 위
const PAD = 11;                                     // 판 바깥으로 도는 선이 지나는 거리
const H = BY + ROWS * CH + 22;
const INK = '#2b1d52';
const FONT = '"Jua", "Apple SD Gothic Neo", sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const TILES = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝',
               '🐶', '🐱', '🐰', '🐻', '🐼', '🐸', '🐷', '🐵', '🐥', '🐙'];

const COMBO_WINDOW = 4;
const stageTime = (n) => L.stageParams(n).time;      // 단계별 난이도(그림 종류·패 수·시간·힌트)는 logic.js 의 stageParams

// 캔버스 안 버튼 (힌트·섞기)
const BTN = {
  hint: { x: 284, y: 10, w: 52, h: 28, icon: '💡' },
  shuf: { x: 342, y: 10, w: 52, h: 28, icon: '🔀' },
};

// ---------- 캔버스 ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);

function fit() {
  const hudH = 62;
  const scale = Math.min((innerWidth - 24) / W, (innerHeight - 28 - hudH) / H);
  const cssW = Math.floor(W * scale), cssH = Math.floor(H * scale);
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  $('col').style.width = Math.max(cssW, Math.min(innerWidth - 20, 340)) + 'px';
  $('wrap').style.width = cssW + 'px';
  $('wrap').style.margin = '0 auto';
  buildSprites(canvas.width / W);
}
addEventListener('resize', fit);

function roundRect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// 패 그림은 미리 그려 두고 찍는다: 크림색 패 + 아래 두께 + 그림
let sprites = [];
function buildSprites(scale) {
  sprites = TILES.map((e) => {
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(CW * scale); cv.height = Math.ceil(CH * scale);
    const c = cv.getContext('2d');
    c.scale(scale, scale);
    const x = 2, y = 2, w = CW - 4, h = CH - 8;
    c.fillStyle = INK; roundRect(c, x, y + 4, w, h, 9); c.fill();
    c.fillStyle = '#e9c98f'; roundRect(c, x + 1.5, y + 3, w - 3, h, 8); c.fill();
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#fbeed2');
    c.fillStyle = g; roundRect(c, x, y, w, h, 9); c.fill();
    c.lineWidth = 2.2; c.strokeStyle = INK; roundRect(c, x, y, w, h, 9); c.stroke();
    c.font = `27px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    c.fillText(e, CW / 2, y + h / 2 + 1.5);
    return cv;
  });
}

// ---------- 저장·소리 ----------
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
};
let muted = store.get('sacheonMuted') === '1';
let audio = null;
function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
  if (muted) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const t = audio.currentTime, o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
  } catch (_) {}
}
const sfx = {
  pick: () => tone(660, 0.05, 'triangle', 0.08),
  nope: () => tone(190, 0.12, 'square', 0.05, -50),
  match: (n) => { tone(620 + Math.min(n, 10) * 60, 0.08, 'sine', 0.12, 200); setTimeout(() => tone(930 + Math.min(n, 10) * 60, 0.1, 'sine', 0.1), 60); },
  tally: (i, n) => tone(520 + (i / Math.max(1, n)) * 620, 0.06, 'triangle', 0.08),
  hint: () => tone(880, 0.15, 'sine', 0.08, 300),
  shuffle: () => [0, 1, 2, 3].forEach((k) => setTimeout(() => tone(400 + k * 90, 0.05, 'triangle', 0.06), k * 45)),
  tick: () => tone(1000, 0.05, 'square', 0.05),
  clear: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.1), i * 110)),
  end: () => [784, 659, 523, 392].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'triangle', 0.1), i * 140)),
};

// ---------- 상태 ----------
let state = 'title';          // title | play | paused | clear | over
let grid = L.deal(Math.random, L.stageParams(1));
let stage = 1, score = 0, best = Number(store.get('sacheonBest')) || 0;
let sp = L.stageParams(1);                           // 지금 단계의 설정
let time = sp.time, hints = sp.hints, shuffles = sp.shuffles;
let deadT = 0;
let tally = null;                                    // 클리어 후 남은 시간이 점수로 바뀌는 중 { secs, rate, conv, acc, wait }
let combo = 0, maxCombo = 0, lastMatch = -99, matched = 0;
let picked = null;
let links = [];               // 이어진 선 { path, t }
let ghosts = [];              // 사라지는 패 { r, c, k, t }
let shakes = [];              // 안 이어져서 흔들리는 패 { r, c, t }
let particles = [], texts = [], banner = null;
let hint = null, hintT = 0;
let clock = 0;

function startStage() {
  sp = L.stageParams(stage);
  grid = L.deal(Math.random, sp);
  time = sp.time; hints = sp.hints; shuffles = sp.shuffles; tally = null;
  picked = null; links = []; ghosts = []; shakes = []; hint = null; combo = 0; lastMatch = -99;
  banner = { text: `${stage}단계`, sub: `그림 ${sp.kinds}종 · 패 ${sp.tiles}개`, t: 0 };
  state = 'play';
  hideOverlay();
  updateHud();
}
function startGame() {
  stage = 1; score = 0; maxCombo = 0; matched = 0;
  startStage();
}

// 칸 가운데 (판 밖 한 줄은 판 가장자리에서 PAD 만큼 떨어진 곳)
const cx = (c) => (c < 0 ? BX - PAD : c >= COLS ? BX + COLS * CW + PAD : BX + (c + 0.5) * CW);
const cy = (r) => (r < 0 ? BY - PAD : r >= ROWS ? BY + ROWS * CH + PAD : BY + (r + 0.5) * CH - 3);

// ---------- 흐름 ----------
function tapCell(r, c) {
  if (grid[r][c] === -1) { picked = null; return; }
  if (!picked) { picked = [r, c]; sfx.pick(); return; }
  if (picked[0] === r && picked[1] === c) { picked = null; return; }
  const a = picked, b = [r, c];
  if (grid[a[0]][a[1]] !== grid[r][c]) { picked = b; sfx.pick(); return; }
  const p = L.path(grid, a, b);
  if (!p) {
    // 같은 그림인데 길이 없다
    shakes.push({ r: a[0], c: a[1], t: 0 }, { r, c, t: 0 });
    picked = null;
    sfx.nope();
    return;
  }
  match(a, b, p);
}

function match(a, b, p) {
  const k = grid[a[0]][a[1]];
  grid[a[0]][a[1]] = -1; grid[b[0]][b[1]] = -1;
  picked = null; hint = null;
  links.push({ path: p, t: 0 });
  ghosts.push({ r: a[0], c: a[1], k, t: 0 }, { r: b[0], c: b[1], k, t: 0 });
  combo = clock - lastMatch <= COMBO_WINDOW ? combo + 1 : 1;
  lastMatch = clock;
  maxCombo = Math.max(maxCombo, combo);
  matched++;
  const gain = 100 + Math.min(combo - 1, 10) * 20;   // 콤보 보너스는 +200 까지
  addScore(gain);
  const mx = (cx(a[1]) + cx(b[1])) / 2, my = (cy(a[0]) + cy(b[0])) / 2;
  texts.push({ text: `+${gain}`, x: mx, y: my, t: 0, big: combo >= 5 });
  if (combo >= 3) banner = { text: `${combo} 콤보!`, t: 0, small: true };
  for (const q of [a, b]) {
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2, s = 60 + Math.random() * 120;
      particles.push({ x: cx(q[1]), y: cy(q[0]), vx: Math.cos(ang) * s, vy: Math.sin(ang) * s - 60, life: 0.55, col: ['#ffd23f', '#ff5fa2', '#7ee39a', '#8fd3ff'][i % 4] });
    }
  }
  sfx.match(combo);

  if (L.left(grid) === 0) return stageClear();
  ensureMoves();
}

// 더 이을 수 있는 짝이 없으면 (직접 섞은 뒤든, 짝을 깬 뒤든 언제나) 공짜로 자동으로 다시 섞어 준다. 섞기 횟수는 쓰지 않는다.
function ensureMoves() {
  if (state !== 'play' || L.left(grid) === 0 || L.findPair(grid)) return false;
  for (let i = 0; i < 6 && !L.findPair(grid); i++) L.reshuffle(grid);
  picked = null; hint = null;
  banner = { text: '막혔어요! 섞는 중', t: 0, small: true };
  sfx.shuffle();
  return true;
}

function addScore(n) {
  score += n;
  if (score > best) { best = score; store.set('sacheonBest', String(best)); }
  updateHud();
}

function useHint() {
  if (state !== 'play' || hints <= 0 || hint) return;
  const p = L.findPair(grid);
  if (!p) return;
  hints--; hint = p; hintT = 0; picked = null;
  sfx.hint();
}
function useShuffle() {
  if (state !== 'play' || shuffles <= 0) return;
  shuffles--; picked = null; hint = null;
  L.reshuffle(grid);
  banner = { text: '섞기!', t: 0, small: true };
  sfx.shuffle();
  ensureMoves();                       // 섞고 났더니 이을 짝이 없으면 바로 한 번 더
}

function stageClear() {
  state = 'clear';
  picked = null; hint = null;
  // 남은 시간은 1초당 점수로 바뀐다 (단계가 오를수록 1초의 값이 커진다). 바뀌는 모습이 화면에 보이게 하나씩 센다.
  const secs = Math.ceil(time), rate = L.bonusRate(stage);
  tally = { secs, rate, conv: 0, acc: 0, wait: 0.5 };
  time = secs;
  sfx.clear();
}
// 환산 중에 화면을 누르거나 Space·Enter 를 누르면 남은 만큼 한 번에 더하고 결과 창으로
function skipTally() {
  if (state !== 'clear' || !tally || tally.shown) return;
  const rest = tally.secs - tally.conv;
  if (rest > 0) addScore(rest * tally.rate);
  tally.conv = tally.secs; time = 0; tally.shown = true;
  showClearOverlay();
}
// 환산이 끝난 뒤 결과 창
function showClearOverlay() {
  const t = tally, nx = L.stageParams(stage + 1);
  showOverlay(`
    <h2 class="inked">${stage}단계 클리어!</h2>
    <div class="big inked">${score.toLocaleString()}</div>
    <span class="tag">⏱ 남은 ${t.secs}초 × ${t.rate}점 = +${(t.secs * t.rate).toLocaleString()}</span>
    <div class="card"><dl class="stats">
      <dt>최대 콤보</dt><dd>${maxCombo}</dd>
      <dt>다음 단계</dt><dd>그림 ${nx.kinds}종 · 패 ${nx.tiles}개</dd>
      <dt>주어지는 시간</dt><dd>${nx.time}초</dd>
      <dt>힌트 · 섞기</dt><dd>${nx.hints}번 · ${nx.shuffles}번</dd>
    </dl></div>
    <button id="startBtn">다음 단계</button>`);
}

function gameOver() {
  state = 'over';
  picked = null; hint = null;
  sfx.end();
  const isBest = score >= best && score > 0;
  setTimeout(() => showOverlay(`
    <h2 class="inked">시간 끝!</h2>
    <div class="big inked">${score.toLocaleString()}</div>
    <span class="tag">${isBest ? '🏆 최고 기록!' : `최고 기록 ${best.toLocaleString()}`}</span>
    <div class="card"><dl class="stats">
      <dt>도달한 단계</dt><dd>${stage}단계</dd>
      <dt>남은 패</dt><dd>${L.left(grid)}개</dd>
      <dt>이은 짝</dt><dd>${matched}쌍</dd>
      <dt>최대 콤보</dt><dd>${maxCombo}</dd>
    </dl></div>
    <button id="startBtn">한 번 더</button>`), 600);
}

function update(dt) {
  clock += dt;
  for (const p of particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; }
  particles = particles.filter((p) => p.life > 0);
  for (const t of texts) { t.t += dt; t.y -= 30 * dt; }
  texts = texts.filter((t) => t.t < 0.9);
  for (const l of links) l.t += dt;
  links = links.filter((l) => l.t < 0.35);
  for (const g of ghosts) g.t += dt;
  ghosts = ghosts.filter((g) => g.t < 0.3);
  for (const s of shakes) s.t += dt;
  shakes = shakes.filter((s) => s.t < 0.35);
  if (banner) { banner.t += dt; if (banner.t > 1.2) banner = null; }
  if (state === 'clear' && tally) {
    if (tally.wait > 0) tally.wait -= dt;
    else if (tally.conv < tally.secs) {
      // 1.5초 안에 끝나도록 (남은 시간이 길수록 빨리 센다). 센 만큼 시간 막대가 줄고 점수가 오른다
      tally.acc += dt * Math.max(14, tally.secs / 1.5);
      while (tally.acc >= 1 && tally.conv < tally.secs) {
        tally.acc -= 1; tally.conv++;
        time = tally.secs - tally.conv;
        addScore(tally.rate);
        sfx.tally(tally.conv, tally.secs);
        if (tally.conv % 5 === 0) particles.push({ x: 254, y: 24, vx: (Math.random() - 0.5) * 80, vy: -60, life: 0.5, col: '#ffd23f' });
      }
      if (tally.conv >= tally.secs) tally.wait = 0.6;
    } else if (!tally.shown) { tally.shown = true; showClearOverlay(); }
  }
  if (state !== 'play') return;

  const prev = Math.ceil(time);
  time = Math.max(0, time - dt);
  if (time < 10 && Math.ceil(time) < prev && time > 0) sfx.tick();
  if (clock - lastMatch > COMBO_WINDOW) combo = 0;
  if (hint) { hintT += dt; if (hintT > 4) hint = null; }
  deadT += dt;
  if (deadT > 0.5) { deadT = 0; ensureMoves(); }       // 혹시 막혀 있으면 반 초 안에 알아서 섞는다
  if (time <= 0) gameOver();
}

// ---------- 그리기 ----------
function label(text, x, y, size, fill = '#fff', align = 'center') {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size * 0.22); ctx.strokeStyle = INK; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
function panel(x, y, w, h, r, fill, lift = 4) {
  ctx.fillStyle = INK; roundRect(ctx, x, y + lift, w, h, r); ctx.fill();
  ctx.fillStyle = fill; roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; roundRect(ctx, x, y, w, h, r); ctx.stroke();
}
function drawButton(b, count) {
  const off = count <= 0;
  panel(b.x, b.y, b.w, b.h, 10, off ? '#d9d3ea' : '#ffd23f', 3);
  ctx.globalAlpha = off ? 0.45 : 1;
  ctx.font = `16px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
  ctx.fillText(b.icon, b.x + 17, b.y + b.h / 2 + 1);
  ctx.globalAlpha = 1;
  label(String(count), b.x + b.w - 14, b.y + b.h / 2 + 1, 16, off ? '#b5acd0' : '#fff');
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // 시간 막대
  const total = sp.time;
  panel(6, 10, 270, 28, 14, '#ffffff', 4);
  const tr = time / total, low = time < 15;
  const g = ctx.createLinearGradient(0, 13, 0, 35);
  g.addColorStop(0, low ? '#ff8a8a' : '#7dffb0'); g.addColorStop(1, low ? '#ff3b5c' : '#1fc46b');
  ctx.fillStyle = g; roundRect(ctx, 9, 13, Math.max(18, 264 * tr), 22, 11); ctx.fill();
  ctx.font = `17px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText('⏰', 23, 24);
  label(`${Math.ceil(time)}`, 254, 24, 17, low && Math.sin(clock * 12) > 0 ? '#ff3b5c' : '#fff');
  drawButton(BTN.hint, hints);
  drawButton(BTN.shuf, shuffles);

  // 단계 · 남은 패 · 콤보
  label(`${stage}단계`, 10, 62, 18, '#ffd23f', 'left');
  label(`그림 ${sp.kinds}종`, 76, 62, 13, '#ffe9a0', 'left');
  label(`남은 패 ${L.left(grid)}`, W - 10, 62, 16, '#fff', 'right');
  if (combo >= 2) label(`${combo} 콤보`, W / 2, 62, 18, '#ff9ecb');

  // 판
  const bw = COLS * CW, bh = ROWS * CH;
  ctx.fillStyle = 'rgba(43,29,82,.28)'; roundRect(ctx, BX - 20, BY - 18, bw + 40, bh + 34, 20); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([6, 6]);
  roundRect(ctx, BX - PAD, BY - PAD, bw + PAD * 2, bh + PAD * 2 - 4, 12); ctx.stroke();
  ctx.setLineDash([]);

  // 패: 위 줄부터 그려야 아래 패의 두께가 자연스럽게 겹친다
  const hintOn = hint && Math.sin(hintT * 10) > -0.3;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = grid[r][c];
    if (k === -1) continue;
    let x = BX + c * CW, y = BY + r * CH;
    const sel = picked && picked[0] === r && picked[1] === c;
    const sh = shakes.find((s) => s.r === r && s.c === c);
    if (sh) x += Math.sin(sh.t * 60) * 4 * (1 - sh.t / 0.35);
    if (sel) y -= 4;
    ctx.drawImage(sprites[k], x, y, CW, CH);
    const isHint = hintOn && ((hint.a[0] === r && hint.a[1] === c) || (hint.b[0] === r && hint.b[1] === c));
    if (sel || isHint) {
      ctx.lineWidth = 4; ctx.strokeStyle = sel ? '#ffd23f' : '#ff5fa2';
      roundRect(ctx, x + 1, y + 1, CW - 2, CH - 7, 10); ctx.stroke();
    }
  }
  // 사라지는 패
  for (const gh of ghosts) {
    const k = gh.t / 0.3;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    ctx.translate(BX + (gh.c + 0.5) * CW, BY + (gh.r + 0.5) * CH);
    ctx.scale(1 + k * 0.3, 1 + k * 0.3);
    ctx.drawImage(sprites[gh.k], -CW / 2, -CH / 2, CW, CH);
    ctx.restore();
  }
  // 이은 선: 진한 테두리 + 노란 선
  for (const l of links) {
    ctx.globalAlpha = Math.min(1, (0.35 - l.t) * 6);
    for (const [w, col] of [[9, INK], [4.5, '#ffd23f']]) {
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      l.path.forEach(([r, c], i) => (i ? ctx.lineTo(cx(c), cy(r)) : ctx.moveTo(cx(c), cy(r))));
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x, p.y + 1, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of texts) {
    ctx.globalAlpha = Math.min(1, (0.9 - t.t) * 3);
    label(t.text, t.x, t.y, t.big ? 24 : 18, t.big ? '#ffd23f' : '#fff');
  }
  ctx.globalAlpha = 1;
  if (banner && state === 'play') {
    const s = 1 + Math.max(0, 0.25 - banner.t) * 1.6;
    ctx.save(); ctx.globalAlpha = Math.min(1, (1.2 - banner.t) * 3);
    ctx.translate(W / 2, BY + ROWS * CH / 2); ctx.scale(s, s);
    label(banner.text, 0, banner.sub ? -14 : 0, banner.small ? 30 : 46, '#ffd23f');
    if (banner.sub) label(banner.sub, 0, 30, 17, '#fff');
    ctx.restore();
  }
  // 클리어 뒤 남은 시간이 점수로 바뀌는 중
  if (state === 'clear' && tally) {
    const gain = tally.conv * tally.rate;
    ctx.save(); ctx.translate(W / 2, BY + ROWS * CH / 2);
    ctx.fillStyle = 'rgba(43,29,82,.72)'; roundRect(ctx, -150, -62, 300, 124, 24); ctx.fill();
    label('시간 → 점수!', 0, -36, 22, '#fff');
    label(`+${gain.toLocaleString()}`, 0, 6, 46, '#ffd23f');
    label(`남은 ${tally.secs - tally.conv}초 × ${tally.rate}점`, 0, 44, 16, '#ffe9a0');
    ctx.restore();
  }
}

function updateHud() {
  $('score').textContent = score.toLocaleString();
  $('best').textContent = best.toLocaleString();
}

// ---------- 루프 ----------
let last = performance.now();
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  if (state !== 'paused') update(dt);
  draw();
  requestAnimationFrame(frame);
}

// ---------- 오버레이 ----------
function showOverlay(html) {
  const o = $('overlay'); o.innerHTML = html; o.classList.remove('hidden');
  const b = $('startBtn'); if (b) b.onclick = onOverlayButton;
}
function hideOverlay() { $('overlay').classList.add('hidden'); }
function onOverlayButton() {
  if (state === 'paused') resume();
  else if (state === 'clear') { stage++; startStage(); }
  else startGame();
}
function pause() {
  if (state !== 'play') return;
  state = 'paused';
  showOverlay(`<h2 class="inked">일시정지</h2><button id="startBtn">계속하기</button>`);
}
function resume() { if (state !== 'paused') return; state = 'play'; hideOverlay(); }

// ---------- 입력 ----------
// 누르는 순간 바로 고른다 (떼기를 기다리지 않아서 아이폰에서 탭이 씹히지 않는다)
function toLogical(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (W / rect.width), y: (e.clientY - rect.top) * (H / rect.height) };
}
const hitBtn = (b, p) => p.x >= b.x - 3 && p.x <= b.x + b.w + 3 && p.y >= b.y - 4 && p.y <= b.y + b.h + 6;
canvas.addEventListener('pointerdown', (e) => {
  if (state === 'clear') return skipTally();
  if (state !== 'play') return;
  const p = toLogical(e);
  if (hitBtn(BTN.hint, p)) return useHint();
  if (hitBtn(BTN.shuf, p)) return useShuffle();
  const c = Math.floor((p.x - BX) / CW), r = Math.floor((p.y - BY) / CH);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) tapCell(r, c);
  else picked = null;
});
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });

addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') state === 'paused' ? resume() : pause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'KeyH') useHint();
  if (e.code === 'KeyS') useShuffle();
  if ((e.code === 'Enter' || e.code === 'Space') && state === 'clear' && tally && !tally.shown) { e.preventDefault(); skipTally(); return; }
  if ((e.code === 'Enter' || e.code === 'Space') && !$('overlay').classList.contains('hidden')) { e.preventDefault(); onOverlayButton(); }
});
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

function toggleMute() {
  muted = !muted;
  store.set('sacheonMuted', muted ? '1' : '0');
  $('muteBtn').textContent = muted ? '🔇' : '🔊';
}
$('muteBtn').onclick = (e) => { e.currentTarget.blur(); toggleMute(); };
$('pauseBtn').onclick = (e) => { e.currentTarget.blur(); state === 'paused' ? resume() : pause(); };
$('startBtn').onclick = onOverlayButton;
$('muteBtn').textContent = muted ? '🔇' : '🔊';

updateHud();
fit();
requestAnimationFrame(frame);

// 테스트용
window.__sc = { get grid() { return grid; }, get state() { return state; }, get score() { return score; }, get stage() { return stage; },
  get picked() { return picked; }, get time() { return time; }, get tally() { return tally; }, get sp() { return sp; }, skipTally, ensureMoves, tapCell, update, draw, startGame, onOverlayButton, useHint, useShuffle, BX, BY, CW, CH, W, H };
})();
