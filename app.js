/* AImers — AI 개념 92 퀴즈 */
(function () {
'use strict';

var C = window.CONCEPTS, E = window.Engine;
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var SEC = { LA: '선형대수', ML: '머신러닝', ST: '통계' };

/* ── 저장소 ──────────────────────────────────────────
   사파리 쿠키 차단 시 localStorage 접근 자체가 던진다. 쿼터 초과도 있다.
   ITP 때문에 7일 미접속이면 통째로 지워진다 — 막을 방법이 없으므로 안내만 한다. */
var store = (function () {
  var ok = false, mem = {};
  try { localStorage.setItem('__p', '1'); localStorage.removeItem('__p'); ok = true; } catch (e) {}
  return {
    ok: ok,
    get: function (k) { try { return ok ? localStorage.getItem(k) : (mem[k] || null); } catch (e) { return mem[k] || null; } },
    set: function (k, v) { try { ok ? localStorage.setItem(k, v) : (mem[k] = v); } catch (e) { ok = false; mem[k] = v; } }
  };
})();
var KEY = 'aimers.v1';
var DB = (function () {
  try { return JSON.parse(store.get(KEY)) || {}; } catch (e) { return {}; }
})();
DB.items = DB.items || {};
DB.plays = DB.plays || 0;
DB.cfg = DB.cfg || {};
DB.aliases = DB.aliases || {};
function save() { try { store.set(KEY, JSON.stringify(DB)); } catch (e) {} }
function rec(i) { return DB.items[i] || null; }

/* ── 항목 준비 ───────────────────────────────────── */
C.forEach(function (x) { x.i = x.i; });
var ALIAS_INDEX = E.buildIndex(C);

/* ── 화면 ────────────────────────────────────────── */
function show(id) {
  $$('.screen').forEach(function (s) { s.classList.remove('on'); });
  $('#s-' + id).classList.add('on');
  window.scrollTo(0, 0);
}
$$('[data-back]').forEach(function (b) {
  b.addEventListener('click', function () { show(b.dataset.back); });
});

/* ── 테마 ────────────────────────────────────────── */
if (DB.cfg.theme) document.documentElement.dataset.theme = DB.cfg.theme;
$('#themeBtn').addEventListener('click', function () {
  var cur = document.documentElement.dataset.theme;
  var next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
  if (next) document.documentElement.dataset.theme = next;
  else delete document.documentElement.dataset.theme;
  DB.cfg.theme = next; save();
});

/* ── 키보드: iOS 는 키보드가 떠도 레이아웃 뷰포트를 줄이지 않는다.
      visualViewport 로 직접 재어 하단 바를 올린다. ── */
if (window.visualViewport) {
  var vv = window.visualViewport;
  var sync = function () {
    var kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', kb + 'px');
    document.body.classList.toggle('kbd-tight', kb > 120);
  };
  vv.addEventListener('resize', sync);
  vv.addEventListener('scroll', sync);
}

/* ══════════ 로비 ══════════ */
var cfg = {
  mode: DB.cfg.mode || 1,
  sub: DB.cfg.sub || 'mc',
  secs: DB.cfg.secs || [],
  filter: DB.cfg.filter || '',
  len: DB.cfg.len == null ? 15 : DB.cfg.len
};

function press(el, on) { el.setAttribute('aria-pressed', on ? 'true' : 'false'); }

function eligible(x, mode, sub) {
  if (x.modes.indexOf(mode) === -1) return false;
  if (mode === 1 && sub === 'sa' && !x.sub) return false;
  return true;
}
function pool() {
  return C.filter(function (x) {
    if (!eligible(x, cfg.mode, cfg.sub)) return false;
    if (cfg.secs.length && cfg.secs.indexOf(x.section) === -1) return false;
    var r = rec(x.i);
    if (cfg.filter === 'wrong') return !!r && r.wrong > 0;
    if (cfg.filter === 'unseen') return !r;
    return true;
  });
}

function paintLobby() {
  $$('.modecard').forEach(function (m) { press(m, +m.dataset.mode === cfg.mode); });
  $$('#m1sub .chip').forEach(function (c) { press(c, c.dataset.sub === cfg.sub); });
  $$('#scopeChips .chip').forEach(function (c) { press(c, cfg.secs.indexOf(c.dataset.sec) >= 0); });
  $$('#filterChips .chip').forEach(function (c) { press(c, cfg.filter === c.dataset.filter); });
  $$('#lenChips .chip').forEach(function (c) { press(c, +c.dataset.len === cfg.len); });

  var n = pool().length;
  var wrong = C.filter(function (x) { var r = rec(x.i); return r && r.wrong > 0; }).length;
  var unseen = C.filter(function (x) { return !rec(x.i); }).length;
  $('#cWrong').textContent = wrong;
  $('#cUnseen').textContent = unseen;

  var enough = n >= 4;
  $('#startBtn').disabled = !enough;
  $('#startBtn').textContent = enough
    ? '시작 — ' + (cfg.len === 0 ? n : Math.min(cfg.len, n)) + '문제'
    : '시작';
  $('#poolNote').textContent = enough
    ? '출제 가능 ' + n + '개 · 순서와 보기는 매판 무작위'
    : '이 조건은 ' + n + '개뿐입니다. 보기 4개를 만들려면 최소 4개가 필요합니다.';

  DB.cfg = cfg; save();
}

$$('.modecard').forEach(function (m) {
  var pick = function (e) {
    if (e.target.closest('.subchips')) return;
    cfg.mode = +m.dataset.mode; paintLobby();
  };
  m.addEventListener('click', pick);
  m.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); }
  });
});
$$('#m1sub .chip').forEach(function (c) {
  c.addEventListener('click', function (e) {
    e.stopPropagation(); cfg.mode = 1; cfg.sub = c.dataset.sub; paintLobby();
  });
});
$$('#scopeChips .chip').forEach(function (c) {
  c.addEventListener('click', function () {
    var s = c.dataset.sec, k = cfg.secs.indexOf(s);
    k >= 0 ? cfg.secs.splice(k, 1) : cfg.secs.push(s);
    paintLobby();
  });
});
$$('#filterChips .chip').forEach(function (c) {
  c.addEventListener('click', function () {
    cfg.filter = cfg.filter === c.dataset.filter ? '' : c.dataset.filter;
    paintLobby();
  });
});
$$('#lenChips .chip').forEach(function (c) {
  c.addEventListener('click', function () { cfg.len = +c.dataset.len; paintLobby(); });
});
$('#vocabBtn').addEventListener('click', function () { show('vocab'); paintVocab(); });
$('#startBtn').addEventListener('click', startSession);

