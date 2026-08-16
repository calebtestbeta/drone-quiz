# CLAUDE.md — drone-quiz

## 專案說明

台灣遙控無人機操作證學科考試練習 SPA/PWA，使用 Vue 3 CDN + Tailwind CSS，無 build step。

## 技術重點

- **學科單一檔案架構**：所有 Vue 元件、composable、路由邏輯都在 `index.html` 的 `<script>` 區塊內
- **無 Vue Router**：以 `view` ref 控制畫面切換，`quizKey` ref 強制重建 QuizView
- **無 build 工具**：直接用 `vue.global.prod.js` CDN，template 為字串形式
- **Tailwind CDN**：動態 class 需加入 `tailwind.config.safelist`，否則不會生成
- **術科模組化架構**：`game.html` 只保留 DOM，術科程式位於 `game/*.mjs`，使用原生 ES modules

## localStorage 鍵值

| Key | 內容 |
|-----|------|
| `dq_progress` | `{ [gid]: { attempts, correct, last, ok, at } }` |
| `dq_wrong` | `string[]`（gid 陣列） |
| `dq_sessions` | `SessionRecord[]`（最多 50 筆） |
| `dq_settings` | `{ exam_min, exam_count, exam_min_n, exam_count_n, show_exp }`（`_n` 為普通操作證，考試題數預設 20） |
| `dq_practical_sessions` | 術科完成摘要，最多 50 筆 |

全域題目 ID（gid）格式：`"${chapter}_${id}"`，例如第2章第5題 → `"2_5"`

## 題庫格式

`exam_ch{1-4}.json` 每題包含：`id, chapter, chapter_name, question, options{A-D}, answer, explanation`

## 開發注意事項

- 必須透過 HTTP 伺服器開啟（`python3 -m http.server 8080`），不可用 `file://`
- 修改完需重整瀏覽器並清除 Service Worker 快取（DevTools → Application → Service Workers → Unregister）
- 新增動態 Tailwind class 需同步更新 `tailwind.config.safelist`
- 新增術科 runtime 檔案需同步加入 `sw.js` 的 `PRECACHE` 並遞增 cache 版本
- 術科測試使用 Node 內建 test runner：`npm test`

## 修改後需告知使用者哪些檔案有改動

使用者會手動管理部署，每次修改結束後請明確列出改動的檔案。
