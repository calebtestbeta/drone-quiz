# 無人機考試練習 Drone Quiz

台灣遙控無人機操作證學科考試練習平台，588 道題目、四個章節，支援多種練習模式與 PWA 離線使用。

## 功能

- **章節循序練習** — 按章節依序作答，答錯即時顯示說明
- **隨機抽題練習** — 自訂題數，隨機出題
- **限時模擬考試** — 計時倒數，模擬正式考試情境
- **錯題複習** — 專練曾答錯的題目
- **學習統計** — 各章正確率、覆蓋率、歷次紀錄
- **PWA** — 可加入主畫面，離線可用

## 題庫章節

| 章節 | 名稱 | 題數 |
|------|------|------|
| CH1 | 民用航空法及相關法規 | 146 |
| CH2 | 飛航安全及飛行原理 | 234 |
| CH3 | 氣象學 | 129 |
| CH4 | 人為因素及飛行決策 | 79 |

## 使用方式

需透過 HTTP 伺服器開啟（不支援直接以 `file://` 開啟，否則 JSON 載入及 Service Worker 會失效）。

```bash
# 本地伺服器
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

**PWA 安裝：**
- iOS Safari：分享 → 加入主畫面
- Android Chrome：選單 → 安裝應用程式

## 技術架構

- **前端：** Vue 3（CDN）+ Tailwind CSS（CDN），單一 `index.html`，無需 build step
- **資料：** 靜態 JSON，`exam_ch1.json` ~ `exam_ch4.json`
- **狀態：** localStorage（答題進度、錯題集、歷次紀錄、設定）
- **PWA：** Service Worker + Web App Manifest，Cache First 策略

## 專案結構

```
drone-quiz/
├── index.html          # 主應用程式（所有 Vue 元件與邏輯）
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── exam_ch1.json       # 第一章題庫
├── exam_ch2.json       # 第二章題庫
├── exam_ch3.json       # 第三章題庫
├── exam_ch4.json       # 第四章題庫
└── icons/              # PWA 圖示
```

## 授權聲明

本專案程式碼以 MIT License 授權。

題庫內容來源為中華民國交通部民用航空局公告之遙控無人機學科考試題庫，著作權歸原著作權人所有，僅供個人學習練習使用。

## 題庫資料格式

```json
{
  "id": 1,
  "chapter": 1,
  "chapter_name": "第一章 民用航空法及相關法規",
  "question": "題目內容",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "answer": "D",
  "explanation": "答錯說明（2-3 句，引用相關法條）"
}
```
