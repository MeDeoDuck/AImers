/* 퀴즈 엔진 — DOM 없음. node 로 단독 테스트 가능. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── 입력 정규화 (N1~N7) ─────────────────────────────── */
  function norm(s) {
    if (s == null) return '';
    var t = String(s).normalize('NFKC').trim().toLowerCase();
    t = t.replace(/[‘’ʼ']/g, '');
    t = t.replace(/[.,?!:;"“”]/g, '');
    t = t.replace(/[-_\/·–—]+/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    t = t.replace(/^(the|a|an) /, '');
    return t;
  }

  /* ── 별칭 생성 (A1~A5) ───────────────────────────────── */
  function autoAliases(term) {
    var out = [term];
    var m = term.match(/^([^(]*)\(([^)]*)\)(.*)$/);
    if (m) {
      out.push((m[1] + ' ' + m[3]).trim());
      out.push(m[2].trim());
    }
    // 복합 term: 쉼표 / 슬래시 / and 로 쪼갠 조각도 인정
    term.split(/\s*[,\/]\s*|\s+and\s+/i).forEach(function (p) {
      p = p.replace(/\([^)]*\)/g, '').trim();
      if (p.length >= 3) out.push(p);
    });
    var set = Object.create(null);
    out.forEach(function (a) {
      var n = norm(a);
      if (!n) return;
      set[n] = 1;
      // A5 숫자 ↔ 로마자
      var r = n.replace(/\btype 1\b/g, 'type i').replace(/\btype 2\b/g, 'type ii');
      if (r !== n) set[r] = 1;
    });
    return Object.keys(set);
  }

  /* ── 채점: 정규화 후 완전 일치만. 퍼지/부분일치 금지 ──
     basis↔bias 편집거리 3, rank↔rnn 2 — 켜는 순간 서로 정답이 된다.
     entropy ⊂ cross-entropy — 부분일치도 같은 이유로 금지. */
  function buildIndex(items) {
    var idx = Object.create(null);
    items.forEach(function (it, i) {
      (it.aliases || []).forEach(function (a) {
        if (!(a in idx)) idx[a] = i;
      });
    });
    return idx;
  }

  function grade(input, item, aliasIndex, customAliases) {
    var n = norm(input);
    if (!n) return { verdict: 'empty' };
    var own = (item.aliases || []).slice();
    if (customAliases && customAliases.length) own = own.concat(customAliases.map(norm));
    if (own.indexOf(n) !== -1) return { verdict: 'correct' };
    var other = aliasIndex[n];
    if (other !== undefined && other !== item.i) return { verdict: 'mistaken', otherIndex: other };
    return { verdict: 'wrong' };
  }

  /* ── 셔플 (Fisher-Yates) ─────────────────────────────── */
  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }

  function sample(pool, n, exclude) {
    var ex = exclude || [];
    return shuffle(pool.filter(function (x) { return ex.indexOf(x) === -1; })).slice(0, n);
  }

  /* ── 오답 보기 선택 ──────────────────────────────────
     랜덤이면 Rank vs Poisson 이 나와 문제가 성립하지 않는다.
     같은 혼동 클러스터 2 + 같은 섹션 1 을 기본으로 한다.
     substrFoes: 부분문자열 관계(entropy ⊂ cross-entropy). 뜻이 정답인
     모드에서는 제외, 단어가 정답인 모드에서는 오히려 좋은 오답이라 허용. */
  function distractors(items, ans, n, opts) {
    n = n || 3;
    opts = opts || {};
    var banned = (opts.allowSubstrFoes ? [] : (ans.foes || []))
      .concat([ans.i]).concat(opts.exclude || []);
    var usable = items.filter(function (x) {
      if (banned.indexOf(x.i) !== -1) return false;
      if (opts.needDef && !x.quizDef) return false;
      /* 모드1 보기에 질문 문장이 섞이면 읽지 않고도 지워진다 */
      if (opts.needMode && x.modes.indexOf(opts.needMode) === -1) return false;
      return true;
    });
    /* 보기 길이가 들쭉날쭉하면 내용을 안 읽고 '제일 긴 게 정답'으로 뚫린다.
       정답 길이 ±45% 밴드로 거르되, 후보가 모자라면 밴드를 포기한다. */
    if (opts.needDef && ans.len) {
      var band = usable.filter(function (x) {
        return x.len && Math.abs(x.len - ans.len) / ans.len <= 0.45;
      });
      if (band.length >= n + 2) usable = band;
    }
    var byCluster = usable.filter(function (x) { return x.cluster === ans.cluster; });
    var bySection = usable.filter(function (x) { return x.section === ans.section && x.cluster !== ans.cluster; });

    var picked = sample(byCluster.map(function (x) { return x.i; }), Math.min(2, n));
    var ids = picked.slice();
    if (ids.length < n) {
      ids = ids.concat(sample(bySection.map(function (x) { return x.i; }), n - ids.length, ids));
    }
    if (ids.length < n) {
      ids = ids.concat(sample(usable.map(function (x) { return x.i; }), n - ids.length, ids));
    }
    return ids.slice(0, n);
  }

  /* ── 라이트너 상자 ───────────────────────────────────
     오답은 box 0 이 아니라 1 로 리셋한다. 0 으로 내리면 재등장이 폭주한다. */
  var GAP = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 999 };
  function applyResult(rec, correct, playCount) {
    rec = rec || { box: 1, seen: 0, right: 0, wrong: 0, streak: 0 };
    rec.seen++;
    if (correct) {
      rec.right++; rec.streak++;
      rec.box = Math.min(5, (rec.box || 1) + 1);
    } else {
      rec.wrong++; rec.streak = 0;
      rec.box = 1;
    }
    rec.lastPlay = playCount;
    rec.nextDuePlay = playCount + (GAP[rec.box] || 1);
    return rec;
  }
  function isGraduated(rec) { return !!rec && rec.box >= 4 && rec.streak >= 3; }

  /* ── 세션 큐 ─────────────────────────────────────────
     범위 안에서 셔플. 중복 출제 없음. */
  function buildQueue(pool, len) {
    return shuffle(pool.map(function (x) { return x.i; })).slice(0, Math.min(len, pool.length));
  }

  /* 어떤 문제를 뽑을지에만 복습 가중치를 건다. 뽑은 뒤 순서는 그대로 셔플이다.
     틀린 것·복습 시점이 된 것·아직 안 본 것이 먼저 올라온다. */
  function weight(rec, plays) {
    if (!rec) return 1.5;                                   // 안 본 것
    var w = 1 + 2 * (rec.wrong || 0) - Math.min(rec.streak || 0, 2);
    if (rec.nextDuePlay != null && rec.nextDuePlay <= plays) w *= 2;
    if (rec.box >= 5) w *= 0.25;                            // 졸업한 것은 거의 안 낸다
    return Math.max(0.2, w);
  }

  function weightedQueue(pool, len, recOf, plays) {
    var cand = pool.slice(), out = [];
    var ws = cand.map(function (x) { return weight(recOf(x.i), plays); });
    var n = Math.min(len, cand.length);
    for (var k = 0; k < n; k++) {
      var tot = 0, j;
      for (j = 0; j < ws.length; j++) tot += ws[j];
      var r = Math.random() * tot, acc = 0, hit = ws.length - 1;
      for (j = 0; j < ws.length; j++) { acc += ws[j]; if (r <= acc) { hit = j; break; } }
      out.push(cand[hit].i);
      cand.splice(hit, 1); ws.splice(hit, 1);
    }
    return shuffle(out);
  }

  /* 틀린 항목을 같은 판 3문제 뒤에 모드를 바꿔 한 번 더.
     바로 다음에 내면 단기기억으로 맞히고, 안 내면 잊는다. 세션당 3개까지. */
  function scheduleRetry(queue, cursor, idx, inserted) {
    if (inserted >= 3) return false;
    var at = Math.min(cursor + 3, queue.length);
    queue.splice(at, 0, idx);
    return true;
  }

  return {
    norm: norm, autoAliases: autoAliases, buildIndex: buildIndex, grade: grade,
    shuffle: shuffle, sample: sample, distractors: distractors,
    applyResult: applyResult, isGraduated: isGraduated,
    buildQueue: buildQueue, weightedQueue: weightedQueue, weight: weight,
    scheduleRetry: scheduleRetry, GAP: GAP
  };
});
