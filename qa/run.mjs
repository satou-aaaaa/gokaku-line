// 合格ラインのつまみの検査。問題の作り方（全種類×300の種：ゲームとは別に書いた全探索で、言われたメーターがそろう線の組・3つそろう線の組・
// 2段目の答えを照らす。力ありの割合がちがう組で3つそろう線の組が1つも無いこと・種類ごとの作り方・出典）・今日の5問と上級の組み方（3年分）・
// とことんの並び・通しで遊ぶ（つまみを動かす→決める／そろわない→2段目）・まちがい・ヒント・続きから・上級・練習・とことん・つまみ帳・実績・
// カレンダー・あとから・文字の大きさ・言い方・スマホ幅・PWA・引き継ぎ・見やすさを確かめる。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
// 日付を変えて回す: QA_SHIFT_DAYS=3 node qa/run.mjs（ブラウザの時計と「今日」を3日進める。日によって落ちる検査を再現する）
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { checkCore } from "./core-check.mjs";
import { checkTransfer } from "./transfer-check.mjs";
import { checkSwStall } from "./sw-check.mjs";
import { checkDepth } from "./depth-check.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 400) });
const firstClose = async (q) => { if (await q.locator("#howto[open]").count()) await q.click("#howto-ok"); if (await q.evaluate(() => !!(window.Core && Core.coach && Core.coach.active()))) { await q.evaluate(() => { Core.coach.leave(); scrollTo(0, 0); }); await q.waitForTimeout(100); } }; // はじめての練習の吹き出しをやめてホームへ（sync-template の migrateFirstQa が足した）
const G = createRequire(import.meta.url)(path.join(root, "data.js"));
const SHIFT0 = (+process.env.QA_SHIFT_DAYS || 0) * 864e5; // 日付を変える口（qa:today-only）

const PINS = "rf:1:0.3/0.1/0.0/0.0/0.0/0.0/2.0/5.1/1.0/6.1|0.2/0.2/0.0/0.0/0.0/1.4/0.1/0.3/2.1/3.1,fv:2:1.1/0.0/2.1/0.6/0.3/2.3/1.6/0.4/3.4/3.0|0.2/0.0/0.0/3.0/0.0/1.10/1.6/2.3/0.6/5.1,same:1:0.4/12.0/4.3/10.1/0.1/0.2/0.1/0.0/0.0/2.0|0.3/1.1/2.2/3.1/3.1/7.0/10.0/1.1/0.3/1.0,rfx:2:0.1/0.0/0.1/0.0/0.1/0.0/2.3/1.2/7.0/11.1|0.1/0.0/0.1/0.0/1.3/0.1/0.0/2.4/1.0/6.0,shape:0:0.1/0.4/0.2/0.5/4.5/1.2/0.2/0.0/2.0/2.0|0.2/0.1/0.3/1.4/1.2/1.2/0.0/1.0/1.0/1.0,perf:0:0.6/0.2/0.4/0.2/1.0/1.0/1.0/0.0/1.0/2.0|0.8/0.2/0.5/0.3/0.2/5.0/3.0/6.0/4.0/2.0,close:1:1.1/4.2/9.1/0.2/1.1/2.2/0.3/3.0/2.0/6.0|0.2/0.1/1.0/1.0/1.0/2.0/1.0/0.2/2.3/4.0,same2:4:0.2/0.0/2.0/1.0/3.0/0.2/0.0/0.3/5.0/1.1|0.3/2.0/2.0/5.0/0.1/0.1/1.3/3.3/1.0/4.1;rf:0:0.3/1.1/3.0/0.9/0.3/1.3/1.3/3.1/3.1/4.0|0.1/4.0/3.0/1.3/1.2/4.4/2.1/4.0/3.1/6.0,fv:3:0.1/0.1/0.3/2.1/3.0/2.0/0.0/0.0/1.0/6.0|0.6/0.4/1.2/0.1/0.1/1.0/1.0/0.0/0.0/3.0,diff:1:0.1/1.0/0.0/1.1/0.0/0.4/1.6/1.0/0.0/4.0|0.1/1.0/0.0/0.0/2.0/0.5/0.0/0.2/5.0/4.0,rfx:4:0.5/0.2/0.0/0.0/0.1/1.3/1.1/4.4/4.6/6.2|0.2/0.1/0.0/0.3/0.0/0.0/1.0/1.1/9.2/10.0,shape:4:0.2/0.4/0.6/0.4/2.0/1.1/4.1/2.0/1.0/2.0|0.2/0.3/0.6/1.10/1.2/2.1/3.0/0.0/6.0/3.0,close:0:0.5/0.9/0.2/0.0/0.0/2.2/4.1/2.0/5.0/7.1|0.8/0.4/0.0/1.0/0.0/4.0/2.0/3.0/3.0/5.0,perf:0:0.2/0.4/0.2/0.1/3.0/2.0/2.0/4.0/7.0/3.0|0.3/0.2/0.3/0.2/3.0/2.0/0.0/1.0/1.0/3.0,same2:2:0.2/0.1/0.2/1.0/0.0/0.1/0.1/3.4/0.0/4.1|0.5/0.2/1.0/1.2/0.1/1.5/1.2/2.2/3.4/7.1;rf:1:0.5/0.1/0.3/0.0/0.0/0.0/2.4/0.0/2.1/2.0|0.7/0.1/0.1/0.0/0.0/0.0/1.1/1.0/2.0/6.0,rv:1:0.2/0.0/2.2/0.1/4.1/0.0/0.2/0.2/0.2/2.0|0.3/3.3/3.0/0.3/0.1/0.0/0.1/0.1/0.0/2.0,diff:0:0.3/0.2/2.0/1.1/0.4/1.1/0.3/0.0/0.0/2.0|1.3/2.0/3.0/1.2/1.2/0.1/0.0/2.0/1.0/1.0,rvx:0:0.3/0.1/0.2/0.1/0.2/2.1/3.0/0.3/0.0/1.1|1.7/1.2/1.1/8.1/5.1/2.0/0.1/0.3/0.1/2.3,same2:0:0.1/0.0/0.1/1.1/1.0/1.0/3.0/1.9/2.5/3.1|0.1/0.1/1.1/5.1/2.0/0.7/1.7/0.4/1.1/6.1,perf:0:0.1/0.0/0.1/0.3/0.2/0.1/0.1/10.0/4.0/7.0|0.3/0.2/0.4/0.2/0.1/0.2/0.0/2.0/2.0/2.0,close:4:0.4/0.4/0.1/0.1/1.1/1.3/1.1/11.1/2.0/8.0|0.2/0.3/0.0/0.0/0.0/1.0/1.1/1.0/3.0/8.0,shape:3:0.3/0.0/1.3/3.8/2.6/2.0/4.0/5.0/1.0/2.0|0.1/0.3/0.5/1.2/4.3/2.1/1.0/2.0/1.0/4.0"; // 過去の日の問題の印（変わったら過去の日の問題が変わっている。data.js を直したら作り直して PR に理由を書く）