if (!store.ok) {
  $('#lobbySub').textContent = '진행이 저장되지 않습니다 (브라우저 저장소 차단)';
}

/* ══════════ 단어장 ══════════ */
var vState = { q: '', f: 'all', open: {} };

function norm(s) { return E.norm(s); }

function score(x, q) {
  /* term·한글용어는 ×3, 정의 본문은 ×1. 수식은 노이즈라 제외.
     앞에서부터 걸린 쪽을 올려야 'bayes' 에 Bayes' theorem 이 1위로 온다. */
  var nq = norm(q), s = 0;
  if (!nq) return 1;
  var nt = norm(x.term);
  if (nt.indexOf(nq) >= 0) s += 3;
  if (nt.indexOf(nq) === 0) s += 3;
  if (new RegExp('\\b' + nq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(nt)) s += 2;
  if (nt === nq) s += 4;
  if ((x.ko || '').toLowerCase().indexOf(q.toLowerCase()) >= 0) s += 3;
  if ((x.ko || '').toLowerCase().indexOf(q.toLowerCase()) === 0) s += 2;
  if (x.defEn.join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0) s += 1;
  if (x.defKo.join(' ').toLowerCase().indexOf(q.toLowerCase()) >= 0) s += 1;
  return s;
}

function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
function hl(s, q) {
  if (!q) return esc(s);
  var i = s.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(s);
  return esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
}

function paintVocab() {
  var q = vState.q.trim(), f = vState.f;
  var list = C.filter(function (x) {
    var r = rec(x.i);
    if (f === 'wrong' && !(r && r.wrong > 0)) return false;
    if (f === 'unseen' && r) return false;
    if (f === 'LA' || f === 'ML' || f === 'ST') { if (x.section !== f) return false; }
    return !q || score(x, q) > 0;
  });
  if (q) list.sort(function (a, b) { return score(b, q) - score(a, q); });

  $('#vCount').textContent = list.length;
  $('#vEmpty').hidden = list.length > 0;
  $('#vClear').hidden = !vState.q;

  var html = '', lastSec = null;
  list.forEach(function (x) {
    if (!q && x.section !== lastSec) {
      lastSec = x.section;
      html += '<div class="sechead"><span>' + SEC[x.section] + '</span></div>';
    }
    var r = rec(x.i);
    var badge = r
      ? '<span class="badge ' + (r.wrong > 0 ? 'w' : 'g') + '">' + r.right + '·' + r.wrong + '</span>'
      : '';
    var open = vState.open[x.i];
    html += '<button class="vrow' + (open ? ' open' : '') + '" data-v="' + x.i + '">' +
      '<div class="top"><div><div class="t">' + hl(x.term, q) + '</div>' +
      '<div class="k">' + hl(x.ko || '', q) + '</div></div>' + badge + '</div>' +
      '<div class="vbody">' +
        x.defEn.map(function (d) { return '<p>' + hl(d, q) + '</p>'; }).join('') +
        '<div class="sep"></div>' +
        x.defKo.filter(Boolean).map(function (d) { return '<p class="k">' + hl(d, q) + '</p>'; }).join('') +
        (x.extras || []).map(function (e) {
          return '<div class="math">' + esc(e.lines.join('\n')) + '</div>';
        }).join('') +
      '</div></button>';
  });
  $('#vList').innerHTML = html;
}

var vRaf = 0;
$('#vSearch').addEventListener('input', function (e) {
  vState.q = e.target.value;
  /* 92개엔 300ms 디바운스가 과하다. rAF 한 프레임으로 합친다. */
  if (vRaf) cancelAnimationFrame(vRaf);
  vRaf = requestAnimationFrame(paintVocab);
});
$('#vClear').addEventListener('click', function () {
  vState.q = ''; $('#vSearch').value = ''; paintVocab();
});
$$('#vFilter .chip').forEach(function (c) {
  c.addEventListener('click', function () {
    vState.f = c.dataset.vf;
    $$('#vFilter .chip').forEach(function (o) { press(o, o === c); });
    paintVocab();
  });
});
$('#vList').addEventListener('click', function (e) {
  var row = e.target.closest('[data-v]');
  if (!row) return;
  var i = +row.dataset.v;
  vState.open[i] = !vState.open[i];
  row.classList.toggle('open', vState.open[i]);
});

/* ══════════ 퀴즈 ══════════ */
var S = null;

function startSession() {
  var p = pool();
  if (p.length < 4) return;
  var len = cfg.len === 0 ? p.length : Math.min(cfg.len, p.length);
  var q = deClump(p, len);
  S = {
    queue: q, cur: 0, earned: 0, possible: 0, combo: 0, maxCombo: 0,
    ok: 0, no: 0, answers: [], retried: {}, retryCount: 0,
    recent: [], startAt: Date.now()
  };
  show('quiz');
  render();
}

/* ML 이 49/92라 가만두면 한 섹션이 몰린다. 4연속 없는 셔플이 나올 때까지 다시 뽑는다.
   국소 스왑은 고친 자리 옆에 새 뭉침을 만들어서 안 된다. */
function hasClump(q) {
  for (var i = 3; i < q.length; i++) {
    var s = C[q[i]].section;
    if (s === C[q[i - 1]].section && s === C[q[i - 2]].section && s === C[q[i - 3]].section) return true;
  }
  return false;
}
function deClump(p, len) {
  var q = E.buildQueue(p, len);
  for (var n = 0; n < 40 && hasClump(q); n++) q = E.buildQueue(p, len);
  return q;
}

function item() { return C[S.queue[S.cur]]; }
function isRetry() { return !!S.retried[S.queue[S.cur]]; }

function paintHud() {
  $('#progBar').style.transform = 'scaleX(' + (S.cur / S.queue.length) + ')';
  $('#qCount').textContent = (S.cur + 1) + ' / ' + S.queue.length;
  $('#tO').textContent = S.ok;
  $('#tX').textContent = S.no;
}

function modeFor(x) {
  if (cfg.mode !== 1) return cfg.mode;
  if (cfg.sub === 'mc') return '1mc';
  if (cfg.sub === 'sa') return x.sub ? '1sa' : '1mc';
  /* 섞기: 주관식 우세 6:4. 주관식 불가 항목은 강제 객관식. */
  return x.sub && Math.random() < 0.6 ? '1sa' : '1mc';
}

function render() {
  if (S.cur >= S.queue.length) return finish();
  paintHud();
  var x = item(), m = modeFor(x);
  S.curMode = m;
  $('#qScroll').scrollTop = 0;
  if (m === '1mc') renderM1mc(x);
  else if (m === '1sa') renderM1sa(x);
  else if (m === 2) renderM2(x);
  else renderM3(x);
}

function optionsFor(x, needDef, allowFoes) {
  var ids = E.distractors(C, x, 3, { needDef: !!needDef, allowSubstrFoes: !!allowFoes });
  return E.shuffle(ids.concat([x.i]));
}

function explainHtml(x, extra) {
  return '<div class="explain">' + (extra || '') +
    '<h3>' + esc(x.term) + '</h3>' +
    '<div class="ko">' + esc(x.ko || '') + '</div>' +
    x.defEn.map(function (d) { return '<p>' + esc(d) + '</p>'; }).join('') +
    '<div class="sep"></div>' +
    x.defKo.filter(Boolean).map(function (d) { return '<p class="k">' + esc(d) + '</p>'; }).join('') +
    (x.extras || []).map(function (e) {
      return '<div class="math">' + esc(e.lines.join('\n')) + '</div>';
    }).join('') +
    '</div>';
}

function nextBar(label) {
  $('#qBar').innerHTML = '<button class="btn" id="nextBtn">' + (label || '다음') + '</button>';
  $('#nextBtn').addEventListener('click', advance);
}

/* ── 모드1 객관식: 정의 → 용어 ── */
function renderM1mc(x) {
  /* 단어가 정답이면 부분문자열 오답(entropy ⊂ cross-entropy)이 오히려 좋은 오답이다 */
  var ids = E.shuffle(E.distractors(C, x, 3, { allowSubstrFoes: true, needMode: 1 }).concat([x.i]));
  $('#qScroll').innerHTML =
    '<div class="stem"><div class="cap">정의</div>' +
      '<div class="stem-en">' + esc(x.quizDef) + '</div>' +
      '<div class="stem-ko" id="koHint" hidden>' + esc(x.quizKo) + '</div></div>' +
    '<div class="opts" id="opts">' + ids.map(function (i) {
      return '<button class="opt" data-i="' + i + '"><span class="txt"><span class="opt-term">' +
        esc(C[i].term) + '</span></span><span class="mark"></span></button>';
    }).join('') + '</div>';
  $('#qBar').innerHTML = '<div class="row2"><button class="btn ghost" id="koBtn">한글 뜻</button>' +
    '<button class="btn ghost" id="skipBtn">모르겠다</button></div>';
  $('#koBtn').addEventListener('click', function () { $('#koHint').hidden = !$('#koHint').hidden; });
  $('#skipBtn').addEventListener('click', function () { judgeChoice(x, -1, ids); });
  bindOpts(function (i) { judgeChoice(x, i, ids); });
}

/* ── 모드2 객관식: 용어 → 정의 ── */
function renderM2(x) {
  var ids = optionsFor(x, true, false);   /* 뜻이 정답이면 부분문자열 관계는 빼야 공정하다 */
  var paren = x.term.match(/\(([^)]*)\)/);
  /* 질문형 항목은 영어 term 이 물음 문장이라 제목으로 못 쓴다. 한글 질문을 쓴다. */
  var head = x.isQ
    ? '<div class="stem-q">' + esc(x.ko || x.term) + '</div>'
    : '<div class="stem-term">' + esc(x.term.replace(/\s*\([^)]*\)/, '')) + '</div>' +
      (paren ? '<div class="stem-sub">' + esc(paren[1]) + '</div>' : '');
  $('#qScroll').innerHTML =
    '<div class="stem"><div class="cap">' + SEC[x.section] + '</div>' + head +
      '<div class="stem-ko" id="koHint" hidden>' + esc(x.isQ ? x.term : (x.ko || '')) + '</div></div>' +
    /* 보기는 접두를 뗀 술어구로 통일한다. 'A ____ is …' 가 4개 쌓이면 읽을 수 없다. */
    '<div class="opts" id="opts" style="--clamp:4">' + ids.map(function (i) {
      return '<button class="opt" data-i="' + i + '"><span class="txt"><span class="opt-def" ' +
        'data-full="' + esc(C[i].optFull) + '">' + esc(C[i].optDef) +
        '</span></span><span class="mark"></span></button>';
    }).join('') + '</div>';
  $('#qBar').innerHTML = '<button class="btn ghost" id="koBtn">한글 용어 보기</button>';
  $('#koBtn').addEventListener('click', function () { $('#koHint').hidden = !$('#koHint').hidden; });
  bindOpts(function (i) { judgeChoice(x, i, ids); });
  markClipped();
}

