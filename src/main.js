import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';

const SEV_COLOR = ['#34d399', '#fbbf24', '#fb923c', '#f87171'];
const SEV_NAME = ['正常', '繁忙', '壅塞', '危急'];

/* ── map ── */
const map = L.map('map', {
  center: [23.7, 121],
  zoom: 8,
  zoomControl: false,
  attributionControl: true,
});
L.control.zoom({ position: 'topright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 19,
}).addTo(map);

/* ── state ── */
const state = { type: '', full119: false, query: '', data: null, markers: new Map(), selected: null };

const $ = (s) => document.querySelector(s);
const listEl = $('#hospital-list');
const panel = $('#panel');

/* ── data ── */
// 優先抓 GitHub raw（Actions 每 15 分鐘提交，免 rebuild 即時生效），失敗回落站內靜態檔
const DATA_SOURCES = [
  'https://raw.githubusercontent.com/lunkerchen/er-map/main/public/data/er-status.json',
  'data/er-status.json',
];

async function init() {
  let lastErr;
  for (const url of DATA_SOURCES) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`${res.status}`);
      state.data = await res.json();
      break;
    } catch (e) { lastErr = e; }
  }
  if (!state.data) throw lastErr;
  renderSummary();
  renderMarkers();
  renderList();
}
init().catch((e) => {
  $('#summary').innerHTML = `<div class="stat danger"><b>!</b><span>資料載入失敗：${e.message}</span></div>`;
});

/* ── summary ── */
function renderSummary() {
  const d = state.data;
  const congested = d.hospitals.filter((h) => h.severity >= 2).length;
  $('#summary').innerHTML = `
    <div class="stat danger"><b>${d.full119Count}</b><span>119 滿床通報</span></div>
    <div class="stat"><b>${congested}</b><span>壅塞以上</span></div>
    <div class="stat"><b>${d.count}</b><span>監測醫院</span></div>
    <div class="stat"><b>${d.sysdate.slice(11, 16)}</b><span>資料時間</span></div>`;
}

/* ── markers ── */
function sevIcon(sev, full119) {
  const size = full119 ? 20 : [0, 12, 14, 16][sev];
  return L.divIcon({
    className: '',
    html: `<div class="er-marker s${sev}" style="width:${size}px;height:${size}px;background:${SEV_COLOR[sev]}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

function popupHtml(h) {
  const g = `https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`;
  return `<div class="pop">
    <h3>${h.name}${h.full119 ? ' 🔴' : ''}</h3>
    <div class="full-name">${h.fullName}</div>
    <div class="tags">
      <span class="tag">${h.city}</span>
      <span class="tag">${h.type}</span>
      <span class="tag" style="color:${SEV_COLOR[h.severity]};border-color:${SEV_COLOR[h.severity]}">${SEV_NAME[h.severity]}</span>
      ${h.full119 ? '<span class="tag full119">119 滿床通報</span>' : ''}
    </div>
    <table>
      <tr><td>等待看診</td><td>${h.waitSee} 人</td></tr>
      <tr><td>等待住院</td><td>${h.waitGeneral} 人</td></tr>
      <tr><td>等待加護病房</td><td>${h.waitIcu} 人</td></tr>
      <tr><td>等待推床 *</td><td>${h.waitBed} 人</td></tr>
    </table>
    <div class="updated">更新：${h.updatedAt?.replace('T', ' ').slice(0, 16) || '—'} ・ <a class="nav-link" href="${g}" target="_blank" rel="noopener">Google 導航 →</a></div>
  </div>`;
}

function renderMarkers() {
  for (const h of state.data.hospitals) {
    const m = L.marker([h.lat, h.lng], { icon: sevIcon(h.severity, h.full119), title: h.name })
      .bindPopup(popupHtml(h), { maxWidth: 280 })
      .addTo(map);
    m.on('click', () => selectHospital(h.id, false));
    state.markers.set(h.id, m);
  }
}

/* ── filter + list ── */
function filtered() {
  const q = state.query.trim().toLowerCase();
  return state.data.hospitals.filter((h) => {
    if (state.type && h.type !== state.type) return false;
    if (state.full119 && !h.full119) return false;
    if (q && ![h.name, h.fullName, h.city, h.type].some((s) => s.toLowerCase().includes(q))) return false;
    return true;
  });
}

function renderList() {
  const rows = filtered();
  listEl.innerHTML = rows.map((h) => `
    <li data-id="${h.id}" class="${state.selected === h.id ? 'selected' : ''}">
      <i class="dot s${h.severity}"></i>
      <div class="info">
        <b>${h.name}${h.full119 ? '<span class="badge-full">滿床</span>' : ''}</b>
        <small>${h.city} · ${h.type}</small>
      </div>
      <div class="metrics">住院 <b>${h.waitGeneral}</b> ・ ICU <b>${h.waitIcu}</b><br />看診 ${h.waitSee} 人</div>
    </li>`).join('');
  for (const li of listEl.children) {
    li.addEventListener('click', () => selectHospital(li.dataset.id, true));
  }
}

function selectHospital(id, fromList) {
  state.selected = id;
  const h = state.data.hospitals.find((x) => x.id === id);
  if (!h) return;
  renderList();
  const li = listEl.querySelector(`li[data-id="${id}"]`);
  li?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  map.flyTo([h.lat, h.lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
  state.markers.get(id)?.openPopup();
  if (fromList && window.innerWidth <= 768) panel.classList.remove('open');
}

/* ── controls ── */
$('#search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });

$('#type-chips').addEventListener('click', (e) => {
  const btn = e.target.closest('.chip');
  if (!btn) return;
  if (btn.dataset.full119) {
    state.full119 = !state.full119;
    btn.classList.toggle('active', state.full119);
  } else {
    state.type = btn.dataset.type;
    for (const c of $('#type-chips').querySelectorAll('[data-type]')) c.classList.toggle('active', c === btn);
  }
  renderList();
});

/* mobile bottom sheet */
$('#sheet-toggle').addEventListener('click', () => panel.classList.toggle('open'));
panel.querySelector('.panel-head').addEventListener('click', (e) => {
  if (window.innerWidth <= 768 && !e.target.closest('input,button')) panel.classList.toggle('open');
});