// ---- 1. 問題の作り方（ブラウザを使わない）----
// ゲームとは別に書いた全探索。点の柱 cnt から、線 tA・tB（1〜9。t×10点以上が合格）の組を全部たどる
const MKQ = ["R", "F", "V"];
function countQ(cnt, t) { let s = 0, x = 0, n = 0, c = 0; cnt.forEach(([a, b], i) => { n += a + b; c += a; if (i >= t) { s += a + b; x += a; } }); return { s, x, n, c }; }
// 分数どうしをかけ算でくらべる（ぴったり同じか）
const fracQ = (q, m) => (m === "R" ? [q.s, q.n] : m === "F" ? [q.c - q.x, q.c] : [q.x, q.s]);
const sameQ = (a, b) => a[1] > 0 && b[1] > 0 && a[0] * b[1] === b[0] * a[1];
function searchQ(P) {
  const ok = [], all = [], rf = [];
  let passNoCap = false;
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) {
    const qa = countQ(P.A.cnt, a), qb = countQ(P.B.cnt, b);
    if (qa.x === 0 || qb.x === 0) passNoCap = true;
    const eq = Object.fromEntries(MKQ.map((m) => [m, sameQ(fracQ(qa, m), fracQ(qb, m))]));
    if ([...P.ask].every((m) => eq[m])) ok.push(`${a}-${b}`);
    if (MKQ.every((m) => eq[m])) all.push(`${a}-${b}`);
    if (eq.R && eq.F) rf.push(`${a}-${b}`);
  }
  const ca = countQ(P.A.cnt, 0), cb = countQ(P.B.cnt, 0), rateSame = ca.c * cb.n === cb.c * ca.n;
  return { ok, all, rf, rateSame, passNoCap, why: all.length ? "same" : rateSame ? "shape" : "diff" };
}
const splitQ = (cnt) => { const hi = cnt.map(([a]) => a > 0), lo = cnt.map(([, b]) => b > 0); const maxN = lo.lastIndexOf(true), minC = hi.indexOf(true); return maxN < minC; };
{
  const bad = {}, N = 300;
  for (const k of G.KINDS) {
    for (let s = 0; s < N; s++) {
      const tag = `${k.id}|qa${s}`, P = G.make(tag), why = [];
      if (!P) { bad[k.id] = "作れない：" + tag; break; }
      const q = searchQ(P), key = (a) => a.map(([x, y]) => `${x}-${y}`).join();
      if (key(P.ok) !== q.ok.join()) why.push("言われたメーターがそろう線の組が全探索とちがう");
      if (key(P.all) !== q.all.join() || P.can !== q.all.length > 0) why.push("3つそろう線の組が全探索とちがう");
      if (P.why !== q.why) why.push(`2段目の答え ${P.why} が全探索（${q.why}）とちがう`);
      if (q.passNoCap) why.push("合格する人に力ある人がいない線がある（どの線でも1人以上いるはず）");
      if (!q.rateSame && q.all.length) why.push("力ありの割合がちがうのに3つそろう組がある（理論とちがう）");
      if (P.A.n !== P.A.cnt.flat().reduce((a, b) => a + b) || P.B.n !== P.B.cnt.flat().reduce((a, b) => a + b) || P.A.n < 20 || P.A.n > 40 || P.B.n < 20 || P.B.n > 40) why.push("人数が20〜40人でない");
      if (k.ask !== "RFV" && !q.ok.length) why.push("2つの問題なのに、そろう線の組が無い");
      if (q.ok.includes(`${P.start[0]}-${P.start[1]}`)) why.push("はじめの線で、もうそろっている");
      if ((k.id === "same" || k.id === "same2") && !(q.rateSame && q.all.length)) why.push("割合が同じ組なのに3つそろわない");
      if ((k.id === "diff" || k.id === "close" || k.id === "perf") && q.rateSame) why.push("割合がちがう組のはずが同じ");
      if (k.id === "shape" && !(q.rateSame && !q.all.length)) why.push("分かれ方のちがう組のはずが、割合がちがうか3つそろう");
      if (k.id === "perf" && !(splitQ(P.A.cnt) && splitQ(P.B.cnt))) why.push("点で完全に分かれていない");
      if ((k.id === "diff" || k.id === "close") && !q.rf.length) why.push("割合がちがう3つの問題で、合格率と見逃し率がそろう組が無い");
      if (k.sz === "eq" ? P.A.n !== P.B.n : P.A.n === P.B.n) why.push("人数の作り方がちがう");
      if ([...P.opts].sort().join() !== [...G.WK].sort().join()) why.push("2段目の選び肢が4つでない");
      if (P.src.length !== 3 || P.src.some((x) => !Array.isArray(x) || !/^https:\/\/arxiv\.org\/abs\/(1609\.05807|1703\.00056|1610\.02413)$/.test(x[1]))) why.push("出典が無い");
      if (JSON.stringify(G.make(tag)) !== JSON.stringify(P)) why.push("同じ種で同じにならない");
      if (why.length && !bad[k.id]) bad[k.id] = why.join("・") + "：" + tag;
    }
  }
  check(`問題：${G.KINDS.length}種類×300の種で、そろう線の組・3つそろう組・2段目の答えが別に書いた全探索（81通り）と同じ・作り方どおり・出典がある`, Object.keys(bad).length === 0, JSON.stringify(bad));
  check("問題：種類は12（やさしい3・ふつう5・むずかしい4）", G.KINDS.length === 12 && [0, 1, 2].map((l) => G.kindsOf(l).length).join() === "3,5,4");
  // 理論の見張り：力ありの割合がちがう組は、どんな点の並びでも3つそろわない（ゲームとは別に、でたらめな点の並びを2万組つくって全探索する）
  { let bad2 = 0, seenSame = 0; const R = G.rng(7);
    for (let s = 0; s < 20000; s++) {
      const mk = (n) => { const cnt = Array.from({ length: 10 }, () => [0, 0]); cnt[9][0] = 1; cnt[0][1] = 1; for (let i = 2; i < n; i++) cnt[Math.floor(R() * 10)][R() < 0.5 ? 0 : 1]++; return { cnt }; };
      const P = { A: mk(20 + Math.floor(R() * 21)), B: mk(20 + Math.floor(R() * 21)), ask: "RFV" }, q = searchQ(P);
      if (!q.rateSame && q.all.length) bad2++; if (q.rateSame && q.all.length) seenSame++;
    }
    check("理論：力ありの割合がちがう2組は、でたらめな点の並び2万組でも3つそろう線の組が無い（V×R＝p×(1−F)）", bad2 === 0, `${bad2}組・割合が同じで3つそろった組 ${seenSame}`); }
  const ans = {}; for (const k of G.KINDS) for (let s = 0; s < 100; s++) { const P = G.make(`${k.id}|w${s}`); ans[P.why] = (ans[P.why] || 0) + 1; }
  check("2段目の答えは3つ（same・diff・shape）とも出る（いつも同じ答えにしない）", ans.same > 100 && ans.diff > 100 && ans.shape >= 100 && !ans.size, JSON.stringify(ans));
  check("説明は60字以内（やさしい日本語。一文を短く）", Object.values(G.WHY).every((w) => [...w.ex].length <= 60) && G.SCENES.every((x) => [...x].length <= 40));
  const keys = new Set(); for (const k of G.KINDS) for (let s = 0; s < 40; s++) keys.add(G.keyOf(G.make(`${k.id}|n${s}`)));
  check("問題の数：種類×種で300通り以上（game-dev.md F6）", keys.size >= 300, keys.size);
}
{
  // 今日の5問・上級の組み方（3年分）
  const bad = [], cover = new Set(); let sameAsPrev = 0, prev = "";
  const d0 = Date.parse("2026-11-27");
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(d0 + i * 864e5).toISOString().slice(0, 10), dl = G.dailyTags(d), hl = G.hardTags(d);
    const dk = dl.map((t) => t.split("|")[0]), hk = hl.map((t) => t.split("|")[0]);
    if (dl.length !== 5 || new Set(dk).size !== 5 || dk.map((k) => G.BY[k].lv).join() !== "0,0,1,1,2") bad.push(d + " 今日");
    if (hl.length !== 3 || new Set(hk).size !== 3 || hk.some((k) => G.BY[k].lv !== 2) || hk.includes(dk[4])) bad.push(d + " 上級");
    if (JSON.stringify(dl) !== JSON.stringify(G.dailyTags(d))) bad.push(d + " 同じにならない");
    if (dk.join() === prev) sameAsPrev++; prev = dk.join();
    if (i < 60) [...dk, ...hk].forEach((k) => cover.add(k));
  }
  check("今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）と上級（むずかしい3・今日のむずかしいと別の種類）を3年分作れる", bad.length === 0, bad.slice(0, 5).join(","));
  check("2か月のうちに12種類が全部出る・前の日と同じ組の日が少ない", cover.size === 12 && sameAsPrev < 120, `${cover.size}種類・前の日と同じ ${sameAsPrev}日`);
  // 過去の日の問題が変わらない（data.js を直したときの見張り）
  const snap = ["2026-11-27", "2026-11-28", "2027-01-01"].map((d) => [...G.dailyTags(d), ...G.hardTags(d)].map((t) => { const P = G.make(t); return `${P.kind}:${P.v}:${[P.A, P.B].map((g) => g.cnt.map((x) => x.join(".")).join("/")).join("|")}`; }).join(",")).join(";");
  check("過去の日（2026-11-27・11-28・2027-01-01）の5問と上級3問が作ったときのまま（種類・場面・A組とB組の点数の柱。種類・場面を足す・並べ替える・消すと変わる）", snap === PINS, snap);
}