/* 감춰진 게 있는 보기에 '꾹 눌러 전체 보기' 를 붙인다.
   감춰진 것 = 4줄 클램프에 잘린 부분 + 첫 문장만 쓰느라 떼어낸 뒷문장. */
function markClipped() {
  requestAnimationFrame(function () {
    $$('#opts .opt').forEach(function (b) {
      var t = $('.opt-def', b);
      if (!t) return;
      var full = t.dataset.full || '';
      var hidden = (t.scrollHeight - t.clientHeight > 2) || (full && full !== t.textContent);
      if (!hidden) return;
      b.classList.add('clip');
      if (!$('.more', b)) {
        var m = document.createElement('div');
        m.className = 'more';
        m.textContent = '꾹 눌러 전체 보기';
        t.parentNode.appendChild(m);
      }
    });
  });
}

function peekOn(b) {
  var t = $('.opt-def', b);
  if (t && t.dataset.full && !t.dataset.short) {
    t.dataset.short = t.textContent;
    t.textContent = t.dataset.full;
  }
  b.classList.add('peek');
}

/* 길게 누르면 선택하지 않고 펼치기만 한다.
   iOS 는 롱프레스에 텍스트 선택 핸들을 띄우므로 .opt 에 -webkit-touch-callout:none 이 걸려 있다. */
