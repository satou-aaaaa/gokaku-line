// アプリのアイコン（icon-192.png・icon-512.png）を作る。紺の地に、点数の柱と合格ラインのつまみ。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const bars = [18, 30, 46, 58, 40, 26].map((h, i) => `<rect x="${14 + i * 12}" y="${80 - h}" width="9" height="${h}" rx="2" fill="${i >= 3 ? "#f3c9a8" : "#8aa3c2"}"/>`).join("");
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#123554"/>${bars}
      <rect x="10" y="80" width="80" height="3" fill="#fffdf7"/>
      <path d="M48 14 V86" stroke="#b23a24" stroke-width="4" stroke-dasharray="6 4"/><circle cx="48" cy="14" r="8" fill="#b23a24" stroke="#fffdf7" stroke-width="3"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