// ---- 2. ファイルの中身 ----
const html = readFileSync(path.join(root, "index.html"), "utf8"), gen = readFileSync(path.join(root, "data.js"), "utf8"), readme = readFileSync(path.join(root, "README.md"), "utf8");
// ひな形の写し（<!-- 名前:begin〜end -->）はゲームの言葉ではないので外し、Core.kofi・Core.KOFI は写す前の形にもどして見る（shared-workflows の sync-template が足した）
const gameOwn = (t) => t.replace(/<!-- ([a-z0-9-]+):begin[\s\S]*?<!-- \1:end -->/g, "").split("${Core.KOFI}").join("https://ko-fi.com/satouaaaaa").replace(/Core\.kofi\(("(?:[^"\\]|\\.)*"), ("(?:[^"\\]|\\.)*")\)/g, (m, a, b) => "`<p class=\"note kofi\">" + JSON.parse(a) + "、<a href=\"https://ko-fi.com/satouaaaaa\" target=\"_blank\" rel=\"noopener\">Ko-fi でコーヒー1杯の応援</a>をもらえると、" + JSON.parse(b) + "の励みになります（任意・遊ぶのはずっと無料）。</p>`");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない（出典のリンクは押したときに開くだけ）", ext.length === 0 && ![...html.matchAll(/<script[^>]+src="([^"]+)"/g)].some((m) => /^https?:/.test(m[1])), ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習・とことんの種だけ（今日の5問・上級は日付の乱数。data.js には無い）", (html.match(/Math\.random/g) || []).length === 2 && !/Math\.random/.test(gen));
check("乱数は sort の比較の中で引かない（ブラウザで引く回数が変わる）", !/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/.test(html + gen));
{ const inl = html.split("<script>").slice(1).map((x) => x.split("</" + "script>")[0]).join("\n"); // index.html の中の script も見る（nemuri-kotsu#1 で行の途中に // を入れて画面が動かなくなった）
  check("一行の式の途中にコメント // を足さない（行の残りが消える。rosen-hitofude 2026-11-04・nemuri-kotsu#1）", !/;\s*\/\/[^\n]*;\s*\w/.test((gen + "\n" + inl).split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"))); }
check("言い方：「絶対」「必ず公平」と言い切らない", !/絶対に|必ず公平|これが正しい公平/.test(gameOwn(html) + gen + readme));
{ const howto = (html.match(/<dialog id="howto"[\s\S]*?<\/dialog>/) || [""])[0], ab = (html.match(/function about\(\)[\s\S]*?\n}/) || [""])[0], dis = (t) => /架空/.test(t) && /実在の試験や人の集まりとは関係ありません/.test(t);
  check("言い方：遊び方・「このゲームについて」・README のどれにも、点数・組・人が架空で、実在の試験や集まりと関係ないことがある", dis(howto) && dis(ab) && dis(readme), `遊び方 ${dis(howto)}・について ${dis(ab)}・README ${dis(readme)}`); }
check("言い方：実在の集団（人種・性別・国・実在の試験）の名前を出さない。組は A・B だけ", !/人種|性別|男性|女性|黒人|白人|国籍|司法試験|共通テスト|センター試験|COMPAS|再犯/.test(gameOwn(html).replace(/<!-- a11y:begin[\s\S]*?a11y:end -->/, "").replace(/<!-- core:begin[\s\S]*?core:end -->/, "") + gen + readme));
{ const ab = (html.match(/function about\(\)[\s\S]*?\n}/) || [""])[0];
  check("このゲームについて：3つの論文の出典（題名・著者・年・URL）と、言い切らない一文がある", /Kleinberg/.test(ab + gen) && /Chouldechova/.test(ab + gen) && /Hardt/.test(ab + gen) && /解釈は分かれ/.test(ab) && /定義そのものではなく/.test(ab) && Object.values(G.SRC).every(([n, u]) => /（20\d\d）/.test(n) && /^https:\/\/arxiv\.org\/abs\//.test(u))); }
// 写し元（屋台の値下げ合戦 yatai-negasen、その写し元の風力階級よみ）の言葉が残っていない（game-dev.md A 手順5）
check("写し元（屋台の値下げ合戦・風力階級よみ）の言葉が残っていない（game-dev.md A 手順5）", !/屋台|値下げ|性格帳|しっぺ返し|Axelrod|アクセルロッド|囚人のジレンマ|ytn-|YTN|yatai|みどり屋|団子|縁日|軒|風力|風速|気象庁|ノット|fry-|FRY|fuuryoku|まなび帳/.test(gameOwn(html).replace(/<!-- a11y:begin[\s\S]*?a11y:end -->/, "").replace(/<!-- store:begin[\s\S]*?store:end -->/, "").replace(/<!-- core:begin[\s\S]*?core:end -->/, "").replace(/<!-- kiroku:begin[\s\S]*?kiroku:end -->/, "") + gen + readme + readFileSync(path.join(root, "manifest.webmanifest"), "utf8") + readFileSync(path.join(root, "tools/make-og.cjs"), "utf8") + readFileSync(path.join(root, "tools/make-icons.cjs"), "utf8") + readFileSync(path.join(root, "sw.js"), "utf8").replace(/^\/\/.*$/gm, "")));
// ゲームごとに手で書く所が、このゲームの言葉で書いてある（incidents/2026-11-18-game-copy-hand-written-text.md・game-copy-manifest-feedback.md）
{ const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1] || "", mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8")), og = readFileSync(path.join(root, "tools/make-og.cjs"), "utf8");
  check("手で書く所（description・遊び方・2段目・ホームの1行目・manifest・共有画像）がこのゲームの言葉", /合格ライン/.test(desc) && /3つのメーター/.test(desc) && /合格ライン/.test((html.match(/<dialog id="howto"[\s\S]*?<\/dialog>/) || [""])[0]) && /3つ全部をそろえる線の組は/.test(html) && /3つの公平メーターをそろえる/.test(html) && /公平メーター/.test(mf.description) && /合格率/.test(og) && /当たり率/.test(og)); }
// 共有画像の例：合格率・見逃し率がそろい、当たり率がずれる数は V×R＝p×(1−F) と合う（A 40%・B 約53% の組）
{ const og = readFileSync(path.join(root, "tools/make-og.cjs"), "utf8"), m = [...og.matchAll(/meter\("([^"]+)", (\d+), (\d+), (true|false)\)/g)].map((x) => [x[1], +x[2], +x[3], x[4] === "true"]);
  const [R, F, V] = m; const pA = (V[1] / 100) * (R[1] / 100) / (1 - F[1] / 100), pB = (V[2] / 100) * (R[2] / 100) / (1 - F[2] / 100);
  check("共有画像の例の数は式（当たり率×合格率＝力ありの割合×(1−見逃し率)）と合い、そろった印は値が同じときだけ", m.length === 3 && m.every((x) => x[3] === (x[1] === x[2])) && pA > 0 && pA < 1 && pB > 0 && pB < 1, JSON.stringify(m)); }
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ツッコミ|なんでやねん|（うそ）/.test(html + gen));
check("引き継ぎ：transfer.js をゲームの script より前に、このゲームの記録のキー（記録・文字・復習）だけで読む・depth.js も前に読む", /<script src="transfer\.js" data-game="gokaku-line" data-keys="gkl-v1,gkl-fs,gkl-depth"><\/script>\s*<script src="depth\.js" data-game="gokaku-line" data-key="gkl-depth"><\/script>\s*<\/head>/.test(html) && html.indexOf('src="transfer.js"') < html.indexOf('src="data.js"') && /data-hk/.test(html) && existsSync(path.join(root, "transfer.js")));
check("好きなだけ遊べる：チケット・回数の上限・🔒で開くモードを入れない（game-dev.md F1・F2）", !/🎫|チケット|すると開く|🔒/.test(gameOwn(html)) && !/\blife\b|ELIFE/.test(gameOwn(html)));
check("時間制限を入れない（setInterval・残り秒を使わない）", !/残り\d*秒|制限時間|setInterval\(/.test(html.replace(/<!-- (a11y|core|kiroku|store):begin[\s\S]*?\1:end -->/g, "")));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/gokaku-line/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームの name が3字以上（2字だとフォームが出ない。shared-workflows incidents/2026-11-05-feedback-form-not-shown.md）", [...((fy.match(/^name:\s*(.+)$/m) || [])[1] || "").trim()].length >= 3);
  check("感想フォームは名前・メールを聞かない", /id: fun/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readme.replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1]);
  check("PWA：sw.js は画面のファイルを全部保存し（引き継ぎの transfer.js・深さの depth.js も）、取り直して保存し、外へ何も送らない", ["./index.html", "./data.js", "./transfer.js", "./depth.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].every((f) => shell.includes(f)) && /cache: "reload"/.test(sw) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")) && /CACHE = "gkl-v\d+"/.test(sw));
  { const st = await checkSwStall(sw); check("PWA：通信が止まっても4秒ほどで保存した画面に切り替わり、少しずつ届く受信は待ち、何も無ければ60秒で返す（shared-workflows template/qa/sw-check.mjs）", st.ok, JSON.stringify(st)); }
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "合格ラインのつまみ" && mf.icons.length >= 2 && mf.start_url === "./"); }