function bindOpts(cb) {
  var box = $('#opts'), timer = null, held = false, target = null;

  var start = function (e) {
    var b = e.target.closest('.opt');
    if (!b || box.classList.contains('done')) return;
    target = b; held = false;
    clearTimeout(timer);
    timer = setTimeout(function () {
      held = true;
      peekOn(b);
      $('.more', b) && ($('.more', b).textContent = '놓으면 선택 안 함');
      b.classList.remove('peeking');
    }, 350);
    b.classList.add('peeking');
  };
  var cancel = function () {
    clearTimeout(timer);
    if (target) target.classList.remove('peeking');
  };
  box.addEventListener('pointerdown', start);
  box.addEventListener('pointerup', cancel);
  box.addEventListener('pointercancel', cancel);
  box.addEventListener('pointerleave', cancel);
  box.addEventListener('pointermove', function (e) {
    /* 스크롤하려고 끌면 롱프레스가 아니다 */
    if (timer && (Math.abs(e.movementX) > 3 || Math.abs(e.movementY) > 3)) cancel();
  });
  box.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  box.addEventListener('click', function (e) {
    var b = e.target.closest('.opt');
    if (!b || box.classList.contains('done')) return;
    if (held) { held = false; return; }   /* 길게 누른 것은 선택으로 치지 않는다 */
    cb(+b.dataset.i);
  });
}

