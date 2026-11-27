// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題の答えは入れず、遊び方の例だけ（3つのメーター）。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const meter = (n, a, bb, ok) => `<div style="display:flex;align-items:center;gap:14px;background:#fff;border:3px solid ${ok ? "#21704a" : "#1d2a3f33"};border-radius:12px;padding:10px 16px"><div style="width:150px;font-size:30px;font-weight:900">${n}</div><div style="flex:1;font-size:26px;color:#4c5568">A ${a}%　B ${bb}%</div><div style="font-size:28px;font-weight:900;color:${ok ? "#164f33" : "#83261a"}">${ok ? "✓ そろった" : "✕ ずれる"}</div></div>`;
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:48px 64px;background:#f3efe4;color:#1d2a3f;display:flex;gap:40px;align-items:center">
    <div style="flex:0 0 440px">
      <div style="font-size:30px;color:#83261a;letter-spacing:.06em">公平のメーターで遊ぶ</div>
      <div style="font-size:70px;font-weight:900;margin-top:8px;line-height:1.15;color:#123554">合格ラインの<br><span style="color:#b23a24">つまみ</span></div>
      <div style="font-size:34px;margin-top:14px">3つのメーターは、<br>同時にそろう？</div>
    </div>
    <div style="flex:1;background:#fffdf7;border:4px solid #1d2a3f;border-radius:8px;padding:26px 22px;display:flex;flex-direction:column;gap:14px">
      <div style="font-size:30px;font-weight:700">A組・B組の合格ライン</div>
      ${meter("合格率", 50, 50, true)}
      ${meter("見逃し率", 25, 25, true)}
      ${meter("当たり率", 60, 80, false)}
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