// ---- 3. ブラウザで遊ぶ ----
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(root, p === "/" ? "index.html" : p);
  if ((f !== root && !f.startsWith(root + path.sep)) || !existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
}).listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const errors = [];
// 時計は検査の始めに一度だけ決め、日本時間のその日の正午から進める（期待値の TODAY とブラウザの日付を同じにし、午前0時をまたいでも日がずれない）
const NOON = Date.parse(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) + "T03:00:00Z"), CLOCK = NOON - Date.now();
const TODAY = new Date(NOON + 9 * 3600e3 + SHIFT0).toISOString().slice(0, 10);
async function ctxOf(opts = {}, extra = 0) {
  const c = await browser.newContext({ viewport: { width: 390, height: 800 }, ...opts });
  await c.addInitScript((sh) => { const o = Date.now; Date.now = () => o() + sh; }, CLOCK + SHIFT0 + extra);
  return c;
}
async function newPage(w = 390, ctx) {
  const c = ctx || await ctxOf({ viewport: { width: w, height: 800 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
  await p.goto(url); await p.waitForTimeout(200);
  return p;
}
const closeHow = async (p) => { await firstClose(p); };
const mem = (p) => p.evaluate(() => JSON.parse(localStorage.getItem("gkl-v1") || "{}"));
// つまみ（−・＋のボタン）を押して、線を t へ動かす
async function moveTo(p, gi, t) { for (let i = 0; i < 12; i++) { const now = await p.evaluate((g) => __nm.cur().ln[g], gi); if (now === t) return; await p.click(`#${now < t ? "up" : "dn"}${gi}`); } }
// 1段目に正しく答える（そろう線の組があればそこへ動かして決める。3つの問題でそろわないなら「そろわない」）
async function right1(p) {
  const P = await p.evaluate(() => { const c = __nm.cur(); return { ok: c.P.ok, ask: c.P.ask, can: c.P.can, step: c.step }; });
  if (P.step === 2) return;
  if (P.ask === "RFV" && !P.can) return p.click("#none");
  const [a, b] = P.ok[0]; await moveTo(p, 0, a); await moveTo(p, 1, b); await p.click("#decide");
}
// 1段目でまちがえる（はじめの線はそろっていないので、そのまま「決める」）
async function wrong1(p) { await p.evaluate(() => { const c = __nm.cur(); c.ln = c.P.start.slice(); }); await p.click("#decide"); }
const why = async (p) => { await p.waitForSelector(".verdict, .why button"); if (await p.locator(".verdict").count()) return; await p.click(`.why button[data-g="${await p.evaluate(() => __nm.cur().P.why)}"]`); };
async function solve(p, { wrong = 0 } = {}) {
  for (let i = 0; i < wrong; i++) await wrong1(p);
  await right1(p);
  await why(p);
  await p.waitForSelector(".verdict");
}

try {
  // はじめて：遊び方が出る・文字の大きさ
  const p = await newPage();
  check("はじめて開くと遊び方が出る", await p.locator("#core-coach").waitFor({ timeout: 3000 }).then(() => true, () => false));
  { const c = await ctxOf(); const r = await c.newPage(); await r.goto(url); await r.waitForTimeout(200); let again = 0;
    for (let i = 0; i < 10; i++) { await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.reload(); await r.waitForTimeout(200); again += await r.locator("#howto[open]").count(); }
    check("遊び方を Esc で閉じてすぐ読み直しても出ない（10回）", again === 0);
  { const c = await ctxOf(); const r = await c.newPage(); const big = []; // 題が h1{flex:1} で縦に伸び（伸びない形と比べて4pxより高ければ失敗）、iPad の縦で大きなすき間が出た（shared-workflows incidents/2026-11-07-title-stretched.md）
    for (const [w, h] of [[820, 1180], [390, 844], [1280, 800]]) { await r.setViewportSize({ width: w, height: h }); await r.goto(url); await r.waitForTimeout(200); await r.keyboard.press("Escape"); await r.waitForTimeout(100);
      const v = await r.evaluate(() => { const e = [...document.querySelectorAll(".title")].find((x) => x.offsetParent); if (!e) return null; const h = e.getBoundingClientRect().height; const f = e.style.flex; e.style.flex = "none"; const n = e.getBoundingClientRect().height; e.style.flex = f; return h - n; });
      if (v === null || v > 4) big.push(`${w}x${h}:${v === null ? "題なし" : "+" + Math.round(v) + "px"}`); }
    check("ホームの題は縦長の画面でも縦に伸びない（820×1180・390×844・1280×800）", big.length === 0, big.join(" ")); await c.close(); }
    await r.evaluate(() => localStorage.clear()); await r.reload(); await r.waitForTimeout(200);
    check("はじめての練習が始まったその場で「見た」が残る", await r.evaluate(() => { return Object.keys(localStorage).some((k) => { try { return JSON.parse(localStorage.getItem(k)).tut === true; } catch { return false; } }); })); await firstClose(r);
    await r.reload(); await r.waitForTimeout(200); check("遊び方を「わかった」で閉じてすぐ読み直しても出ない（その場で残す）", await r.locator("#howto[open]").count() === 0); await c.close(); }
  await firstClose(p);
  check("文字の大きさ：はじめは「大きい」（19px）", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "19px");
  await p.click('.fsrow button[data-fs="3"]');
  await p.reload(); await p.waitForTimeout(150);
  check("文字の大きさ：「とても大きい」にすると開き直しても残る", await p.evaluate(() => getComputedStyle(document.documentElement).fontSize) === "23px" && await p.locator('.fsrow button[data-fs="3"][aria-pressed="true"]').count() === 1);
  await p.click('.fsrow button[data-fs="2"]');
  check("ホームに今日のきほんが出る", (await p.textContent("#tip")).includes("今日のきほん"));

  // 今日の5問：1問目はまちがえる、2問目はヒント2回、ほかはそのまま
  await p.click("#go-d");
  const tags = await p.evaluate(() => __nm.load().runs.d.list);
  check("今日の5問は日付から決まる（data.js の dailyTags と同じ）", JSON.stringify(tags) === JSON.stringify(G.dailyTags(TODAY)));
  check("問題の画面：2組の柱（10本ずつ）・つまみ2つ（−＋は44px以上）・メーター3つ・決めるボタン", await p.locator(".hist").count() === 2 && await p.locator(".hist .col").count() === 20 && await p.locator(".knob input[type=range]").count() === 2 && (await p.$$eval(".knob .sub", (b) => b.map((x) => Math.round(x.getBoundingClientRect().height)))).every((h) => h >= 44) && await p.locator(".mt").count() === 3 && await p.locator("#decide").count() === 1);
  check("●力あり・○力なしは形でも分ける（塗り・輪）・柱の中身は読み上げ用の文でも分かる", await p.evaluate(() => { const c = document.querySelector(".p.c"), n = document.querySelector(".p.n"); return !!c && !!n && getComputedStyle(n).borderTopWidth !== "0px" && getComputedStyle(c).borderTopWidth === "0px"; }) && /力あり\d+人・力なし\d+人/.test(await p.textContent("#g0 .vh")));
  { const P0 = await p.evaluate(() => { const c = __nm.cur(); return { ln: c.ln.slice(), A: c.P.A, B: c.P.B }; });
    await p.click("#up0"); await p.waitForTimeout(50);
    const after = await p.evaluate(() => [__nm.cur().ln.slice(), document.querySelector("#g0 .col.edge") && [...document.querySelectorAll("#g0 .col")].indexOf(document.querySelector("#g0 .col.edge")), document.querySelector('.mt[data-m="R"] .vals').textContent]);
    const q = countQ(P0.A.cnt, P0.ln[0] + 1);
    check("つまみの＋で線が1つ上がり、柱の色の境とメーター（合格率の分数）が変わる", after[0][0] === P0.ln[0] + 1 && after[1] === P0.ln[0] + 1 && after[2].includes(`（${q.s}/${q.n}）`), JSON.stringify(after));
    await p.click("#dn0"); }
  check("メーターは、そろっていないと「✕ 差」、そろうと「✓ そろった」の文字（色だけで分けない）", (await p.$$eval(".mt .st", (e) => e.map((x) => x.textContent))).every((t) => /^(✓ そろった|✕ 差 )/.test(t)));
  await wrong1(p);
  check("まちがえると ✕ とそろっていないメーターの名前・知らせは role=status", /✕ まだ「/.test(await p.textContent("#msg")) && await p.getAttribute("#msg", "role") === "status" && await p.evaluate(() => __nm.cur().wrong.length) === 1);
  await p.click("#decide"); await p.waitForTimeout(50);
  check("同じ線のまま何度押しても、まちがいは1回だけ数える", await p.evaluate(() => __nm.cur().wrong.length) === 1);
  // 開き直しても、まちがいとつまみの位置は残る
  await p.click("#up1"); const lnBefore = await p.evaluate(() => __nm.cur().ln.slice());
  await p.reload(); await p.waitForTimeout(150); await p.click("#go-d");
  check("途中で閉じても続きから（同じ問題・まちがい・つまみの位置のまま）", await p.evaluate(() => __nm.cur().wrong.length) === 1 && await p.evaluate(() => __nm.cur().i) === 0 && JSON.stringify(await p.evaluate(() => __nm.cur().ln)) === JSON.stringify(lnBefore));
  await solve(p);
  check("正解すると「正解」・全探索の数（81通り）・式・なぜの説明・出典のリンク・★2（まちがい1回）", (await p.textContent(".verdict .hd")).includes("正解") && /81通り/.test(await p.textContent("#count")) && (await p.textContent(".formula")).includes("当たり率 × 合格率") && (await p.textContent(".verdict .why")).length > 15 && await p.locator(".verdict .src a").count() === 3 && (await p.getAttribute(".verdict .stars", "aria-label")) === "星2つ");
  { // 結果の式の数が、ゲームとは別に数えた値と合う（A組）
    const f = await p.evaluate(() => { const c = __nm.cur(), P = c.P, ex = P.all.length ? P.all[0] : c.ln; return { cnt: P.A.cnt, t: ex[0], txt: document.querySelector(".formula").textContent }; });
    const q = countQ(f.cnt, f.t), pc = (a, b) => `${(Math.round((1000 * a) / b) / 10).toFixed(1)}%`;
    check("結果の式（A組）の4つの値が、別に数えた当たり率・合格率・力ありの割合・(1−見逃し率)と同じ", f.txt.includes(`${pc(q.x, q.s)} × ${pc(q.s, q.n)} ＝ ${pc(q.c, q.n)} × ${pc(q.x, q.c)}`), f.txt); }
  await p.click("#next");
  await p.click("#hint");
  check("ヒント1は見るところを言う（線は動かさない）", (await p.textContent("#hintbox")).includes("💡"));
  const okA = await p.evaluate(() => __nm.cur().P.ok);
  await p.click("#hint");
  check("ヒント2は、そろう組があれば A組の線をそこへ動かす・ヒントは2回まで", await p.locator("#hint:disabled").count() === 1 && (okA.length ? (await p.evaluate(() => __nm.cur().ln[0])) === okA[0][0] && (await p.textContent("#hintbox")).includes("A組の線を") : true));
  await solve(p);
  check("ヒント2回は★1", (await p.getAttribute(".verdict .stars", "aria-label")) === "星1つ");
  await p.click("#next");
  check("次の問題へ進むと、フォーカスが問題（#card）に移る", await p.evaluate(() => document.activeElement && document.activeElement.id) === "card");
  for (let i = 2; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const s1 = await mem(p);
  check("5問で結果：今日の記録に1問ごとのまちがい（1・2・0・0・0）", JSON.stringify(s1.days[TODAY]?.m) === "[1,2,0,0,0]", JSON.stringify(s1.days));
  const share = await p.textContent(".share");
  check("シェアの文に答え・問題を出さない（印だけ）", /第\d+回/.test(share) && /🟢/.test(share) && !G.KINDS.some((k) => share.includes(k.name)) && !/割合/.test(share), share);
  check("まちがいのある日は Ko-fi の一言を出さない", await p.locator(".kofi").count() === 0);
  check("結果に「あと少しの実績」と、続けて遊ぶ・上級のボタン", await p.locator("#achnext").count() === 1 && await p.locator("#go-e").count() === 1 && await p.locator("#go-h").count() === 1);
  check("つまみ帳に解いた種類が載る", Object.keys(s1.dex).length === 5);
  await p.click("#back");
  check("今日を終えたら、ホームは「今日の結果を見る」と上級", (await p.textContent("#go-d")).includes("結果") && await p.locator("#go-h").count() === 1);
  // 上級：ヒントなし・3問
  await p.click("#go-h");
  check("上級はヒントのボタンが無い・3問", await p.locator("#hint").count() === 0 && (await p.evaluate(() => __nm.load().runs.h.list.length)) === 3);
  for (let i = 0; i < 3; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  check("上級の記録は hdays に入る", (await mem(p)).hdays[TODAY]?.m.length === 3);
  // 練習：記録を増やさない
  await p.click("#back"); await p.click("#go-p"); await p.click('.lv button[data-t="2"]');
  const before = await mem(p);
  for (let i = 0; i < 5; i++) { await solve(p); await p.click("#next"); }
  await p.waitForTimeout(150);
  const after = await mem(p);
  check("練習は今日の記録を増やさない（つまみ帳の数はふえる）", JSON.stringify(after.days) === JSON.stringify(before.days) && Object.values(after.dex).reduce((a, b) => a + b) === Object.values(before.dex).reduce((a, b) => a + b) + 5);
  // つまみ帳からその種類だけで練習
  await p.click("#back"); await p.click("#go-dex");
  const firstKind = await p.getAttribute(".book button", "data-k");
  await p.click(".book button");
  check("つまみ帳の種類を押すと、その種類だけで練習", (await p.evaluate(() => __nm.load().runs.p.list)).every((t) => t.startsWith(firstKind + "|")));
  // とことん：まちがえてもヒントを使っても続き、「ここで降りる」で終わる（game-dev.md F1）
  await p.click("#back"); await p.click("#go-e");
  check("とことんは60問の並びから・ライフ（🌸・🎫）が無い", (await p.evaluate(() => __nm.load().runs.e.list.length)) === 60 && !("life" in await p.evaluate(() => __nm.load().runs.e)) && await p.locator("#quit").count() === 1);
  await solve(p); await p.click("#next"); await solve(p); await p.click("#next");
  await solve(p, { wrong: 1 }); await p.click("#next");
  await p.click("#hint"); await p.click("#hint"); await solve(p); await p.click("#next");
  check("とことんはまちがい・ヒント2回でも終わらない", await p.locator("#card").count() === 1 && await p.evaluate(() => __nm.load().runs.e.res.length) === 4);
  await p.reload(); await p.waitForTimeout(200);
  check("とことんは閉じても続きから", (await p.textContent("#go-e")).includes("続きから"));
  await p.click("#go-e");
  {
    // 別のタブでこの回を終えて新しい回を始めていたら、古い画面の「ここで降りる」は新しい回を終えない（funka-level #1 の CodeRabbit）
    const keep0 = await p.evaluate(() => __nm.load().runs.e);
    await p.evaluate(() => __nm.save((s) => { s.runs.e = Object.assign({}, s.runs.e, { id: "other-tab-run", res: [] }); }));
    await p.click("#quit"); await p.waitForTimeout(150);
    check("古い画面の「ここで降りる」は、別のタブで始めた新しい回を終えない", (await p.evaluate(() => __nm.load().runs.e && __nm.load().runs.e.id)) === "other-tab-run");
    await p.evaluate((r) => __nm.save((s) => { s.runs.e = r; }), keep0);
    await p.evaluate(() => __nm.play("e"));
  }
  await p.click("#quit"); await p.waitForTimeout(150);
  check("「ここで降りる」で終わり、一度で解いた数（2問）が自己ベストに残る", (await mem(p)).ebest === 2 && (await p.textContent("#eres")).includes("4問") && !("e" in (await mem(p)).runs && (await mem(p)).runs.e));
  {
    // とことんの並びを何十回作って、1回の中で同じ問題が無い・続けて同じ種類が無い・足しても重ならない
    const r = await p.evaluate(() => { const K = __nm.G, bad = []; for (let n = 0; n < 40; n++) { const l = __nm.endlessList(), more = l.concat(__nm.moreList(l)); const ks = more.map((t) => K.keyOf(K.make(t))); if (new Set(ks).size !== ks.length) bad.push("重なり"); if (more.some((t, i) => i && t.split("|")[0] === more[i - 1].split("|")[0])) bad.push("同じ種類が続く"); if (l.length !== 60 || more.length !== 100) bad.push("数" + l.length + "/" + more.length); } return bad; });
    check("とことんの並び40回：60問＋足した40問で同じ問題も同じ種類の連続も無い（game-dev.md F6）", r.length === 0, r.slice(0, 3).join(","));
  }
  {
    // 引き継ぎコードなどで数の所に文字が入っても、画面に HTML として出さない
    const q = await newPage(); await closeHow(q);
    await q.evaluate(() => { const s = JSON.parse(localStorage.getItem("gkl-v1")) || { v: 1 }; s.ebest = '<img id="xss" src=x>'; s.dex = { e: '"><b id="xss2">' }; s.runs = { e: { mode: "e", id: '"><i id="xss3">', date: "2026-11-07", list: ["rf|1"], res: [] }, h: { list: "bad", res: [] }, p: { mode: "p", id: "y", date: "2026-11-07", list: ["constructor|1"], res: [] }, d: { mode: "d", id: "z", date: "x", list: ["rf|1"], res: [] }, "a:2026-11-06": { mode: "a", id: "a1", date: "2026-11-06", list: ["rf|1"], res: [null] }, "a:2026-11-05": { mode: "a", id: "a2", date: "2026-11-05", list: "bad", res: [] }, "a:2026-11-04": { mode: "a", id: "a3", date: "2026-11-04", list: ["rf|1", "rf|2"], res: [{ m: 0 }], cur: { i: 1, tag: "rf|2", wrong: "x", hints: 0 } } }; s.days = { "2026-11-07": { m: "x" }, bad: { m: [0] }, "2026-02-30": { m: [0] } }; localStorage.setItem("gkl-v1", JSON.stringify(s)); });
    await q.reload(); await q.waitForTimeout(250);
    const st = await q.evaluate(() => __nm.load());
    check("記録の形を直す：数の所の文字は0に・形のちがう途中経過と日ごとの記録は捨てる", st.ebest === 0 && st.dex.e === 0 && st.runs.e && !("h" in st.runs) && !("p" in st.runs) && !("d" in st.runs) && !("a:2026-11-06" in st.runs) && !("a:2026-11-05" in st.runs) && st.runs["a:2026-11-04"] && st.runs["a:2026-11-04"].cur === null && Object.keys(st.days).length === 0);
    await q.click("#go-e").catch(() => {}); await q.waitForTimeout(150);
    {
      // 知らない mode や、置き場とちがう mode の途中経過は捨てる（ホームが出なくなるのを防ぐ）
      const z = await newPage(); await closeHow(z);
      await z.evaluate(() => { const s = JSON.parse(localStorage.getItem("gkl-v1")) || { v: 1 }; s.v = 1; s.runs = { d: { mode: "x", date: "2026-11-07", list: [], res: [] }, h: { mode: "d", date: "2026-11-07", list: [], res: [] } }; localStorage.setItem("gkl-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200);
      const r = await z.evaluate(() => __nm.load().runs);
      check("知らない mode の途中経過は捨て、ホームが出る", !("d" in r) && !("h" in r) && await z.locator("#go-d").count() === 1);
      // 別のタブで終えたまま記録していない上級の回は、次の回を始める前に記録する
      await z.evaluate(() => { const s = __nm.load(), y = "2026-11-06", G = __nm.G; s.runs.h = { mode: "h", date: y, list: G.hardTags(y), res: [{ m: 0 }, { m: 0 }, { m: 0 }], cur: null, id: "old" }; localStorage.setItem("gkl-v1", JSON.stringify(s)); });
      await z.reload(); await z.waitForTimeout(200); await z.evaluate(() => __nm.start("h"));
      check("終えたまま残った前の日の回は、上書きする前に記録する", !!(await mem(z)).hdays["2026-11-06"]);
      // とことんで足せる問題が無くても、くり返し呼んで固まらない
      const ok = await z.evaluate(() => { const s = __nm.load(); s.runs.e = { mode: "e", date: __nm.todayKey(), list: ["rf|1", "rv|1"], res: [{ m: 0 }, { m: 0 }], cur: null, id: "e1" }; localStorage.setItem("gkl-v1", JSON.stringify(s)); const ml = __nm.setMore(() => []); try { __nm.play("e"); return true; } catch (e) { return String(e); } finally { __nm.setMore(ml); } });
      check("とことんで足せる問題が無くても固まらずに終える", ok === true && await z.locator("#eres").count() === 1, String(ok));
      // 途中のつまみの位置に、線の範囲の外や文字が入っても、はじめの線で始める
      await z.evaluate((d) => { localStorage.setItem("gkl-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: {}, runs: { p: { mode: "p", date: d, list: ["rf|ln1"], res: [], cur: { i: 0, tag: "rf|ln1", wrong: [], hints: 0, ln: [0, "<b>"] }, id: "lnx" } }, kofi: {}, ach: {}, ebest: 0 })); }, TODAY);
      await z.reload(); await z.waitForTimeout(150); await z.evaluate(() => __nm.play("p"));
      check("途中のつまみの位置が壊れていたら、はじめの線（1〜9）で始める", JSON.stringify(await z.evaluate(() => __nm.cur().ln)) === JSON.stringify(G.make("rf|ln1").start));
      await z.context().close();
    }
    check("記録の文字を HTML として出さない", await q.locator("#xss, #xss2, #xss3").count() === 0);
    await q.context().close();
  }
  // 実績・このゲームについて
  await p.click("#back"); await p.click("#go-ach");
  check("実績は13個で、腕前・集める・続けるの3つの組", await p.locator(".ach").count() === 13 && await p.locator(".agrp").count() === 3 && await p.locator(".ach.got").count() >= 3);
  check("達成した実績は ✓ の文字も付く（色だけで分けない）", (await p.textContent(".ach.got b")).startsWith("✓"));
  await p.click("#back"); await p.click("#f-about");
  check("このゲームについて：架空であること・式・3つの論文の出典のリンク", (await p.textContent("#about")).includes("架空") && (await p.textContent("#about")).includes("当たり率×合格率＝力ありの割合×(1−見逃し率)") && await p.locator('#about a[href^="https://arxiv.org/abs/"]').count() === 3);
  await p.context().close();

  // まちがいなしの日は Ko-fi を1回だけ
  {
    const q = await newPage(); await closeHow(q); await q.click("#go-d");
    for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
    await q.waitForTimeout(150);
    check("全部まちがいなしで初めて終えたときだけ Ko-fi の一言", await q.locator(".kofi").count() === 1 && (await q.textContent(".big")).includes("まちがいなし"));
    await q.click("#back"); await q.click("#go-d");
    check("結果をもう一度見ても Ko-fi は出さない", await q.locator(".kofi").count() === 0);
    await q.context().close();
  }

  // カレンダー・あとから：過去の日の記録を置いて見る。第1回から日がたっていなくても見られるよう、時計を10日進める
  {
    const SHIFT = 10 * 864e5, TODAY = new Date(NOON + 9 * 3600e3 + SHIFT0 + SHIFT).toISOString().slice(0, 10), dayBefore = (n) => new Date(Date.parse(TODAY) - n * 864e5).toISOString().slice(0, 10);
    const cx = await ctxOf({}, SHIFT);
    const q = await newPage(390, cx);
    await q.evaluate(([d2, d3]) => { localStorage.setItem("gkl-v1", JSON.stringify({ v: 1, tut: true, days: { [d2]: { m: [0, 0, 0, 0, 0], k: [] }, [d3]: { m: [1, 0, 0, 2, 0], k: [] } }, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }, [dayBefore(2), dayBefore(3)]);
    await q.reload(); await q.waitForTimeout(150);
    check("ホームの「続けて」は、きのうを休んだら — （休んだ日を責めない）", (await q.textContent(".stats")).includes("—"));
    await q.click("#go-cal");
    const lateList = await q.evaluate(() => __nm.lateDays(__nm.load()));
    const exp = [1, 4, 5, 6, 7].map(dayBefore).filter((d) => d >= "2026-11-27");
    check("カレンダー：取りこぼした過去7日（第1回より後）を押せる", JSON.stringify(lateList) === JSON.stringify(exp), lateList.join(","));
    check("カレンダー：遊んだ日は★の数の文字も付く", (await q.locator(".cal .c.p3").count()) + (await q.locator(".cal .c.p2").count()) + (await q.locator(".cal .c.p1").count()) >= (dayBefore(3).slice(0, 7) === TODAY.slice(0, 7) ? 2 : 0));
    if (lateList.length) {
      const d = lateList[0];
      await q.evaluate((d) => { const b = document.querySelector(`.cal .miss[data-k="${d}"]`); if (b) b.click(); else { const m = document.querySelector(".calnav #prev"); m && m.click(); } }, d);
      if (!(await q.locator("#card").count())) await q.click(`.cal .miss[data-k="${d}"]`);
      check("あとから：その日の今日の5問と同じ問題", JSON.stringify(await q.evaluate((d) => __nm.load().runs["a:" + d].list, d)) === JSON.stringify(G.dailyTags(d)));
      for (let i = 0; i < 5; i++) { await solve(q); await q.click("#next"); }
      await q.waitForTimeout(150);
      const s = await mem(q);
      check("あとからは adays に入り、今日の記録・続けた日には数えない", s.adays[d] && !s.days[d] && (await q.locator(".share").count()) === 0 && (await q.locator(".kofi").count()) === 0);
    } else check("あとから：遊べる日がある", false, "第1回の日から日がたっていない");
    await q.context().close();
  }

  // 終えた回（gone）がある側の保存に失敗し、別のタブが古い回を新しく保存しても、終えた回を戻さない（GameStore の after で落とす）
  {
    const g = await newPage();
    const left = await g.evaluate(() => {
      const r = { mode: "e", date: __nm.todayKey(), list: ["rf|1", "rv|1"], res: [{ m: 0 }], cur: null, id: "gone1" };
      const base = __nm.load();
      const a = JSON.parse(JSON.stringify(base)); a.runs.e = null; a.gone = { gone1: 1 }; a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.e = r; b.t = 200;
      localStorage.setItem("gkl-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.e; } finally { __nm.setMem(null); }
    });
    check("終えた回は、別のタブが新しく保存した古い写しから戻さない", !left, JSON.stringify(left));
    // 同じ問題の途中で、保存に失敗した側と保存できた側のまちがいを合わせる
    const got = await g.evaluate(() => {
      const base = __nm.load(), mk = (w, w2) => ({ mode: "p", date: __nm.todayKey(), list: ["rf|m1", "rv|m1"], res: [], cur: { i: 0, tag: "rf|m1", wrong: w, hints: 0, step: 2, w2, ln: [3, 4] }, id: "mg1" });
      const a = JSON.parse(JSON.stringify(base)); a.runs.p = mk(["L1-1"], ["size"]); a.t = 100;
      const b = JSON.parse(JSON.stringify(base)); b.runs.p = mk(["L2-2"], ["shape"]); b.t = 200;
      localStorage.setItem("gkl-v1", JSON.stringify(b)); __nm.setMem(JSON.stringify(a));
      try { return __nm.load().runs.p.cur; } finally { __nm.setMem(null); }
    });
    check("同じ問題の途中なら、保存に失敗した側のまちがい（1段目・2段目）も消さずに合わせる", got && got.wrong.includes("L1-1") && got.wrong.includes("L2-2") && got.w2.includes("size") && got.w2.includes("shape"), JSON.stringify(got));
    const n = await g.evaluate(() => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: ["rf|s1", "rv|s1"], res: [], cur: null, id: "sc1" }; }); __nm.play("p"); __nm.sureCount(true); __nm.sureCount(true); return __nm.load().runs.p.ds; });
    check("「自信あり」の数は1問につき1回だけ（2つのタブで同じ問題を当てても2回足さない）", n && n.n === 1 && n.ok === 1, JSON.stringify(n));
    await g.context().close();
  }

  // 古いタブ：同じ問題を2つのタブで開き、片方で答えたら、もう片方は二重に入れない
  {
    const ctx = await ctxOf();
    const a = await newPage(390, ctx); await closeHow(a); await a.click("#go-d");
    const b = await ctx.newPage(); b.on("pageerror", (e) => errors.push(e.message)); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await solve(a);
    await right1(b); await b.waitForTimeout(200); // 古いタブ b は1問目のまま。押しても、a が解いた1問目を二重に数えない
    const s = await mem(a);
    check("古いタブで同じ問題に答えても二重に数えない", s.runs.d.res.length === 1 && Object.values(s.dex).reduce((x, y) => x + y) === 1);
    // ヒントの数は、別のタブで使った分も減らさない
    await a.click("#next"); await b.goto(url); await b.waitForTimeout(150); await b.click("#go-d");
    await a.click("#hint"); await a.click("#hint");
    await b.click("#hint");
    check("別のタブで使ったヒントの数を減らさない", (await mem(a)).runs.d.cur.hints === 2);
    // 正解した時も、別のタブで使ったヒントを合わせて★を数える
    await right1(b); await why(b); await b.waitForTimeout(150);
    check("正解の時も別のタブのヒントを合わせて数える（★1）", (await mem(b)).runs.d.res[1].m === 2);
    await ctx.close();
  }

  // 1問を深くする（shared-workflows routines/game-dev.md「1問を深くする」）：自信をかける・2段目・復習
  {
    // 3つ全部・割合がちがう組（そろわない）・割合が同じ組（そろう）・2つの問題 を、今日の問題と重ならない種で選ぶ
    const pickTag = (kind, pred) => { for (let s = 0; s < 200; s++) { const t = `${kind}|dp${s}`; if (pred(G.make(t))) return t; } return null; };
    const tDiff = pickTag("diff", () => true), tSame = pickTag("same", () => true), tPair = pickTag("rf", (P) => P.why === "diff");
    const q = await newPage(); await closeHow(q);
    await q.evaluate((tags) => __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: tags, res: [], cur: null, id: "dp" }; }), [tDiff, tSame, tPair]);
    await q.evaluate(() => { Depth.runStart(); __nm.play("p"); });
    check("3つ全部の問題には「どう動かしてもそろわない」のボタンがある（2つの問題には無い）", await q.locator("#none").count() === 1);
    const sb = await q.$eval("#dp-sure", (b) => [b.getBoundingClientRect().height, b.getAttribute("aria-pressed"), b.textContent]);
    check("自信のボタン：高さ44px以上・はじめは押していない", Math.round(sb[0]) >= 44 && sb[1] === "false", sb.join(","));
    await q.click("#dp-sure");
    check("自信のボタンを押すと ✓ が出る（色だけで分けない）", (await q.getAttribute("#dp-sure", "aria-pressed")) === "true" && (await q.textContent("#dp-sure")).includes("✓"));
    await wrong1(q);
    check("自信ありでまちがえると、知らせに「思いこみ」と出て、自信は変えられない", (await q.textContent("#msg")).includes("思いこみ") && await q.locator("#dp-sure:disabled").count() === 1);
    check("まちがえたその時に復習へ入る（解き終えずにやめても残る）", await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("gkl-depth") || "{}"); return !!(d.rv && d.rv[__nm.cur().tag]); }));
    await q.click("#none");
    check("割合がちがう組で「そろわない」は正解。2段目「なぜ3つはそろわない？」が4つ出る（44px以上）", (await q.textContent("#msg")).includes("81通り") && await q.locator(".why button").count() === 4 && await q.locator(".verdict").count() === 0 && (await q.$$eval(".why button", (b) => b.every((x) => Math.round(x.getBoundingClientRect().height) >= 44))) && (await q.textContent("#ask")).includes("なぜ3つはそろわない"));
    check("2段目の読み上げは、2段目の問いと4つの選び肢だけ（funka-level #1 の CodeRabbit）", await q.evaluate(() => { const e = [...document.querySelectorAll("[data-a11y-say]")]; return e.length === 5 && e[0].textContent.includes("なぜ") && e.slice(1).every((x) => x.matches(".why button")); }));
    check("2段目の間は、つまみ・決めるボタンは押せない", await q.evaluate(() => ["decide", "none", "up0", "dn1", "ln0"].every((id) => document.getElementById(id).disabled)));
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目の途中で閉じても、2段目から続く", await q.locator(".why button").count() === 4);
    await q.click('.why button[data-g="size"]');
    check("2段目でまちがえると ✕ ちがう（破線）・もう一度選べる・割合をくらべるよう言う", await q.locator(".why button.ng").count() === 1 && (await q.textContent("#msg")).includes("✕") && (await q.textContent("#msg")).includes("割合"));
    await q.click("#hint");
    const ng1 = await q.locator(".why button:disabled").count();
    check("2段目のヒントは、まちがえた答えとは別のちがう答えを消す", ng1 === 2 && await q.locator(".why button:not(:disabled)").count() === 2, ng1);
    await q.reload(); await q.waitForTimeout(150); await q.evaluate(() => __nm.play("p"));
    check("2段目のヒントで消した答えは、閉じて開き直しても消えたまま（ヒントも押せないまま）", await q.locator(".why button:disabled").count() === ng1 && await q.locator("#hint:disabled").count() === 1 && (await q.textContent("#hintbox")).includes("消しました"));
    await why(q); await q.waitForSelector(".verdict");
    const m0 = await q.evaluate(() => __nm.load().runs.p.res[0].m);
    check("★は1段目と2段目のまちがい・ヒントを合わせて数える（1＋1＋1＝3）", m0 === 3, m0);
    check("解いた画面に、2段目の答えと、自信ありでまちがえたことが出る", (await q.textContent(".verdict")).includes(G.WHY.diff.name) && (await q.textContent(".verdict")).includes("自信ありでまちがえた") && (await q.textContent("#count")).includes("3つ全部そろう組 0通り"));
    await q.click("#next");
    // 割合が同じ組：「そろわない」はまちがい、線を動かすと3つそろう
    await q.click("#none");
    check("割合が同じ組で「そろわない」を押すとまちがい（3つそろう組がある）", (await q.textContent("#msg")).includes("そろう線の組があります") && await q.locator(".why button").count() === 0);
    await right1(q);
    check("割合が同じ組は、線を動かすと3つとも「✓ そろった」になり、2段目は「なぜ3つそろえられた？」", (await q.$$eval(".mt .st", (e) => e.every((x) => x.textContent.startsWith("✓")))) && (await q.textContent("#ask")).includes("そろえられた"));
    await why(q); await q.click("#next");
    await right1(q);
    check("2つの問題の2段目は「3つ全部をそろえる線の組は？」で、選び肢に「ある／ない」が付く", (await q.textContent("#ask")).includes("3つ全部をそろえる線の組は") && (await q.$$eval(".why button", (b) => b.every((x) => /^(ある|ない)：/.test(x.textContent)))));
    await why(q); await q.waitForSelector(".verdict");
    await q.click("#next"); await q.waitForTimeout(150);
    check("終えた直後の結果に「自信ありの当たり」が出る", (await q.textContent("#surestat")).includes("0/1"));
    const dp = await q.evaluate(() => JSON.parse(localStorage.getItem("gkl-depth") || "{}"));
    check("まちがえた・ヒントを使った問題だけ復習に入る", Object.keys(dp.rv || {}).sort().join() === [tDiff, tSame].sort().join(), Object.keys(dp.rv || {}).join(","));
    await q.evaluate((t) => { const d = JSON.parse(localStorage.getItem("gkl-depth")); for (const k in d.rv) d.rv[k].due = k === t ? "2026-01-01" : "2099-01-01"; localStorage.setItem("gkl-depth", JSON.stringify(d)); }, tDiff);
    await q.goto(url); await q.waitForTimeout(150);
    check("日の来た復習があると、ホームに「復習 1問」", (await q.textContent("#go-r")).includes("復習 1問"));
    const before = await mem(q);
    await q.click("#go-r");
    check("復習の画面は「復習」と出る・同じ問題", (await q.textContent("header")).includes("復習") && await q.evaluate(() => __nm.cur().tag) === tDiff);
    await solve(q); await q.click("#next"); await q.waitForTimeout(150);
    const after = await mem(q), dp2 = await q.evaluate(() => JSON.parse(localStorage.getItem("gkl-depth")));
    check("復習を終えると結果は「復習」・今日の記録は増えない・シェアは出ない", (await q.textContent("h1")).includes("復習") && JSON.stringify(after.days) === JSON.stringify(before.days) && await q.locator("#share").count() === 0);
    { const r1 = dp2.rv && dp2.rv[tDiff], d3 = new Date(Date.parse(TODAY + "T00:00:00Z") + 3 * 864e5).toISOString().slice(0, 10);
      check("復習で一度で正解すると、次は3日後へ進む（段は1・期限はちょうど3日後）", !!r1 && r1.s === 1 && r1.due === d3, JSON.stringify(r1)); }
    await q.goto(url); await q.waitForTimeout(150);
    check("復習を終えたら、ホームの「復習」は消える", await q.locator("#go-r").count() === 0);
    await q.evaluate(() => { const d = JSON.parse(localStorage.getItem("gkl-depth")); d.rv["nai|1"] = { s: 0, due: "2026-01-01", t: 1 }; d.rv["constructor|x"] = { s: 0, due: "2026-01-01", t: 2 }; localStorage.setItem("gkl-depth", JSON.stringify(d)); });
    await q.goto(url); await q.waitForTimeout(150);
    check("作り直せない鍵（無い種類・constructor）は復習に数えず、ホームも出る", await q.locator("#go-d").count() === 1 && await q.locator("#go-r").count() === 0);
    // 別のタブで2段目へ進んでいたら、この画面も2段目になる・別のタブで先に進んだ古い画面は復習の段を戻さない
    { const tq = pickTag("rv", () => true).replace("dp", "dq");
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: [t], res: [], cur: null, id: "dq" }; }); __nm.play("p"); }, tq);
      await q.evaluate((t) => __nm.save((s) => { s.runs.p.cur = { i: 0, tag: t, wrong: [], hints: 0, step: 2, w2: [] }; }), tq);
      await q.click("#hint"); await q.waitForTimeout(100);
      check("別のタブで2段目へ進んでいたら、この画面も2段目になる", await q.locator(".why button").count() === 4 && await q.evaluate(() => __nm.cur().step) === 2);
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p.res.push({ m: 0 }); s.runs.p.cur = null; }); const d = JSON.parse(localStorage.getItem("gkl-depth")); d.rv[t] = { s: 2, due: "2099-01-01", t: 9 }; localStorage.setItem("gkl-depth", JSON.stringify(d)); }, tq);
      await q.evaluate(() => { const h = document.querySelector("#hint"); if (h) { h.disabled = false; h.click(); } }); await q.waitForTimeout(50);
      check("別のタブで先に進んだ古い画面でヒントを押しても、復習の段は戻らない", await q.evaluate((t) => JSON.parse(localStorage.getItem("gkl-depth")).rv[t].s, tq) === 2);
    }
    // 別のタブで線を確かめて2段目へ進んでいたら、その線も合わせる（古い線のまま「そろいました」と出さない。gokaku-line#1 の CodeRabbit）
    { const tq = "rf|dl1";
      await q.evaluate((t) => { __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: [t], res: [], cur: null, id: "dl" }; }); __nm.play("p"); }, tq);
      const okp = await q.evaluate(() => __nm.cur().P.ok[0]);
      await q.evaluate(([t, ln]) => __nm.save((s) => { s.runs.p.cur = { i: 0, tag: t, wrong: [], hints: 0, step: 2, w2: [], ln }; }), [tq, okp]);
      await q.evaluate(() => { const c = __nm.cur(); __nm.setLine(1, c.ln[1] < 9 ? c.ln[1] + 1 : c.ln[1] - 1); }); await q.waitForTimeout(100);
      const got = await q.evaluate(() => ({ ln: __nm.cur().ln, step: __nm.cur().step, saved: __nm.load().runs.p.cur.ln, ui: [document.querySelector("#ln0").value, document.querySelector("#ln1").value].map(Number) }));
      check("別のタブで2段目へ進んでいたら、そのタブで確かめた線も取り込む（画面・保存とも）", got.step === 2 && [got.ln, got.saved, got.ui].every((x) => JSON.stringify(x) === JSON.stringify(okp)), JSON.stringify({ okp, got }));
    }
    // 前に保存したヒントのある問題でつまみを動かしても、復習の日を延ばさない（新しいまちがい・ヒントのときだけ入れ直す。gokaku-line#1 の CodeRabbit）
    { const tq = "rv|de1", due = () => q.evaluate((t) => (JSON.parse(localStorage.getItem("gkl-depth")).rv[t] || {}).due, tq);
      await q.evaluate((t) => { const d = JSON.parse(localStorage.getItem("gkl-depth")); d.rv[t] = { s: 0, due: "2026-01-01", t: 5 }; localStorage.setItem("gkl-depth", JSON.stringify(d)); __nm.save((s) => { s.runs.p = { mode: "p", date: __nm.todayKey(), list: [t], res: [], cur: { i: 0, tag: t, wrong: [], hints: 1, step: 1, w2: [] }, id: "de" }; }); __nm.play("p"); }, tq);
      await q.evaluate(() => { const c = __nm.cur(); __nm.setLine(1, c.ln[1] < 9 ? c.ln[1] + 1 : c.ln[1] - 1); }); await q.waitForTimeout(50);
      const d1 = await due();
      await q.click("#hint"); await q.waitForTimeout(50);
      const d2 = await due();
      check("前に使ったヒントでは、つまみを動かしても復習の日を延ばさない・新しいヒントでは入れ直す", d1 === "2026-01-01" && d2 > TODAY, `${d1} → ${d2}`);
    }
    // 2回目のヒントの文：そろう組が無いとき、合格率と見逃し率がそろう組があるかどうかで言い分ける（分かれ方のちがう組に、無い組を前提にした文を出さない。gokaku-line#1 の CodeRabbit）
    { const tags = []; for (const k of G.KINDS) for (let i = 0; i < 30; i++) tags.push(`${k.id}|kh${i}`);
      const texts = await q.evaluate((ts) => ts.map((t) => __nm.keyOf2(__nm.G.make(t))), tags), bad = [];
      tags.forEach((t, i) => { const P = G.make(t), qq = searchQ(P), x = texts[i];
        const want = qq.ok.length ? /A組の線を/ : qq.rf.length ? /当たり率がずれます/ : /同時にそろえる線の組も、この点数にはありません/;
        if (!want.test(x)) bad.push(`${t}:${x}`); });
      check("2回目のヒントの文は、そろう組・合格率と見逃し率がそろう組の有る無しと合う（全種類×30）", bad.length === 0, bad.slice(0, 3).join(" / ")); }
    // 復習の途中でヒント・まちがいがあって日の来た問題が0になっても、ホームの「復習の続きから」で戻れる
    { const rk = tDiff;
      await q.evaluate((k) => { const d = JSON.parse(localStorage.getItem("gkl-depth")); d.rv = { [k]: { s: 0, due: "2026-01-01", t: 3 } }; localStorage.setItem("gkl-depth", JSON.stringify(d)); }, rk);
      await q.goto(url); await q.waitForTimeout(150); await q.click("#go-r"); await q.click("#hint");
      await q.evaluate(() => __nm.save((s) => { s.runs.r.date = "2026-01-02"; }));
      await q.goto(url); await q.waitForTimeout(150);
      check("復習の途中でヒントを使って日の来た問題が0になっても・日が替わっても、ホームの「復習の続きから」で戻れる", ((await q.locator("#go-r").count()) ? await q.textContent("#go-r") : "").includes("続きから"));
      if (await q.locator("#go-r").count()) { await q.click("#go-r"); check("復習の続きは同じ問題・使ったヒントはそのまま", await q.evaluate(() => __nm.cur().tag) === rk && await q.evaluate(() => __nm.cur().hints) === 1); }
    }
    await q.context().close();
  }
  // スマホ幅・とても大きい文字でもはみ出さない・押す所は44px以上
  {
    const bad = [], small = [];
    for (const [w, fs] of [[320, 3], [390, 2], [320, 1]]) {
      const q = await newPage(w); await closeHow(q);
      await q.evaluate((fs) => (localStorage.setItem("gkl-fs", String(fs)), localStorage.setItem("a11y-v1", JSON.stringify({ ...JSON.parse(localStorage.getItem("a11y-v1") || "{}"), fs: undefined }))), fs); await q.reload(); await q.waitForTimeout(150);
      for (const go of [null, "#go-d", "solve", "#go-cal", "#go-dex", "#go-ach", "#go-e"]) {
        if (go === "solve") { await solve(q); }
        else if (go) { await q.goto(url); await q.waitForTimeout(100); await q.click(go); }
        await q.waitForTimeout(100);
        const ov = await q.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ov > 0) bad.push(`${w}px 文字${fs} ${go || "ホーム"} ${ov}px`);
        small.push(...(await q.$$eval("button:not([disabled]), a[href], input[type=range]", (bs) => bs.filter((b) => b.checkVisibility() && !b.closest(".cal")).filter((b) => Math.round(b.getBoundingClientRect().height) < 44).map((b) => (b.id || b.className || b.textContent).slice(0, 20)))).map((x) => `${w}/${fs}/${go}:${x}`));
      }
      await q.context().close();
    }
    check("幅320px・とても大きい文字でも横にはみ出さない", bad.length === 0, bad.join(" / "));
    check("押せる所は高さ44px以上（つまみも）", small.length === 0, [...new Set(small)].slice(0, 8).join(","));
  }

  // 見やすさの設定を全部入れても、ページの一番下まで動ける（読み上げの class が html に当たって固まった。2026-11-05）
  {
    const ctx = await ctxOf({ viewport: { width: 390, height: 700 } });
    await ctx.addInitScript(() => localStorage.setItem("a11y-v1", JSON.stringify({ read: true, cvd: true, calm: true, say: true, ruby: true })));
    const q = await newPage(390, ctx); await closeHow(q);
    const r = await q.evaluate(() => { window.scrollTo(0, 1e5); const f = document.querySelector("footer").getBoundingClientRect(); return [scrollY, Math.round(f.bottom), innerHeight, getComputedStyle(document.documentElement).position]; });
    check("見やすさの設定を全部入れても、いちばん下まで動ける（html が固定されない）", r[0] > 0 && r[1] <= r[2] && r[3] === "static", r.join(","));
    await ctx.close();
  }
  // キーボードだけで遊べる（Tab・矢印・Enter）
  {
    const q = await newPage(); await closeHow(q);
    await q.focus("#go-d"); await q.keyboard.press("Enter"); await q.waitForTimeout(100);
    const P = await q.evaluate(() => { const c = __nm.cur(); return { ok: c.P.ok, can: c.P.can, ask: c.P.ask, ln: c.ln }; });
    if (P.ask === "RFV" && !P.can) { await q.focus("#none"); await q.keyboard.press("Enter"); }
    else {
      const [a, b] = P.ok[0];
      for (const [gi, t] of [[0, a], [1, b]]) { await q.focus(`#ln${gi}`); const now = P.ln[gi]; for (let i = 0; i < Math.abs(t - now); i++) await q.keyboard.press(t > now ? "ArrowRight" : "ArrowLeft"); }
      await q.focus("#decide"); await q.keyboard.press("Enter");
    }
    await q.waitForTimeout(100);
    if (await q.locator(".why button").count()) { await q.focus(`.why button[data-g="${await q.evaluate(() => __nm.cur().P.why)}"]`); await q.keyboard.press("Enter"); await q.waitForTimeout(100); }
    check("キーボードだけで、つまみ（矢印）を動かして答えられる（2段目もキーボードで）", await q.locator(".verdict").count() === 1);
    await q.context().close();
  }
} catch (e) { check("ブラウザでの検査が最後まで動く", false, e.stack.split("\n").slice(0, 3).join(" ")); }