function judgeChoice(x, picked, ids) {
  var correct = picked === x.i;
  $('#opts').classList.add('done');
  $$('#opts .opt').forEach(function (b) {
    var i = +b.dataset.i;
    /* 정답과 내가 고른 것은 끝까지 펼쳐 준다. 읽어야 외워진다. */
    if (i === x.i) { b.classList.add(correct ? 'ok' : 'reveal'); peekOn(b); $('.mark', b).textContent = '✓'; }
    else if (i === picked) { b.classList.add('no'); peekOn(b); $('.mark', b).textContent = '✕'; }
    else b.classList.add('dim');
  });
  commit(x, correct, correct ? 100 : 0, 100);
  if (!correct) $('#qScroll').insertAdjacentHTML('beforeend', explainHtml(x));
  nextBar(correct ? '다음' : '확인했다');
  if (!correct) $('#qScroll').scrollTop = $('#qScroll').scrollHeight;
}

/* ── 모드1 주관식 ── */
function renderM1sa(x) {
  $('#qScroll').innerHTML =
    '<div class="stem"><div class="cap">정의</div>' +
      '<div class="stem-en">' + esc(x.quizDef) + '</div></div>' +
    '<form class="answer" id="saForm">' +
      '<input id="saInput" type="text" inputmode="text" enterkeyhint="go" ' +
      'autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="off" ' +
      'name="t' + Math.random().toString(36).slice(2, 7) + '" placeholder="영어 용어를 입력">' +
      '<div id="saOut"></div>' +
    '</form>';
  $('#qBar').innerHTML = '<div class="row2"><button class="btn ghost" id="toMc">객관식으로</button>' +
    '<button class="btn" id="saSubmit">확인</button></div>';
  var inp = $('#saInput');
  $('#saForm').addEventListener('submit', function (e) { e.preventDefault(); gradeSa(x, inp.value); });
  $('#saSubmit').addEventListener('click', function () { gradeSa(x, inp.value); });
  $('#toMc').addEventListener('click', function () { S.halfPoint = true; S.curMode = '1mc'; renderM1mc(x); });
  setTimeout(function () { inp.focus(); }, 60);
}

