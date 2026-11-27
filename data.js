// 合格ラインのつまみの問題を作る（ブラウザと node の両方で使う）。
// 1問＝架空の A組・B組の点数の柱（一人ひとりに「実は力あり／なし」の印）。組ごとに合格ラインを動かすと、3つのメーターが動く：
//   R 合格率（合格した人の割合）・F 見逃し率（力ある人のうち不合格になった割合）・V 当たり率（合格した人のうち力ありの割合）。
// 1段目：言われた2つ（または3つ全部）を2組でぴったりそろえる。3つのときは「どう動かしてもそろわない」も答えになる。
// 2段目：3つ全部そろう線の組はあるか・なぜか（力ありの割合が同じ／ちがう／割合は同じでも点の分かれ方がちがう）。
// 答えは線の組を全部（9×9＝81通り）調べて決める（solve）。QA は別に書いた全探索で照らす。
// 理論（出典メモは /mnt/project-files/games/gokaku-line-research.md）：V×R＝p×(1−F)（p は力ありの割合）。合格する人の中に
// 力ある人が1人以上いれば、R・F・V が2組で同じなら p も同じになる。だから p がちがうと3つは同時にそろわない（点で完全に分けられても）。
// Chouldechova（2017）は p がちがうと「当たり率がそろうなら、見逃し率と誤合格率の両方はそろわない」ことを示した。
// 点数・組・人はすべて架空。実在の試験・集団は出さない。
// 乱数 R は呼ぶ回数が毎回同じになるように使う（sort の比較の中では引かない）。同じ tag なら、どの端末でも同じ問題になる。
// KDEF・SCENES の並びや中身は、足すだけでも過去の日の問題が変わる。公開したあとは変えず、変えるときは qa/run.mjs の PINS を作り直して PR に理由を書く。
(function (root) {
  "use strict";
  const LV = ["やさしい", "ふつう", "むずかしい"];
  const BINS = 10, LMIN = 1, LMAX = 9; // 点の柱は 0〜90点の10本（b×10点〜）。線 t は「t×10点以上で合格」（1〜9。いちばん下の柱はいつも不合格、いちばん上はいつも合格）

  // 出典（画面の「なぜ」と「このゲームについて」に出す）
  const SRC = {
    kmr: ["Kleinberg・Mullainathan・Raghavan「Inherent Trade-Offs in the Fair Determination of Risk Scores」（2016）", "https://arxiv.org/abs/1609.05807"],
    cho: ["Chouldechova「Fair prediction with disparate impact」（2017）", "https://arxiv.org/abs/1703.00056"],
    hps: ["Hardt・Price・Srebro「Equality of Opportunity in Supervised Learning」（2016）", "https://arxiv.org/abs/1610.02413"],
  };

  const METERS = {
    R: { name: "合格率", sub: "組の中で合格した人の割合" },
    F: { name: "見逃し率", sub: "力ある人のうち、不合格になった割合" },
    V: { name: "当たり率", sub: "合格した人のうち、力ありの割合" },
  };
  const MK = ["R", "F", "V"];

  // 2段目「3つ全部そろう線の組は？」の答え
  const WHY = {
    same: { yes: true, name: "力ありの割合が2組で同じ", ex: "割合が同じなら、合格率と見逃し率をそろえた線で、当たり率も同じになります。" },
    diff: { yes: false, name: "力ありの割合が2組でちがう", ex: "当たり率×合格率＝力ありの割合×(1−見逃し率)。割合がちがうと、3つは同時にそろいません。" },
    shape: { yes: false, name: "割合は同じでも、点の分かれ方がちがう", ex: "割合が同じでも、合格率と見逃し率を同時にそろえる線の組が、この点数にはありません。" },
    size: { yes: false, name: "2組の人数がちがう", ex: "メーターはどれも割合なので、人数のちがいだけでは決まりません。" },
  };
  const WK = ["same", "diff", "shape", "size"];

  // 種類。ask＝1段目でそろえるメーター（RFV は3つ全部。そろわないときは「そろわない」が答え）。gen＝作り方。sz＝人数（eq 同じ・ne ちがう）
  const KDEF = [
    { id: "rf", lv: 0, ask: "RF", gen: "pair", sz: "eq", name: "合格率と見逃し率", em: "⚖" },
    { id: "rv", lv: 0, ask: "RV", gen: "pair", sz: "eq", name: "合格率と当たり率", em: "🎯" },
    { id: "fv", lv: 0, ask: "FV", gen: "pair", sz: "eq", name: "見逃し率と当たり率", em: "🔍" },
    { id: "rfx", lv: 1, ask: "RF", gen: "pair", sz: "ne", name: "人数ちがいの合格率と見逃し率", em: "⚖" },
    { id: "rvx", lv: 1, ask: "RV", gen: "pair", sz: "ne", name: "人数ちがいの合格率と当たり率", em: "🎯" },
    { id: "fvx", lv: 1, ask: "FV", gen: "pair", sz: "ne", name: "人数ちがいの見逃し率と当たり率", em: "🔍" },
    { id: "same", lv: 1, ask: "RFV", gen: "same", sz: "eq", name: "3つ全部・割合が同じ組", em: "🟰" },
    { id: "diff", lv: 1, ask: "RFV", gen: "diff", sz: "eq", name: "3つ全部・割合がちがう組", em: "↕" },
    { id: "perf", lv: 2, ask: "RFV", gen: "perf", sz: "ne", name: "3つ全部・点で完全に分かれる組", em: "✂" },
    { id: "shape", lv: 2, ask: "RFV", gen: "shape", sz: "ne", name: "3つ全部・分かれ方のちがう組", em: "〰" },
    { id: "close", lv: 2, ask: "RFV", gen: "close", sz: "ne", name: "3つ全部・割合が少しちがう組", em: "↕" },
    { id: "same2", lv: 2, ask: "RFV", gen: "same", sz: "ne", name: "3つ全部・人数ちがいで割合が同じ組", em: "🟰" },
  ];

  // 場面（問いの言い方）。試験・組・人はすべて架空
  const SCENES = [
    "架空の検定の練習問題。A組とB組の点数が出ました。",
    "ある教室の進級テスト。あとで、本当に力があったかが分かりました。",
    "作品コンテストの一次審査。2つの部門で点のつき方がちがいます。",
    "ロボット教室の予選。A組・B組それぞれに合格ラインを決めます。",
    "料理教室の実技テスト。組ごとに線を動かせます。",
  ];

  // part:ri:begin（shared-workflows の template/parts/data/ri.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
  // part:ri:end
  // part:shuffle:begin（shared-workflows の template/parts/data/shuffle.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function shuffle(R, a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = ri(R, 0, i); [b[i], b[j]] = [b[j], b[i]]; } return b; }
  // part:shuffle:end
  // part:pickN:begin（shared-workflows の template/parts/data/pickN.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function pickN(R, a, n) { return shuffle(R, a).slice(0, n); }
  // part:pickN:end
  // part:seedOf:begin（shared-workflows の template/parts/data/seedOf.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // part:seedOf:end
  // part:rng:begin（shared-workflows の template/parts/data/rng.js の写し。ここでは直さない。node scripts/sync-template.mjs で写す）
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  // part:rng:end

  // ---- 数える ----
  // g＝{ n, c, cnt: [[力あり, 力なし] × 10本] }。線 t のときの数：合格 s・合格した力あり x
  function stat(g, t) { let s = 0, x = 0; for (let b = t; b < BINS; b++) { s += g.cnt[b][0] + g.cnt[b][1]; x += g.cnt[b][0]; } return { n: g.n, c: g.c, s, x }; }
  // メーターの値（分数 [分子, 分母]）。R＝s/n・F＝(c−x)/c・V＝x/s
  const frac = (st, m) => (m === "R" ? [st.s, st.n] : m === "F" ? [st.c - st.x, st.c] : [st.x, st.s]);
  const eqF = (a, b) => a[1] > 0 && b[1] > 0 && a[0] * b[1] === b[0] * a[1]; // ぴったり同じか（四捨五入しない）
  function meters(P, tA, tB) {
    const a = stat(P.A, tA), b = stat(P.B, tB), out = {};
    for (const m of MK) { const fa = frac(a, m), fb = frac(b, m); out[m] = { a: fa, b: fb, eq: eqF(fa, fb) }; }
    return out;
  }
  // 線の組を全部（81通り）調べる。ask のメーターが全部そろう組と、3つ全部そろう組
  function solve(P) {
    const ok = [], all = [];
    for (let tA = LMIN; tA <= LMAX; tA++) for (let tB = LMIN; tB <= LMAX; tB++) {
      const m = meters(P, tA, tB);
      if ([...P.ask].every((k) => m[k].eq)) ok.push([tA, tB]);
      if (MK.every((k) => m[k].eq)) all.push([tA, tB]);
    }
    return { ok, all };
  }
  const sameRate = (P) => P.A.c * P.B.n === P.B.c * P.A.n;
  const whyOf = (P, all) => (all.length ? "same" : sameRate(P) ? "shape" : "diff");

  // ---- 作る ----
  const SIZES = { eq: [[20, 20], [30, 30], [40, 40]], ne: [[20, 30], [30, 20], [20, 40], [40, 20], [30, 40], [40, 30]] };
  const RATES = [0.3, 0.4, 0.5, 0.6, 0.7];
  // 合格する人の組み立て（x 力ありの合格・y 力なしの合格）を全部さがす。ask のメーターがぴったりそろうもの
  // 線より上にいちばん上の柱（力あり1人）、下にいちばん下の柱（力なし1人）を置くので、x≥1・力なしの不合格≥1
  function comps(nA, cA, nB, cB, ask) {
    const out = [], R = ask.includes("R"), F = ask.includes("F"), V = ask.includes("V");
    for (let xA = 1; xA <= cA; xA++) for (let yA = 0; yA <= nA - cA - 1; yA++) {
      const sA = xA + yA;
      for (let xB = 1; xB <= cB; xB++) {
        if (F && xA * cB !== xB * cA) continue;
        let sB;
        if (R) { if ((sA * nB) % nA) continue; sB = (sA * nB) / nA; } else { if ((sA * xB) % xA) continue; sB = (sA * xB) / xA; } // R が無いときは V（x/s）から決める
        const yB = sB - xB;
        if (yB < 0 || yB > nB - cB - 1) continue;
        if (V && xA * sB !== xB * sA) continue;
        out.push([xA, yA, xB, yB]);
      }
    }
    return out;
  }
  // 1組の点を並べる。線 t より上に力あり x・力なし y、下に残り。力ありは高め、力なしは低めに寄せる
  function place(R, n, c, t, x, y) {
    const cnt = Array.from({ length: BINS }, () => [0, 0]);
    const hi = (lo, top) => Math.min(top, lo + Math.floor(Math.sqrt(R()) * (top - lo + 1))), lo2 = (lo, top) => Math.min(top, lo + Math.floor((1 - Math.sqrt(R())) * (top - lo + 1)));
    cnt[BINS - 1][0]++; cnt[0][1]++; // いちばん上の柱に力あり1人・いちばん下に力なし1人（どの線でも、合格に力ありがいて、不合格に力なしがいる）
    for (let i = 1; i < x; i++) cnt[hi(t, BINS - 1)][0]++;
    for (let i = 0; i < y; i++) cnt[lo2(t, BINS - 1)][1]++;
    for (let i = 0; i < c - x; i++) cnt[hi(0, t - 1)][0]++;
    for (let i = 1; i < n - c - y; i++) cnt[lo2(0, t - 1)][1]++;
    return { n, c, cnt };
  }
  // 点で力あり・なしが完全に分かれる組（s より上は全員力あり、下は全員力なし）
  function placeSplit(R, n, c, s) {
    const cnt = Array.from({ length: BINS }, () => [0, 0]);
    cnt[BINS - 1][0]++; cnt[0][1]++;
    for (let i = 1; i < c; i++) cnt[ri(R, s, BINS - 1)][0]++;
    for (let i = 1; i < n - c; i++) cnt[ri(R, 0, s - 1)][1]++;
    return { n, c, cnt };
  }
  // ふつうの散らばり（力ありは 6 前後・力なしは 3 前後。重なりがある）
  function placeFree(R, n, c) {
    const cnt = Array.from({ length: BINS }, () => [0, 0]);
    cnt[BINS - 1][0]++; cnt[0][1]++;
    const tri = (m) => Math.max(0, Math.min(BINS - 1, Math.round(m + (R() + R() + R() - 1.5) * 3)));
    for (let i = 1; i < c; i++) cnt[tri(6)][0]++;
    for (let i = 1; i < n - c; i++) cnt[tri(3)][1]++;
    return { n, c, cnt };
  }
  const rateCnt = (n, p) => Math.round(n * p);
  function pickRates(R, gen) {
    if (gen === "same" || gen === "shape") { const p = RATES[ri(R, 0, RATES.length - 1)]; return [p, p]; }
    if (gen === "close") { const i = ri(R, 0, RATES.length - 2), up = R() < 0.5; return up ? [RATES[i], RATES[i + 1]] : [RATES[i + 1], RATES[i]]; }
    // diff・perf：0.2 以上ちがう
    const pairs = []; for (const a of RATES) for (const b of RATES) if (Math.abs(a - b) > 0.15) pairs.push([a, b]);
    return pairs[ri(R, 0, pairs.length - 1)];
  }

  const BY = Object.fromEntries(KDEF.map((k) => [k.id, k]));
  const KINDS = KDEF;
  const kindsOf = (lv) => KDEF.filter((k) => k.lv === lv).map((k) => k.id);

  // 1問を作る。tag は「種類|種」（例 "rf|2026-11-27:d0"）。同じ tag ならいつも同じ点数
  function make(tag) {
    const [kind] = String(tag).split("|"), k = Object.prototype.hasOwnProperty.call(BY, kind) ? BY[kind] : null;
    if (!k) return null;
    const R = rng(seedOf(tag)), si = ri(R, 0, SCENES.length - 1);
    let P = null;
    for (let tr = 0; tr < 40 && !P; tr++) {
      const [nA, nB] = SIZES[k.sz][ri(R, 0, SIZES[k.sz].length - 1)];
      let gen = k.gen, pr;
      if (gen === "pair") gen = R() < 0.35 ? "same" : "diff"; // 2つをそろえる問題は、3つもそろう組（割合が同じ）と、そろわない組（割合がちがう）をまぜる
      pr = pickRates(R, gen);
      const cA = rateCnt(nA, pr[0]), cB = rateCnt(nB, pr[1]);
      const tA = ri(R, 3, 7), tB = ri(R, 3, 7);
      let A, B;
      if (gen === "perf") { A = placeSplit(R, nA, cA, tA); B = placeSplit(R, nB, cB, tB); }
      else if (gen === "shape") { A = placeFree(R, nA, cA); B = placeFree(R, nB, cB); }
      else {
        const ask = gen === "same" ? "RFV" : k.ask === "RFV" ? "RF" : k.ask; // 割合がちがう3つの問題も、合格率と見逃し率はそろう組にしておく（2つはそろうのに3つ目がずれる）
        const cs = comps(nA, cA, nB, cB, ask);
        if (!cs.length) { R(); continue; }
        const [xA, yA, xB, yB] = cs[ri(R, 0, cs.length - 1)];
        A = place(R, nA, cA, tA, xA, yA); B = place(R, nB, cB, tB, xB, yB);
      }
      const Q = { A, B, ask: k.ask };
      const sv = solve(Q);
      if (!sv.ok.length && k.ask !== "RFV") continue; // 2つの問題は、そろう線の組が必ずある
      if (k.gen === "shape" && sv.all.length) continue; // 分かれ方のちがう組は、3つそろう線の組が無いものだけ
      if ((k.gen === "same") !== (sv.all.length > 0) && k.ask === "RFV") continue;
      // はじめの線は、言われたメーターがそろっていない所から
      const bad = []; for (let a = LMIN; a <= LMAX; a++) for (let b = LMIN; b <= LMAX; b++) if (!sv.ok.some(([x, y]) => x === a && y === b)) bad.push([a, b]);
      const st0 = bad.filter(([a, b]) => Math.abs(a - 5) + Math.abs(b - 5) <= 2);
      const start = (st0.length ? st0 : bad)[ri(R, 0, (st0.length ? st0 : bad).length - 1)];
      P = { A, B, ask: k.ask, ok: sv.ok, all: sv.all, start };
    }
    if (!P) return null;
    const why = whyOf(P, P.all), os = R();
    const opts = shuffle(rng(seedOf(tag + ":o")), WK);
    return Object.assign(P, { tag, kind, lv: k.lv, name: k.name, em: k.em, q: SCENES[si], v: String(si), can: P.all.length > 0, why, opts, os,
      src: ["kmr", "cho", "hps"].map((s) => SRC[s]), rate: [P.A.c / P.A.n, P.B.c / P.B.n] });
  }
  const keyOf = (P) => `${P.kind}:${P.A.cnt.flat().join("")}:${P.B.cnt.flat().join("")}`;

  function dailyTags(date) {
    const R = rng(seedOf("day:" + date)), out = [];
    for (const lv of [0, 1]) for (const id of pickN(R, kindsOf(lv), 2)) out.push(id);
    out.push(pickN(R, kindsOf(2), 1)[0]);
    return out.map((id, i) => `${id}|${date}:d${i}`);
  }
  function hardTags(date) {
    const dh = dailyTags(date)[4].split("|")[0], R = rng(seedOf("hard:" + date)), ps = pickN(R, kindsOf(2).filter((x) => x !== dh), 3);
    return ps.map((id, i) => `${id}|${date}:h${i}`);
  }

  const GKL = { KINDS, BY, LV, SRC, METERS, MK, WHY, WK, SCENES, BINS, LMIN, LMAX, kindsOf, seedOf, rng, make, keyOf, stat, frac, eqF, meters, solve, sameRate, dailyTags, hardTags, pickN };
  if (typeof module !== "undefined" && module.exports) module.exports = GKL; else root.GKL = GKL;
})(typeof self !== "undefined" ? self : this);