// 深さの部品（shared-workflows template/qa/depth-check.mjs）
{ const e = await checkDepth(readFileSync(path.join(root, "depth.js"), "utf8")); check("depth.js（自信をかける・復習）の動き", e.length === 0, e.join(" / ")); }
{ const q = await newPage(); await closeHow(q);
  check("保存に失敗したら、保存できるまで帯（#savewarn）で知らせ続け、保存できたら消す", await q.evaluate(async () => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; __nm.save(() => {}); __nm.save(() => {}); const one = document.querySelectorAll("#savewarn").length === 1 && document.getElementById("savewarn").textContent.includes("保存できませんでした"); await new Promise((r) => setTimeout(r, 1500)); const stay = !!document.getElementById("savewarn"); Storage.prototype.setItem = orig; __nm.save(() => {}); return one && stay && !document.getElementById("savewarn"); }));
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await right1(q); await why(q); await q.waitForSelector(".verdict");
  await q.click("#quit"); await q.waitForTimeout(150);
  check("とことんで正解した直後でも「ここで降りる」が効き、その問題も数える", (await q.textContent("#eres")).includes("1問"), await q.textContent("body"));
  // 保存に失敗したまま「ここで降りる」を押しても、保存してあった途中の回を戻さない
  await q.evaluate(() => __nm.start("e")); await q.waitForTimeout(100);
  await right1(q); await why(q); await q.waitForSelector(".verdict");
  { const eid = await q.evaluate(() => __nm.load().runs.e.id);
    await q.evaluate(() => { window.__origSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new Error("full"); }; });
    await q.click("#quit"); await q.waitForTimeout(150);
    const back = await q.evaluate(() => { const r = __nm.load().runs.e; return r ? r.id : null; });
    await q.evaluate(() => { Storage.prototype.setItem = window.__origSet; __nm.save(() => {}); });
    check("保存に失敗したまま「ここで降りる」を押しても、終えた回が「とことんの続き」に戻らない", back === null && (await q.evaluate(() => __nm.load().runs.e)) === null, `${eid} → ${back}`); }
  await q.close(); }
{ const q = await newPage(); await closeHow(q);
  await q.evaluate(() => { localStorage.setItem("gkl-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: { constructor: 1, toString: 2, rf: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 0 })); }); await q.reload(); await q.waitForTimeout(150);
  check("記録に constructor などの鍵が入っても、つまみ帳と実績の種類に数えない（CodeRabbit funka-level#1）", (await q.textContent("#go-dex")).includes("1/12") && await q.evaluate(() => __nm.tally(__nm.load()).kinds) === 1, await q.textContent("#go-dex"));
  await q.evaluate(() => { localStorage.setItem("gkl-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: {}, runs: {}, kofi: {}, ach: {}, ebest: { toString: null } })); }); await q.reload(); await q.waitForTimeout(150);
  check("記録の数の所に数でも文字でもない物（{toString:null}）が入っても、ホームが出る（toppu-yomi #1 の CodeRabbit）", await q.locator("#go-dex").count() === 1);
  await q.evaluate((d) => { localStorage.setItem("gkl-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, adays: {}, dex: {}, runs: { p: { mode: "p", date: d, list: ["rf|w2x"], res: [], cur: { wrong: [], hints: 0, step: 2, w2: [{ toString: null }, "kaze"] }, id: "w2x" } }, kofi: {}, ach: {}, ebest: 0 })); }, TODAY); await q.reload(); await q.waitForTimeout(150);
  check("途中の2段目のまちがい w2 に文字でない物（{toString:null}）が入っても、ホームが出る（toukyu-yomi #1 の CodeRabbit）", await q.locator("#go-dex").count() === 1);
  await q.close(); }
// game-core（shared-workflows template/qa/core-check.mjs）：遊び方・感想のリンク・不具合の帯（CodeRabbit nukemichi-fusagi#1）
try {
  await checkCore({ browser, url, check, first: false }); // はじめての案内はゲームの firstClose が閉じるので、遊び方・感想・不具合の帯だけ見る
} catch (e) { check("game-core の検査が最後まで動く", false, e.message.split("\n")[0]); }
// 引き継ぎコード（shared-workflows template/qa/transfer-check.mjs）
try {
  const sample = { "gkl-v1": JSON.stringify({ v: 1, tut: true, days: { "2026-11-13": { m: [0, 1, 0, 0, 2], k: ["rf", "rv", "same", "diff", "perf"] } }, hdays: {}, adays: {}, dex: { rf: 1, rv: 1, same: 1, diff: 1, perf: 1 }, runs: {}, kofi: {}, ach: {}, ebest: 7, t: 1 }), "gkl-fs": "3", "gkl-depth": JSON.stringify({ v: 1, rv: { "rf|x1": { s: 1, due: "2026-11-20", t: 5 } } }) }; // 復習の記録も引き継ぐかを見る
  await checkTransfer({ browser, url, game: "gokaku-line", sample, check, open: async (pg) => { await firstClose(pg); } });
} catch (e) { check("引き継ぎの検査が最後まで動く", false, e.message.split("\n")[0]); }
await browser.close();
server.close();
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

{ // 見やすさ・読みやすさ・偏り（shared-workflows template/qa/a11y.mjs の写し）
  const { spawnSync } = await import("node:child_process");
  const a = spawnSync(process.execPath, [path.join(root, "qa", "a11y.mjs")], { encoding: "utf8", env: process.env });
  check("見やすさ・読みやすさの検査（qa/a11y.mjs。中身は qa-report/a11y.md）", a.status === 0, (a.stdout.match(/^- ❌.*$/gm) || []).join(" / ") || (a.status ? a.stderr.slice(-300) : ""));
}

const ng = results.filter((r) => !r.ok);
const md = `# 合格ラインのつまみ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