function gradeSa(x, raw) {
  if (!raw.trim()) return;
  if (/[가-힣]/.test(raw)) {
    $('#saOut').innerHTML = '<div class="verdict near">영어로 입력해 주세요.</div>';
    return;
  }
  var g = E.grade(raw, x, ALIAS_INDEX, DB.aliases[x.i]);
  if (g.verdict === 'empty') return;
  var correct = g.verdict === 'correct';
  var html;
  if (correct) {
    html = '<div class="verdict ok"><b>정답</b> — ' + esc(x.term) + '</div>';
  } else if (g.verdict === 'mistaken') {
    html = '<div class="verdict near"><span class="mine">' + esc(raw.trim()) + '</span> 은(는) ' +
      '<b>' + esc(C[g.otherIndex].term) + '</b> 쪽입니다.<br>정답: <b>' + esc(x.term) + '</b></div>';
  } else {
    html = '<div class="verdict no"><span class="mine">' + esc(raw.trim()) + '</span><br>정답: <b>' +
      esc(x.term) + '</b></div>';
  }
  $('#saOut').innerHTML = html;
  $('#saInput').blur();
  $('#saInput').disabled = true;
  commit(x, correct, correct ? 120 : 0, 120);
  if (!correct) {
    $('#qScroll').insertAdjacentHTML('beforeend', explainHtml(x));
    $('#qBar').innerHTML = '<div class="row2"><button class="btn ghost" id="pardon">이건 맞은 걸로</button>' +
      '<button class="btn" id="nextBtn">확인했다</button></div>';
    $('#pardon').addEventListener('click', function () {
      (DB.aliases[x.i] = DB.aliases[x.i] || []).push(raw.trim());
      undoWrong(x);
      $('#saOut').innerHTML = '<div class="verdict ok"><b>정답 처리</b> — ' + esc(raw.trim()) +
        ' 을(를) ' + esc(x.term) + ' 의 별칭으로 기억합니다.</div>';
      $('#pardon').remove();
      save();
    });
    $('#nextBtn').addEventListener('click', advance);
    $('#qScroll').scrollTop = $('#qScroll').scrollHeight;
  } else {
    nextBar('다음');
  }
}

/* ── 모드3: O/X → 틀린 쌍이면 올바른 뜻 고르기 ── */
function renderM3(x) {
  /* 진짜 쌍 40 : 가짜 쌍 60. 2단계 진입이 학습의 본체다. */
  var fake = Math.random() < 0.6;
  var decoy = null;
  if (fake) {
    var ids = E.distractors(C, x, 1, { needDef: true, allowSubstrFoes: false });
    if (!ids.length) fake = false; else decoy = C[ids[0]];
  }
  S.m3 = { fake: fake, decoy: decoy };
  var shown = fake ? decoy.optDef : x.optDef;
  $('#qScroll').innerHTML =
    '<div class="stem"><div class="cap">' + SEC[x.section] + '</div>' +
      '<div class="stem-term">' + esc(x.term.replace(/\s*\([^)]*\)/, '')) + '</div></div>' +
    '<div class="stem"><div class="cap">이 뜻이 맞는가?</div>' +
      '<div class="opt-def" style="--clamp:8;font-size:15px;line-height:22px">' + esc(shown) + '</div></div>';
  $('#qBar').innerHTML = '<div class="ox"><button id="oxO">O<small>맞다</small></button>' +
    '<button id="oxX">X<small>틀리다</small></button></div>';
  $('#oxO').addEventListener('click', function () { judgeOx(x, true); });
  $('#oxX').addEventListener('click', function () { judgeOx(x, false); });
}

