// 抓健保署急診即時 API → 合併靜態座標 → public/data/er-status.json
// 來源：POST https://info.nhi.gov.tw/api/inae4000/inae4001s01/SQL0002 （免 key，每 15 分鐘更新）
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const API = 'https://info.nhi.gov.tw/api/inae4000/inae4001s01/SQL0002';
const GEO = new URL('../data/hospitals.json', import.meta.url).pathname;
const OUT = new URL('../public/data/er-status.json', import.meta.url).pathname;
const FORCE = process.argv.includes('--force');

const TYPE_NAME = { '1': '醫學中心', '2': '區域醫院', '3': '地區醫院' };

// 壅塞等級 0-3：依等住院 / 等ICU / 119滿床通報綜合判定
// 閾值參考急診醫師實務：醫學中心量能大、區域/地區較小
function severity(h, type) {
  const g = h.waitGeneral, icu = h.waitIcu;
  if (h.full119) return 3;
  const big = type === '1'; // 醫學中心
  const critG = big ? 70 : 20, warnG = big ? 40 : 10;
  if (g >= critG || icu >= 5) return 3;
  if (g >= warnG || icu >= 2) return 2;
  if (g >= 5 || icu >= 1) return 1;
  return 0;
}

const res = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ AREA_NO: '', CONT_TYPE: '' }),
});
if (!res.ok) throw new Error(`API ${res.status}`);
const json = await res.json();
const geo = JSON.parse(readFileSync(GEO, 'utf8'));

const hospitals = [];
let missing = 0;
for (const h of json.data) {
  const g = geo[h.hosP_ID];
  if (!g) { missing++; console.warn(`no geo: ${h.hosP_ID} ${h.hosP_NAME}`); continue; }
  const rec = {
    id: h.hosP_ID,
    name: g.short,
    fullName: g.full,
    city: g.city,
    lat: g.lat,
    lng: g.lng,
    type: TYPE_NAME[h.conT_TYPE] || h.conT_TYPE,
    full119: h.inform === 'Y',
    waitSee: +h.waiT_SEE_CNT || 0,
    waitBed: +h.waiT_BED_CNT || 0,   // 註：實務上不可靠，UI 標註
    waitGeneral: +h.waiT_GENERAL_CNT || 0,
    waitIcu: +h.waiT_ICU_CNT || 0,
    updatedAt: h.txT_DATE,
  };
  rec.severity = severity(rec, h.conT_TYPE);
  hospitals.push(rec);
}

hospitals.sort((a, b) => b.severity - a.severity || b.waitGeneral - a.waitGeneral);

// sysdate 沒變就不寫檔（避免 fetchedAt 時間戳造成無意義 commit）
if (!FORCE && existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    if (prev.sysdate === json.sysdate) {
      console.log(`sysdate ${json.sysdate} unchanged, skip`);
      process.exit(0);
    }
  } catch { /* 舊檔壞了就覆寫 */ }
}

const out = {
  sysdate: json.sysdate,
  fetchedAt: new Date().toISOString(),
  source: '衛生福利部中央健康保險署 急診即時訊息',
  count: hospitals.length,
  full119Count: hospitals.filter((h) => h.full119).length,
  hospitals,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
console.log(`${out.count} hospitals, ${out.full119Count} 滿床通報, sysdate ${out.sysdate}${missing ? `, ${missing} missing geo` : ''}`);
