# AGENTS.md

合格ラインのつまみ：架空の A組・B組の点数の柱（一人ひとりに「実は力あり／なし」の印）で、組ごとに合格ラインのつまみを動かし、3つの公平メーター（合格率・見逃し率・当たり率）をそろえる1日5問のゲーム。1段目は言われた2つ（または3つ全部。そろわないなら「どう動かしてもそろわない」）、2段目は「3つ全部そろう線の組はあるか・なぜか」。`index.html` と `data.js`（点の並び・メーター・全探索）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

Claude Code のクラウドセッションでは `.claude/settings.json` のフックが自動で実行する。

## push する前の確認

```bash
node qa/run.mjs   # 問題（12種類×300の種：そろう線の組・3つそろう組・2段目の答えを別に書いた全探索で照らす・割合がちがう組で3つそろわない）・今日の5問と上級（3年分）・とことん・通しで遊ぶ・続きから・2段目・復習・幅320px・PWA・引き継ぎ・見やすさ（CI の QA と同じ）
```

## このリポジトリの決まり

- 中身：メーターは R 合格率（合格 s／人数 n）・F 見逃し率（力ありの不合格／力あり c）・V 当たり率（力ありの合格 x／合格 s）。「そろう」は分数がぴったり同じ（四捨五入しない）。線は1〜9（t×10点以上で合格）。どの組もいちばん上の柱に力あり・いちばん下の柱に力なしを置くので、どの線でも合格に力ある人がいる。このとき V×R＝p×(1−F) から、p（力ありの割合）がちがう2組で3つは同時にそろわない（点で完全に分かれても）。
- 理論の出典は Kleinberg・Mullainathan・Raghavan（arXiv:1609.05807）・Chouldechova（arXiv:1703.00056）・Hardt・Price・Srebro（arXiv:1610.02413）。ゲームのメーターは論文の定義そのものではない（とくに Kleinberg らは確率の点数の「組ごとの当たり方」と「2つの釣り合い」、Chouldechova は当たり率・見逃し率・誤合格率）。対応と引用は共有フォルダ `games/gokaku-line-research.md`。言い切らない（「解釈は分かれる」を「このゲームについて」に置く。QA が見る）。
- 組は A・B だけ。実在の試験・人種・性別などの集団の名前を出さない。政治の話にしない（QA が言葉を見る）。点数・組・人はすべて架空。
- 答えは `G.solve`（81通りの全探索）で決め、QA は別に書いた全探索（`searchQ`）で照らす。2段目の答え：3つそろう組がある→same、無くて割合が同じ→shape、割合がちがう→diff（size は選び肢だけ）。
- 今日の5問（やさしい2・ふつう2・むずかしい1、種類は重ねない）・上級（むずかしい3、今日のむずかしいと別の種類）は日本時間の日付の種で決まり、だれでも同じ。`Math.random()` は練習・とことんの種だけ。乱数は `sort` の比較の中で引かない。`KDEF`・`SCENES`・乱数を引く順番は、変えると過去の日の問題が変わる。公開後は変えず、変えるときは QA の `PINS` を作り直して理由を PR に書く。`data.js` を変える PR は自動ではマージされない（`hold_paths`）。
- ★はまちがい＋ヒントの数（0で★3・1で★2・2以上で★1）。1段目のまちがいは同じ線の組・同じ答えを二度数えない。ヒントは1回目は見るところ、2回目はそろう組があれば A組の線をそこへ動かす。上級はヒントなし。時間制限なし。
- 好きなだけ遊べる：チケット・ライフ・回数制限・🔒で開くモードを入れない（shared-workflows `routines/game-dev.md` F1〜F7。QA が見る）。とことん（`runs.e`）はまちがえても続き、「ここで降りる」で終わる。
- 1問を深くする：`depth.js` と `qa/depth-check.mjs` は shared-workflows `template/` の写しで、ここでは直さない。自信あり・2段目・復習（1→3→7日後）。記録 `gkl-v1`・文字 `gkl-fs`・復習 `gkl-depth`。途中のつまみの位置は `runs.*.cur.ln`。
- 共有は遊ぶ人が押したときに開くリンクだけ。シェアの文に問題・答えを出さない。感想は Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`）を開くだけ。応援は Ko-fi へのただのリンクだけ。
- 外へ通信しない（CSP の `connect-src 'self'` を広げない）。見やすさ（`<!-- a11y:begin -->`〜`end`・`qa/a11y.mjs`）と引き継ぎ（`transfer.js`・`qa/transfer-check.mjs`）は shared-workflows `template/` の写しで、ここでは直さない。
- 画面の土台は屋台の値下げ合戦（yatai-negasen）から写した（ひな形の部品は `node scripts/sync-template.mjs` で入れた）。写し元の言葉が残っていないかを QA が見る。保存の読み直しは共通部品 GameStore（`<!-- store:begin -->`〜`end`）。
- PWA：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、`og.png` は `node tools/make-og.cjs`。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest`・`data.js` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを読み、手でマージする直前に今の head へのレビューを読み直す。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
