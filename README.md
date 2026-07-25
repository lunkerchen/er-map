# ER Map Taiwan — Real-time ER Congestion Map

[![English](https://img.shields.io/badge/lang-en-red.svg)](README.md)
[![繁體中文](https://img.shields.io/badge/lang-zh--tw-blue.svg)](README.zh-TW.md)

A real-time congestion map of all 59 intensive-care-capable emergency responsibility hospitals in Taiwan. Data comes from the NHI (National Health Insurance) ER real-time open API — free, no API key, refreshed every 15 minutes. **Before rushing to the ER, check which hospital has the shortest wait.**

## Features

- 🗺️ Dark-themed Leaflet map with severity-graded markers (normal / busy / congested / critical)
- 🔴 119 full-bed alerts highlighted with pulsing markers
- 📊 Live metrics per hospital: waiting to see doctor, waiting for admission, waiting for ICU, waiting for gurney
- 🔍 Search by hospital name or city; filter by hospital level (medical center / regional / district)
- 📱 Mobile bottom-sheet layout
- ⚡ Fully static — data pre-fetched by GitHub Actions every 15 minutes, no backend

## Data Source

[衛生福利部中央健康保險署 急診即時訊息](https://info.nhi.gov.tw/INAE4000/INAE4010S01) (`POST https://info.nhi.gov.tw/api/inae4000/inae4001s01/SQL0002`)

Notes:
- ER triage determines treatment order — not first-come-first-served.
- The `waiT_BED_CNT` (gurney wait) field is known to be unreliable across hospitals; shown for reference only.
- Hospital coordinates were one-time geocoded via OSM Nominatim and stored statically in `data/hospitals.json`.

## Development

```bash
npm install
npm run fetch     # pull latest ER data into public/data/er-status.json
npm run dev       # local dev server
npm run build     # production build → dist/
```

## Deployment

Static site (Vite + Leaflet), deployable to Cloudflare Pages:

- Build command: `npm run fetch && npm run build`
- Output directory: `dist`

Data refresh: `.github/workflows/fetch-data.yml` runs `npm run fetch` every 15 minutes and commits the updated JSON, triggering a Pages rebuild.

## License

MIT