function judgeOx(x, saidTrue) {
  var fake = S.m3.fake;
  var right = fake ? !saidTrue : saidTrue;
  var hit = saidTrue ? $('#oxO') : $('#oxX');
  hit.classList.add(right ? 'ok' : 'no');
  if (!right) (saidTrue ? $('#oxX') : $('#oxO')).classList.add('ok');
  $('#oxO').disabled = $('#oxX').disabled = true;

  if (!fake) {
    /* 진짜 쌍이었다 — 2단계 없음 */
    commit(x, right, right ? 40 : 0, 40);
    if (!right) $('#qScroll').insertAdjacentHTML('beforeend',
      explainHtml(x, '<div class="verdict near" style="margin-bottom:10px">맞는 쌍이었습니다.</div>'));
    nextBar(right ? '다음' : '확인했다');
    return;
  }
  /* 가짜 쌍 — O 를 눌렀어도 반드시 2단계를 태운다. 못 알아본 사람일수록 정답을 봐야 한다. */
  S.m3.stage1 = right;
  setTimeout(function () { renderM3b(x); }, right ? 420 : 700);
}

function renderM3b(x) {
  /* decoy 를 빼고 뽑아야 한다. 안 그러면 같은 보기가 두 번 들어간다. */
  var base = E.distractors(C, x, 2, { needDef: true, allowSubstrFoes: false, exclude: [S.m3.decoy.i] });
  var ids = E.shuffle(base.concat([x.i, S.m3.decoy.i]));
  $('#qScroll').innerHTML =
    '<div class="stem">' +
      '<div class="cap">' + (S.m3.stage1 ? '맞혔습니다 — 틀린 쌍' : '틀린 쌍이었습니다') + '</div>' +
      '<div class="stem-term">' + esc(x.term.replace(/\s*\([^)]*\)/, '')) + '</div>' +
      '<div class="stem-sub">그럼 진짜 뜻은?</div></div>' +
    '<div class="opts" id="opts" style="--clamp:4">' + ids.map(function (i) {
      return '<button class="opt" data-i="' + i + '"><span class="txt"><span class="opt-def" ' +
        'data-full="' + esc(C[i].optFull) + '">' + esc(C[i].optDef) +
        '</span></span><span class="mark"></span></button>';
    }).join('') + '</div>';
  $('#qBar').innerHTML = '';
  $('#qScroll').scrollTop = 0;
  bindOpts(function (picked) {
    var correct = picked === x.i;
    $('#opts').classList.add('done');
    $$('#opts .opt').forEach(function (b) {
      var i = +b.dataset.i;
      if (i === x.i) { b.classList.add(correct ? 'ok' : 'reveal'); $('.mark', b).textContent = '✓'; }
      else if (i === picked) { b.classList.add('no'); $('.mark', b).textContent = '✕'; }
      else b.classList.add('dim');
    });
    /* 1단계 O(오판) 은 2단계를 맞혀도 만점이 아니다. 미스매치를 통과시킨 건 더 큰 실패다. */
    var pts = S.m3.stage1 ? (correct ? 100 : 40) : (correct ? 50 : 0);
    commit(x, S.m3.stage1 && correct, pts, 100);
    if (!correct) $('#qScroll').insertAdjacentHTML('beforeend', explainHtml(x));
    nextBar('다음');
    if (!correct) $('#qScroll').scrollTop = $('#qScroll').scrollHeight;
  });
  markClipped();
}

