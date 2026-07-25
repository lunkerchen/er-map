# 急診即時壅塞地圖 ER Map Taiwan

[![English](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![繁體中文](https://img.shields.io/badge/lang-zh--tw-blue.svg)](README.zh-TW.md)

全台 59 家重度急救責任醫院的急診即時壅塞地圖。資料來自健保署急診即時開放 API — 免費、免 API key、每 15 分鐘更新。**衝急診之前，先看哪裡等最久。**

## 功能

- 🗺️ 深色 Leaflet 地圖，依壅塞程度分級標記（正常 / 繁忙 / 壅塞 / 危急）
- 🔴 119 滿床通報以脈衝動畫標記強調
- 📊 每家醫院即時指標：等待看診、等待住院、等待加護病房、等待推床
- 🔍 依院名或縣市搜尋；依醫院層級篩選（醫學中心 / 區域醫院 / 地區醫院）
- 📱 手機版底部抽屜介面
- ⚡ 全靜態架構 — GitHub Actions 每 15 分鐘預抓資料，無後端

## 資料來源

[衛生福利部中央健康保險署 急診即時訊息](https://info.nhi.gov.tw/INAE4000/INAE4010S01)（`POST https://info.nhi.gov.tw/api/inae4000/inae4001s01/SQL0002`）

注意事項：
- 急診依檢傷分類決定看診順序，並非先到先看。
- `waiT_BED_CNT`（等待推床）各院填報標準不一，僅供參考。
- 醫院座標透過 OSM Nominatim 一次性地理編碼，靜態存放於 `data/hospitals.json`。

## 開發

```bash
npm install
npm run fetch     # 抓最新急診資料到 public/data/er-status.json
npm run dev       # 本地開發伺服器
npm run build     # 正式建置 → dist/
```

## 部署

靜態網站（Vite + Leaflet），可部署至 Cloudflare Pages：

- 建置指令：`npm run fetch && npm run build`
- 輸出目錄：`dist`

資料更新：`.github/workflows/fetch-data.yml` 每 15 分鐘執行 `npm run fetch` 並提交更新的 JSON，觸發 Pages 重新建置。

## 授權條款

MIT