/* ── 채점 반영 ── */
function comboMul() {
  var c = S.combo;
  return c >= 10 ? 1.2 : c >= 5 ? 1.1 : c >= 3 ? 1.05 : 1;
}
function commit(x, correct, pts, max) {
  if (S.committed) return;
  S.committed = true;
  if (isRetry() || S.halfPoint) { pts *= 0.5; max *= 0.5; }
  S.halfPoint = false;
  if (correct) {
    S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.ok++;
    pts = Math.round(pts * comboMul());
  } else { S.combo = 0; S.no++; }
  S.earned += pts; S.possible += max;
  S.answers.push({ i: x.i, correct: correct, mode: S.curMode });
  DB.items[x.i] = E.applyResult(rec(x.i), correct, DB.plays);
  save();
  paintHud();
  if (!correct && !S.retried[x.i] && S.retryCount < 3) {
    /* 바로 다음에 내면 단기기억으로 맞힌다. 3~6 문제 뒤에 섞어 넣는다. */
    var at = Math.min(S.cur + 3 + Math.floor(Math.random() * 4), S.queue.length);
    S.queue.splice(at, 0, x.i);
    S.retried[x.i] = true; S.retryCount++;
  }
}
function undoWrong(x) {
  var a = S.answers[S.answers.length - 1];
  if (!a || a.correct) return;
  a.correct = true; S.no--; S.ok++;
  S.earned += 60;
  DB.items[x.i] = E.applyResult(rec(x.i), true, DB.plays);
  paintHud();
}

function advance() {
  S.cur++; S.committed = false;
  render();
}

$('#quitBtn').addEventListener('click', function () {
  if (S && S.cur > 0 && !confirm('그만두면 이 판은 기록되지 않습니다.')) return;
  show('lobby'); paintLobby();
});

/* ══════════ 결과 ══════════ */
function finish() {
  DB.plays++; save();
  var pct = S.possible ? Math.round(S.earned / S.possible * 100) : 0;
  var secs = {};
  S.answers.forEach(function (a) {
    var s = C[a.i].section;
    secs[s] = secs[s] || { n: 0, c: 0 };
    secs[s].n++; if (a.correct) secs[s].c++;
  });
  var wrong = S.answers.filter(function (a) { return !a.correct; });
  var seen = {}, wrongU = wrong.filter(function (a) { return seen[a.i] ? false : (seen[a.i] = 1); });

  var html = '<div class="result"><div class="sc">' + S.ok + ' / ' + S.answers.length + '</div>' +
    '<div class="pc">점수 ' + pct + '% · 최고 콤보 ' + S.maxCombo + ' · ' +
    Math.round((Date.now() - S.startAt) / 1000) + '초</div></div>';
  Object.keys(secs).forEach(function (s) {
    var v = secs[s];
    html += '<div class="statrow"><span class="lb">' + SEC[s] + '</span>' +
      '<span class="tr"><i style="width:' + Math.round(v.c / v.n * 100) + '%"></i></span>' +
      '<span class="vl">' + v.c + '/' + v.n + '</span></div>';
  });
  if (wrongU.length) {
    html += '<div class="cap">틀린 개념 ' + wrongU.length + '</div>';
    wrongU.forEach(function (a) { html += explainHtml(C[a.i]); });
  } else {
    html += '<div class="empty">전부 맞혔습니다</div>';
  }
  if (!store.ok) html += '<p class="note">저장소가 차단되어 기록이 남지 않습니다.</p>';
  else html += '<p class="note">기록은 이 브라우저에만 저장됩니다. 사파리는 7일 넘게 안 들어오면 지울 수 있습니다.</p>';
  $('#rScroll').innerHTML = html;

  $('#rBar').innerHTML =
    (wrongU.length ? '<button class="btn" id="againWrong">틀린 ' + wrongU.length + '개만 다시</button>' : '') +
    '<button class="btn' + (wrongU.length ? ' ghost' : '') + '" id="againSame">한 판 더</button>' +
    '<button class="btn ghost" id="toLobby">로비로</button>';
  if (wrongU.length) $('#againWrong').addEventListener('click', function () {
    var ids = wrongU.map(function (a) { return a.i; });
    S = { queue: E.shuffle(ids), cur: 0, earned: 0, possible: 0, combo: 0, maxCombo: 0,
          ok: 0, no: 0, answers: [], retried: {}, retryCount: 0, startAt: Date.now() };
    show('quiz'); render();
  });
  $('#againSame').addEventListener('click', startSession);
  $('#toLobby').addEventListener('click', function () { show('lobby'); paintLobby(); });
  show('result');
  $('#rScroll').scrollTop = 0;
}

paintLobby();
})();
