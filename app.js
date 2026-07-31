/**
 * Focus Tracker — BCB Dashboard
 * app.js — Core application logic
 *
 * Data sources:
 *   • SGS (Sistema Gerenciador de Séries Temporais)
 *     https://api.bcb.gov.br/dados/serie/bcdata.sgs.{id}/dados?formato=json
 *   • OData Expectativas (Boletim Focus)
 *     https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/
 */

'use strict';

/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const CONFIG = {
  SGS_BASE: 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.',
  ODATA_BASE: 'https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/',
  SGS_SERIES: {
    ipca:   433,   // IPCA — variação mensal (%)
    selic:  432,   // Selic Over — % a.a. (diária → média mensal usamos 11)
    cambio: 1,     // USD/BRL — taxa de câmbio comercial
    igpm:   189,   // IGP-M (auxiliar)
  },
  REFRESH_INTERVAL_MS: 15 * 60 * 1000,  // 15 minutos
  TABLE_PAGE_SIZE: 10,
};

/* ─────────────────────────────────────────────
   STATE
───────────────────────────────────────────── */
const State = {
  activeChart: 'ipca',
  chartInstance: null,
  tableData: [],
  tableFiltered: [],
  tablePage: 1,
  sortCol: 'date',
  sortDir: 'desc',
  focusData: {},
  sgsData: {},
  expectations: {},
  loading: { kpi: true, chart: true, table: true, focus: true },
};

/* ─────────────────────────────────────────────
   UTILS
───────────────────────────────────────────── */
const fmt = {
  pct: (v) => v == null ? '—' : `${Number(v).toFixed(2)}%`,
  brl: (v) => v == null ? '—' : `R$ ${Number(v).toFixed(4)}`,
  num: (v, d = 2) => v == null ? '—' : Number(v).toFixed(d),
  date: (d) => {
    if (!d) return '—';
    const [y, m] = String(d).includes('-')
      ? d.split('-')
      : [d.slice(0, 4), d.slice(4, 6)];
    return `${m}/${y}`;
  },
  dateShort: (d) => {
    // d can be "DD/MM/YYYY" or "YYYY-MM-DD"
    if (!d) return '—';
    if (d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      return `${mm}/${yyyy}`;
    }
    const [yyyy, mm] = d.split('-');
    return `${mm}/${yyyy}`;
  },
};

function parseIsoDate(str) {
  if (!str) return null;
  if (str.includes('/')) {
    const [dd, mm, yyyy] = str.split('/');
    return new Date(`${yyyy}-${mm}-${dd}`);
  }
  return new Date(str);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function accuracy(expected, realized) {
  if (expected == null || realized == null) return null;
  const e = parseFloat(expected);
  const r = parseFloat(realized);
  if (e === 0) return 100;
  const deviation = Math.abs((r - e) / e) * 100;
  return clamp(100 - deviation, 0, 100);
}

/* Simple CORS-friendly fetch with timeout */
async function fetchJSON(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(tid);
  }
}

/* ─────────────────────────────────────────────
   API — SGS
───────────────────────────────────────────── */
async function fetchSGS(seriesId, dataInicial, dataFinal) {
  const url = `${CONFIG.SGS_BASE}${seriesId}/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
  const data = await fetchJSON(url);
  return data.map(d => ({
    date: d.data,           // "DD/MM/YYYY"
    value: parseFloat(d.valor),
  }));
}

/* ─────────────────────────────────────────────
   API — ODATA FOCUS EXPECTATIONS
───────────────────────────────────────────── */
/* Fetch monthly expectations (for monthly chart) */
async function fetchFocusMonthly(indicator, top = 500) {
  const filter = encodeURIComponent(`Indicador eq '${indicator}'`);
  const select = 'Data,DataReferencia,Mediana,Media,Minimo,Maximo,numeroRespondentes';
  const url = `${CONFIG.ODATA_BASE}ExpectativaMercadoMensais?%24format=json&%24filter=${filter}&%24select=${select}&%24top=${top}&%24orderby=Data%20desc`;
  try {
    const json = await fetchJSON(url);
    return json.value || [];
  } catch (e) { console.warn('fetchFocusMonthly', e); return []; }
}

/* Fetch annual expectations for a given year reference */
async function fetchFocusAnnual(indicator, top = 200) {
  const filter = encodeURIComponent(`Indicador eq '${indicator}'`);
  const select = 'Data,DataReferencia,Mediana,Media,Minimo,Maximo,DesvioPadrao,numeroRespondentes,baseCalculo';
  const url = `${CONFIG.ODATA_BASE}ExpectativasMercadoAnuais?%24format=json&%24filter=${filter}&%24select=${select}&%24top=${top}&%24orderby=Data%20desc`;
  try {
    const json = await fetchJSON(url);
    return json.value || [];
  } catch (e) { console.warn('fetchFocusAnnual', e); return []; }
}

/* Fetch the single latest annual Focus entry for a specific indicator + year (for KPI cards) */
async function fetchFocusLatest(indicator, year) {
  const filter = encodeURIComponent(`Indicador eq '${indicator}' and DataReferencia eq '${year}' and baseCalculo eq 0`);
  const select = 'Data,DataReferencia,Mediana,Media,Minimo,Maximo,DesvioPadrao,numeroRespondentes';
  const url = `${CONFIG.ODATA_BASE}ExpectativasMercadoAnuais?%24format=json&%24filter=${filter}&%24select=${select}&%24top=1&%24orderby=Data%20desc`;
  try {
    const json = await fetchJSON(url);
    return (json.value || [])[0] || null;
  } catch (e) { console.warn('fetchFocusLatest', e); return null; }
}

/* ─────────────────────────────────────────────
   BACKGROUND CANVAS — Particle field
───────────────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 120 }, createParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 155, 255, ${p.alpha})`;
      ctx.fill();
    });

    // Draw sparse connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99, 155, 255, ${0.07 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

/* ─────────────────────────────────────────────
   SPARKLINES (mini SVG in cards)
───────────────────────────────────────────── */
function renderSparkline(container, values, color) {
  if (!values || values.length < 2) return;
  const w = container.clientWidth || 200;
  const h = 52;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'width:100%;height:100%;display:block;';

  const polyline = document.createElementNS(ns, 'polyline');
  polyline.setAttribute('points', pts.join(' '));
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', color);
  polyline.setAttribute('stroke-width', '1.5');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('stroke-linecap', 'round');

  const area = document.createElementNS(ns, 'polygon');
  area.setAttribute('points', `0,${h} ${pts.join(' ')} ${w},${h}`);
  area.setAttribute('fill', `url(#spark-grad-${color.replace('#','').replace('(','-').replace(',','-').replace(')','')})`);
  area.setAttribute('opacity', '0.4');

  const defs = document.createElementNS(ns, 'defs');
  const gid = `sg${Math.random().toString(36).slice(2)}`;
  defs.innerHTML = `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity="0.7"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </linearGradient>`;
  area.setAttribute('fill', `url(#${gid})`);

  svg.appendChild(defs);
  svg.appendChild(area);
  svg.appendChild(polyline);
  container.innerHTML = '';
  container.appendChild(svg);
}

/* ─────────────────────────────────────────────
   KPI CARDS
───────────────────────────────────────────── */
const CARD_DEFS = [
  {
    id: 'ipca', label: 'IPCA', icon: '📈', unit: '%',
    cls: 'ipca', color: 'hsl(210, 100%, 65%)',
    desc: 'Inflação acumulada 12 meses', dataKey: 'ipca',
  },
  {
    id: 'selic', label: 'Selic', icon: '🏦', unit: '% a.a.',
    cls: 'selic', color: 'hsl(152, 69%, 52%)',
    desc: 'Taxa básica de juros', dataKey: 'selic',
  },
  {
    id: 'cambio', label: 'USD/BRL', icon: '💱', unit: 'R$',
    cls: 'cambio', color: 'hsl(38, 100%, 62%)',
    desc: 'Câmbio comercial', dataKey: 'cambio',
  },
  {
    id: 'pib', label: 'PIB', icon: '📊', unit: '% a.a.',
    cls: 'pib', color: 'hsl(260, 80%, 65%)',
    desc: 'Crescimento esperado', dataKey: 'pib',
  },
];

function buildKPICard(def, value, prevValue, focusExp) {
  const delta = (value != null && prevValue != null) ? value - prevValue : null;
  const deltaDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const deltaSign = delta > 0 ? '▲' : delta < 0 ? '▼' : '—';
  const displayVal = value != null ? Number(value).toFixed(2) : '—';
  const focusVal = focusExp != null ? Number(focusExp).toFixed(2) : '—';

  return `
  <div class="kpi-card ${def.cls}" role="listitem" aria-label="${def.label}: ${displayVal}${def.unit}">
    <div class="card-header">
      <span class="card-label">${def.label}</span>
      <span class="card-icon" aria-hidden="true">${def.icon}</span>
    </div>
    <div class="card-value">
      ${def.id === 'cambio' ? '' : ''}${displayVal}<span class="card-unit"> ${def.unit}</span>
    </div>
    <div class="card-meta">
      <span class="card-sub">${def.desc}</span>
      <span class="card-sub">Focus: <strong style="color:var(--clr-text-primary)">${focusVal}${def.unit !== 'R$' ? def.unit : ''}</strong></span>
      ${delta != null
        ? `<span class="card-delta ${deltaDir}">${deltaSign} ${Math.abs(delta).toFixed(2)}${def.unit === 'R$' ? '' : ' p.p.'} vs mês anterior</span>`
        : ''
      }
    </div>
    <div class="card-sparkline" id="sparkline-${def.id}" aria-hidden="true"></div>
  </div>`;
}

async function loadKPISection() {
  const grid = document.getElementById('kpi-grid');
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const yPrev = today.getMonth() < 6 ? y - 1 : y;
  const dataIni = `01/01/${y - 6}`;
  const dataFim = `${String(today.getDate()).padStart(2,'0')}/${m}/${y}`;

  try {
    // Fetch SGS series in parallel
    const [ipcaRaw, selicRaw, cambioRaw] = await Promise.all([
      fetchSGS(CONFIG.SGS_SERIES.ipca,   dataIni, dataFim),
      fetchSGS(CONFIG.SGS_SERIES.selic,   dataIni, dataFim),   // 432 = Selic % a.a.
      fetchSGS(CONFIG.SGS_SERIES.cambio, dataIni, dataFim),
    ]);

    // Fetch latest annual Focus expectations (current year, most recent survey)
    const currentYear = new Date().getFullYear();
    const [ipcaFocus, selicFocus, pibFocus, cambioFocus] = await Promise.all([
      fetchFocusLatest('IPCA',      currentYear),
      fetchFocusLatest('Selic',     currentYear),
      fetchFocusLatest('PIB Total', currentYear),
      fetchFocusLatest('Câmbio',    currentYear),
    ]);

    State.sgsData.ipca   = ipcaRaw;
    State.sgsData.selic  = selicRaw;
    State.sgsData.cambio = cambioRaw;

    // Compute IPCA acumulado 12 meses
    const ipcaLast12 = ipcaRaw.slice(-12);
    const ipcaAcum = ipcaLast12.reduce((acc, d) => (1 + acc) * (1 + d.value / 100) - 1, 0) * 100;
    const ipcaAcumPrev = ipcaRaw.slice(-13, -1).reduce((acc, d) => (1 + acc) * (1 + d.value / 100) - 1, 0) * 100;

    const selicLast = selicRaw.length ? selicRaw[selicRaw.length - 1].value : null;
    const selicPrev = selicRaw.length > 1 ? selicRaw[selicRaw.length - 2].value : null;

    const cambioLast = cambioRaw.length ? cambioRaw[cambioRaw.length - 1].value : null;
    const cambioPrev = cambioRaw.length > 1 ? cambioRaw[cambioRaw.length - 2].value : null;

    // PIB: only from Focus
    const pibFocusVal = pibFocus?.Mediana ?? null;

    const values = {
      ipca:   ipcaAcum,
      selic:  selicLast,
      cambio: cambioLast,
      pib:    pibFocusVal,
    };
    const prevValues = {
      ipca:   ipcaAcumPrev,
      selic:  selicPrev,
      cambio: cambioPrev,
      pib:    null,
    };
    const focusExp = {
      ipca:   ipcaFocus?.Mediana   ?? null,
      selic:  selicFocus?.Mediana  ?? null,
      cambio: cambioFocus?.Mediana ?? null,
      pib:    pibFocusVal,
    };

    State.focusData = { ipcaFocus, selicFocus, pibFocus, cambioFocus };


    // Build cards
    const html = CARD_DEFS.map(def => buildKPICard(
      def,
      values[def.id],
      prevValues[def.id],
      focusExp[def.id]
    )).join('');

    grid.innerHTML = html;

    // Render sparklines after DOM is ready
    requestAnimationFrame(() => {
      const sparkDefs = [
        { id: 'ipca',   data: ipcaRaw.slice(-24).map(d => d.value), color: 'hsl(210,100%,65%)' },
        { id: 'selic',  data: selicRaw.slice(-24).map(d => d.value), color: 'hsl(152,69%,52%)' },
        { id: 'cambio', data: cambioRaw.slice(-24).map(d => d.value), color: 'hsl(38,100%,62%)' },
        { id: 'pib',    data: [], color: 'hsl(260,80%,65%)' },
      ];
      sparkDefs.forEach(s => {
        const el = document.getElementById(`sparkline-${s.id}`);
        if (el && s.data.length > 1) renderSparkline(el, s.data, s.color);
      });
    });

  } catch (err) {
    console.error('KPI load error:', err);
    grid.innerHTML = `<div class="kpi-card" style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;color:var(--clr-text-muted);">
      Falha ao carregar dados. <button onclick="loadAll()" style="margin-left:8px;background:none;border:none;color:var(--clr-accent);cursor:pointer;font-family:inherit;">Tentar novamente</button>
    </div>`;
  }
  State.loading.kpi = false;
}

/* ─────────────────────────────────────────────
   CHART
───────────────────────────────────────────── */
const CHART_CONFIG = {
  ipca: {
    label: 'IPCA',
    sgsId: CONFIG.SGS_SERIES.ipca,
    focusIndicator: 'IPCA',
    unit: '%',
    color: 'hsl(210, 100%, 65%)',
    cumulate12m: true,
  },
  selic: {
    label: 'Selic',
    sgsId: CONFIG.SGS_SERIES.selic,
    focusIndicator: 'Selic',
    unit: '% a.a.',
    color: 'hsl(152, 69%, 52%)',
    cumulate12m: false,
  },
  cambio: {
    label: 'USD/BRL',
    sgsId: CONFIG.SGS_SERIES.cambio,
    focusIndicator: 'Câmbio',
    unit: 'R$',
    color: 'hsl(38, 100%, 62%)',
    cumulate12m: false,
  },
  pib: {
    label: 'PIB',
    sgsId: null, // no direct SGS, use Focus only
    focusIndicator: 'PIB Total',
    unit: '% a.a.',
    color: 'hsl(260, 80%, 65%)',
    cumulate12m: false,
  },
};

async function loadChart(indicator) {
  const cfg = CHART_CONFIG[indicator];
  const loading = document.getElementById('chart-loading');
  loading.classList.remove('hidden');

  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const dataIni = `01/01/${y - 3}`;
    const dataFim = `${String(today.getDate()).padStart(2,'0')}/${m}/${y}`;

    let realizedDates = [];
    let realizedValues = [];

    if (cfg.sgsId && State.sgsData[indicator]) {
      const raw = State.sgsData[indicator];
      if (cfg.cumulate12m) {
        // Rolling 12-month IPCA
        for (let i = 11; i < raw.length; i++) {
          const slice = raw.slice(i - 11, i + 1);
          const acum = slice.reduce((acc, d) => (1 + acc) * (1 + d.value / 100) - 1, 0) * 100;
          realizedDates.push(parseIsoDate(raw[i].date));
          realizedValues.push(acum);
        }
      } else {
        realizedDates = raw.map(d => parseIsoDate(d.date));
        realizedValues = raw.map(d => d.value);
      }
    } else if (cfg.sgsId) {
      const raw = await fetchSGS(cfg.sgsId, dataIni, dataFim);
      State.sgsData[indicator] = raw;
      realizedDates = raw.map(d => parseIsoDate(d.date));
      realizedValues = raw.map(d => d.value);
    }

    // Focus expectations — annual, baseCalculo=0 = previsão sem suavização
    const focusRaw = await fetchFocusAnnual(cfg.focusIndicator, 500);
    // Group by DataReferencia (year), take latest survey date per year, only baseCalculo=0
    const byYear = {};
    focusRaw.filter(r => r.baseCalculo === 0).forEach(row => {
      const yr = row.DataReferencia;
      if (!byYear[yr] || row.Data > byYear[yr].Data) {
        byYear[yr] = row;
      }
    });
    const focusPoints = Object.values(byYear)
      .sort((a, b) => String(a.DataReferencia).localeCompare(String(b.DataReferencia)))
      .map(row => ({
        x: new Date(`${row.DataReferencia}-06-30`),
        y: row.Mediana,
      }));

    // Build chart
    if (State.chartInstance) {
      State.chartInstance.destroy();
      State.chartInstance = null;
    }

    const canvas = document.getElementById('main-chart');
    const accentColor = cfg.color;
    const realizedColor = 'hsl(152, 69%, 52%)';
    const expectedColor = accentColor;

    State.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Realizado',
            data: realizedDates.map((d, i) => ({ x: d, y: realizedValues[i] })),
            borderColor: realizedColor,
            backgroundColor: realizedColor.replace('hsl', 'hsla').replace(')', ', 0.08)'),
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            tension: 0.3,
            fill: true,
            order: 1,
          },
          {
            label: 'Expectativa Focus (Mediana Anual)',
            data: focusPoints,
            borderColor: expectedColor,
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            borderDash: [6, 4],
            pointRadius: 5,
            pointHoverRadius: 7,
            pointBackgroundColor: expectedColor,
            tension: 0.2,
            fill: false,
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.8,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(13, 18, 32, 0.96)',
            borderColor: 'rgba(99, 120, 180, 0.3)',
            borderWidth: 1,
            titleColor: 'hsl(220, 20%, 96%)',
            bodyColor: 'hsl(220, 15%, 62%)',
            padding: 12,
            titleFont: { family: "'Inter', sans-serif", weight: '600', size: 12 },
            bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(2)} ${cfg.unit}`,
            },
          },
        },
        scales: {
          x: {
            type: 'time',
            time: { unit: 'month', displayFormats: { month: 'MM/yyyy' } },
            grid: { color: 'rgba(99, 120, 180, 0.08)', drawBorder: false },
            ticks: {
              color: 'hsl(220, 12%, 40%)',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              maxTicksLimit: 12,
            },
          },
          y: {
            grid: { color: 'rgba(99, 120, 180, 0.08)', drawBorder: false },
            ticks: {
              color: 'hsl(220, 12%, 40%)',
              font: { family: "'JetBrains Mono', monospace", size: 10 },
              callback: (v) => `${v.toFixed(1)} ${cfg.unit}`,
            },
          },
        },
      },
    });

    // Build legend
    const legend = document.getElementById('chart-legend');
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:${realizedColor}"></span>Realizado (SGS/BCB)</div>
      <div class="legend-item"><span class="legend-dot" style="background:${expectedColor};opacity:0.5"></span>Expectativa Focus (Mediana)</div>
    `;

  } catch (err) {
    console.error('Chart error:', err);
  } finally {
    loading.classList.add('hidden');
  }
}

/* ─────────────────────────────────────────────
   COMPARISON TABLE
───────────────────────────────────────────── */
async function loadTable() {
  try {
    const today = new Date();
    const y = today.getFullYear();

    // Build comparison rows from Focus annual data
    const indicators = [
      { key: 'IPCA',      label: 'IPCA',    cls: 'ipca',   unit: '%',     sgsId: CONFIG.SGS_SERIES.ipca },
      { key: 'Selic',     label: 'Selic',   cls: 'selic',  unit: '%a.a.', sgsId: CONFIG.SGS_SERIES.selic },
      { key: 'Câmbio',    label: 'Câmbio',  cls: 'cambio', unit: 'R$',    sgsId: CONFIG.SGS_SERIES.cambio },
      { key: 'PIB Total', label: 'PIB',     cls: 'pib',    unit: '%',     sgsId: null },
    ];

    // Build target years list (e.g. 5 years back to 2 years ahead)
    const targetYears = [];
    for (let yr = y - 5; yr <= y + 2; yr++) targetYears.push(yr);

    const fetchPromises = [];
    indicators.forEach(ind => {
      targetYears.forEach(yr => {
        fetchPromises.push(
          fetchFocusLatest(ind.key, yr).then(focusRow => ({
            ind,
            yr,
            expected: focusRow?.Mediana ?? null,
          }))
        );
      });
    });

    const results = await Promise.all(fetchPromises);
    const rows = [];

    results.forEach(({ ind, yr, expected }) => {
      if (expected == null) return;

      let realized = null;
      if (yr < y && ind.sgsId && State.sgsData[ind.cls]) {
        const sgs = State.sgsData[ind.cls];
        const yearData = sgs.filter(d => {
          const dateObj = parseIsoDate(d.date);
          return dateObj && dateObj.getFullYear() === yr;
        });
        if (yearData.length) {
          if (ind.cls === 'ipca') {
            realized = yearData.reduce((acc, d) => (1 + acc) * (1 + d.value / 100) - 1, 0) * 100;
          } else {
            realized = yearData[yearData.length - 1].value;
          }
        }
      }

      rows.push({
        indicator: ind.label,
        indicatorCls: ind.cls,
        year: yr,
        date: `${yr}`,
        expected: expected,
        realized: realized,
        unit: ind.unit,
      });
    });

    // Sort rows: completed years (with realized values) first (descending), then future years (ascending)
    rows.sort((a, b) => {
      const aDone = a.realized != null;
      const bDone = b.realized != null;
      if (aDone && !bDone) return -1;
      if (!aDone && bDone) return 1;
      if (aDone && bDone) return b.year - a.year || a.indicator.localeCompare(b.indicator);
      return a.year - b.year || a.indicator.localeCompare(b.indicator);
    });

    State.tableData = rows;
    State.tableFiltered = [...rows];

    // Populate year filter
    const years = [...new Set(rows.map(r => r.year))].sort((a,b) => b-a);
    const yearSel = document.getElementById('filter-year');
    years.forEach(yr => {
      const opt = document.createElement('option');
      opt.value = yr;
      opt.textContent = yr;
      yearSel.appendChild(opt);
    });

    renderTable();
  } catch (err) {
    console.error('Table error:', err);
  }
}

function renderTable() {
  const tbody = document.getElementById('table-body');
  const ps = CONFIG.TABLE_PAGE_SIZE;
  const totalPages = Math.ceil(State.tableFiltered.length / ps);
  const page = clamp(State.tablePage, 1, totalPages || 1);
  const slice = State.tableFiltered.slice((page - 1) * ps, page * ps);

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--clr-text-muted);padding:2rem;">Nenhum dado encontrado.</td></tr>`;
    renderPagination(0, 0);
    return;
  }

  tbody.innerHTML = slice.map(row => {
    const dev = (row.expected != null && row.realized != null)
      ? row.realized - row.expected : null;
    const acc = accuracy(row.expected, row.realized);
    const devCls = dev == null ? 'zero' : dev > 0 ? 'positive' : 'negative';
    const devTxt = dev == null ? '—' : `${dev >= 0 ? '+' : ''}${dev.toFixed(2)} ${row.unit}`;
    const accTxt = acc == null ? '—' : `${acc.toFixed(0)}%`;
    const accW = acc == null ? 0 : acc;

    return `
    <tr>
      <td><span class="badge-indicator ${row.indicatorCls}">${row.indicator}</span></td>
      <td class="td-mono">${row.date}</td>
      <td class="td-mono">${row.expected != null ? row.expected.toFixed(2) + ' ' + row.unit : '—'}</td>
      <td class="td-mono">${row.realized != null ? row.realized.toFixed(2) + ' ' + row.unit : '<span style=\'color:var(--clr-text-muted);font-style:italic\'>aguardando</span>'}</td>
      <td><span class="deviation-pill ${devCls}">${devTxt}</span></td>
      <td>
        <div class="accuracy-bar-wrapper">
          <div class="accuracy-bar-bg" role="progressbar" aria-valuenow="${acc ?? 0}" aria-valuemin="0" aria-valuemax="100">
            <div class="accuracy-bar-fill" style="width:${accW}%;background-size:${100/accW*100}% 100%"></div>
          </div>
          <span class="accuracy-pct">${accTxt}</span>
        </div>
      </td>
    </tr>`;
  }).join('');

  renderPagination(page, totalPages);
}

function renderPagination(currentPage, totalPages) {
  const container = document.getElementById('table-pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="gotoPage(${currentPage - 1})" aria-label="Página anterior">‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="gotoPage(${i})" aria-label="Página ${i}" aria-current="${i === currentPage ? 'page' : 'false'}">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="page-info">…</span>`;
    }
  }

  html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="gotoPage(${currentPage + 1})" aria-label="Próxima página">›</button>`;
  html += `<span class="page-info">${State.tableFiltered.length} registros</span>`;
  container.innerHTML = html;
}

window.gotoPage = (p) => {
  State.tablePage = p;
  renderTable();
  document.getElementById('table-heading').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

/* Filters */
function applyTableFilters() {
  const indFilter = document.getElementById('filter-indicator').value;
  const yearFilter = document.getElementById('filter-year').value;

  State.tableFiltered = State.tableData.filter(row => {
    if (indFilter !== 'all' && row.indicator !== indFilter) return false;
    if (yearFilter !== 'all' && String(row.year) !== yearFilter) return false;
    return true;
  });
  State.tablePage = 1;
  renderTable();
}

/* Sort */
function sortTable(col) {
  if (State.sortCol === col) {
    State.sortDir = State.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    State.sortCol = col;
    State.sortDir = 'desc';
  }
  const dir = State.sortDir === 'asc' ? 1 : -1;
  State.tableFiltered.sort((a, b) => {
    const va = a[col]; const vb = b[col];
    return va < vb ? -dir : va > vb ? dir : 0;
  });
  State.tablePage = 1;
  renderTable();

  // Update aria-sort
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    th.setAttribute('aria-sort', 'none');
    if (th.dataset.col === col) {
      th.classList.add(`sorted-${State.sortDir}`);
      th.setAttribute('aria-sort', State.sortDir === 'asc' ? 'ascending' : 'descending');
    }
  });
}

/* Export CSV */
function exportCSV() {
  const header = ['Indicador', 'Ano Referência', 'Expectativa', 'Realizado', 'Desvio', 'Unidade'];
  const rows = State.tableFiltered.map(r => {
    const dev = (r.expected != null && r.realized != null) ? (r.realized - r.expected).toFixed(2) : '';
    return [r.indicator, r.year, r.expected?.toFixed(2) ?? '', r.realized?.toFixed(2) ?? '', dev, r.unit];
  });
  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `focus_tracker_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

/* ─────────────────────────────────────────────
   FOCUS DETAIL CARDS
───────────────────────────────────────────── */
async function loadFocusDetail() {
  const grid = document.getElementById('focus-grid');
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  try {
    const [ipcaCurr, selicCurr, cambCurr, pibCurr] = await Promise.all([
      fetchFocusAnnual('IPCA', 50),
      fetchFocusAnnual('Selic', 50),
      fetchFocusAnnual('Câmbio', 50),
      fetchFocusAnnual('PIB Total', 50),
    ]);

    const getRow = (data, yr) => data.find(d => parseInt(d.DataReferencia) === yr) || null;

    const cards = [
      { title: 'IPCA', dataCurr: ipcaCurr, unit: '%' },
      { title: 'Selic', dataCurr: selicCurr, unit: '% a.a.' },
      { title: 'Câmbio', dataCurr: cambCurr, unit: 'R$' },
      { title: 'PIB', dataCurr: pibCurr, unit: '%' },
    ];

    grid.innerHTML = cards.map(c => {
      const curr = getRow(c.dataCurr, currentYear);
      const next = getRow(c.dataCurr, nextYear);

      const makeRow = (label, val, suffix = '') => `
        <div class="focus-row">
          <span class="focus-row-label">${label}</span>
          <span class="focus-row-value ${suffix}">${val != null ? Number(val).toFixed(2) + ' ' + c.unit : '—'}</span>
        </div>`;

      return `
      <div class="focus-card">
        <div class="focus-card-header">
          <span class="focus-card-title">${c.title}</span>
          <span class="focus-card-year-badge">Focus ${currentYear}/${nextYear}</span>
        </div>
        <div class="focus-rows">
          <div class="focus-row" style="padding-bottom:4px;border-bottom:1px solid rgba(99,120,180,0.15);margin-bottom:4px">
            <span class="focus-row-label" style="font-size:0.62rem;text-transform:uppercase;letter-spacing:.06em">Ano</span>
            <span class="focus-row-label" style="font-size:0.62rem;text-transform:uppercase;letter-spacing:.06em">Mediana</span>
          </div>
          ${makeRow(currentYear, curr?.Mediana, 'highlight')}
          ${makeRow(nextYear, next?.Mediana)}
          ${curr ? makeRow('Mín.', curr.Minimo) : ''}
          ${curr ? makeRow('Máx.', curr.Maximo) : ''}
          ${curr ? `<div class="focus-row"><span class="focus-row-label">Respondentes</span><span class="focus-row-value">${curr.numeroRespondentes ?? '—'}</span></div>` : ''}
        </div>
      </div>`;
    }).join('');

  } catch (err) {
    console.error('Focus detail error:', err);
    grid.innerHTML = `<div class="focus-card" style="grid-column:1/-1;text-align:center;color:var(--clr-text-muted)">Falha ao carregar detalhamento Focus.</div>`;
  }
}

/* ─────────────────────────────────────────────
   NEWS TICKER (RSS BCB via allorigins proxy)
───────────────────────────────────────────── */
async function loadNewsTicker() {
  const track = document.getElementById('ticker-track');
  const RSS_URL = 'https://www.bcb.gov.br/api/feed/sitebcb/notas-pt-br/rss';

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`;
    const json = await fetchJSON(proxyUrl, 8000);
    if (!json.contents) throw new Error('No contents');

    const parser = new DOMParser();
    const doc = parser.parseFromString(json.contents, 'text/xml');
    const items = [...doc.querySelectorAll('item')].slice(0, 12);

    if (!items.length) throw new Error('No items');

    const texts = items.map(item => {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const date  = item.querySelector('pubDate')?.textContent?.trim() || '';
      const d = date ? new Date(date).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '';
      return `${d ? `[${d}] ` : ''}${title}`;
    });

    // Duplicate for seamless loop
    const allTexts = [...texts, ...texts];
    track.innerHTML = allTexts.map(t => `<span class="ticker-item">${t}</span>`).join('');

  } catch {
    // Fallback static items if RSS fails
    const fallbacks = [
      'Boletim Focus: expectativas de mercado atualizadas semanalmente pelo BCB',
      'SGS: Sistema Gerenciador de Séries Temporais — histórico completo disponível em api.bcb.gov.br',
      'Copom: próxima reunião define a taxa Selic básica da economia',
      'IPCA: índice oficial de inflação medido pelo IBGE mensalmente',
      'Câmbio comercial USD/BRL atualizado diariamente pelo Banco Central',
      'PIB: crescimento do Produto Interno Bruto projetado pelo mercado via Boletim Focus',
    ];
    const all = [...fallbacks, ...fallbacks];
    track.innerHTML = all.map(t => `<span class="ticker-item">${t}</span>`).join('');
  }
}

/* ─────────────────────────────────────────────
   ECONOMIC NEWS PORTAL GRID
───────────────────────────────────────────── */
async function loadNewsGrid() {
  const grid = document.getElementById('news-grid');
  if (!grid) return;

  const RSS_URL = 'https://www.bcb.gov.br/api/feed/sitebcb/notas-pt-br/rss';
  const categories = ['Política Monetária', 'Copom', 'Inflação & Meta', 'Mercado Financeiro', 'Câmbio', 'Notas Técnicas'];

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`;
    const json = await fetchJSON(proxyUrl, 8000);
    if (!json.contents) throw new Error('No contents');

    const parser = new DOMParser();
    const doc = parser.parseFromString(json.contents, 'text/xml');
    const items = [...doc.querySelectorAll('item')].slice(0, 6);

    if (!items.length) throw new Error('No items');

    grid.innerHTML = items.map((item, idx) => {
      const title = item.querySelector('title')?.textContent?.trim() || 'Nota do Banco Central';
      const link  = item.querySelector('link')?.textContent?.trim() || 'https://www.bcb.gov.br';
      const dateStr  = item.querySelector('pubDate')?.textContent?.trim() || '';
      const d = dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' }) : 'Recente';
      const tag = categories[idx % categories.length];

      return `
      <a href="${link}" target="_blank" rel="noopener noreferrer" class="news-card" aria-label="${title}">
        <div>
          <span class="news-card-tag">${tag}</span>
          <h3 class="news-card-title">${title}</h3>
        </div>
        <div class="news-card-meta">
          <span class="news-card-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${d}
          </span>
          <span class="news-card-link-icon">Ler nota ↗</span>
        </div>
      </a>`;
    }).join('');

  } catch {
    // Fallback news cards
    const fallbacks = [
      { tag: 'Política Monetária', title: 'Ata do Copom detalha balanço de riscos para inflação e trajetória da Selic', date: 'Hoje' },
      { tag: 'Inflação & Meta', title: 'Expectativas para o IPCA permanecem ancoradas na meta oficial do Banco Central', date: 'Ontem' },
      { tag: 'Câmbio', title: 'Banco Central divulga relatório mensal de fluxo cambial e intervenções no mercado', date: 'Esta semana' },
      { tag: 'Mercado Financeiro', title: 'Boletim Focus consolida previsões dos principais economistas e instituições', date: 'Esta semana' },
      { tag: 'PIB & Atividade', title: 'Índice de Atividade Econômica do Banco Central (IBC-Br) indica ritmo do PIB', date: 'Esta semana' },
      { tag: 'Notas Técnicas', title: 'Relatório Trimestral de Inflação apresenta cenários alternativos para a economia', date: 'Esta semana' },
    ];
    grid.innerHTML = fallbacks.map(item => `
      <a href="https://www.bcb.gov.br" target="_blank" rel="noopener noreferrer" class="news-card">
        <div>
          <span class="news-card-tag">${item.tag}</span>
          <h3 class="news-card-title">${item.title}</h3>
        </div>
        <div class="news-card-meta">
          <span class="news-card-date">${item.date}</span>
          <span class="news-card-link-icon">Ler nota ↗</span>
        </div>
      </a>
    `).join('');
  }
}

/* ─────────────────────────────────────────────
   LAST UPDATE DISPLAY
───────────────────────────────────────────── */
function updateTimestamp() {
  const el = document.getElementById('last-update-text');
  const now = new Date();
  el.textContent = `Atualizado às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

/* ─────────────────────────────────────────────
   MAIN LOAD
───────────────────────────────────────────── */
async function loadAll() {
  const btn = document.getElementById('btn-refresh');
  btn.classList.add('loading');

  try {
    // Load in order: KPI first (populates sgsData), then others
    await loadKPISection();
    await Promise.all([
      loadChart(State.activeChart),
      loadNewsGrid(),
      loadFocusDetail(),
      loadNewsTicker(),
    ]);
    updateTimestamp();
  } finally {
    btn.classList.remove('loading');
  }
}

/* ─────────────────────────────────────────────
   EVENT LISTENERS
───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  // Refresh button
  document.getElementById('btn-refresh').addEventListener('click', loadAll);

  // Chart tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      State.activeChart = btn.dataset.indicator;
      loadChart(State.activeChart);
    });
  });

  // Auto refresh every 15 min
  setInterval(loadAll, CONFIG.REFRESH_INTERVAL_MS);

  // Initial load
  loadAll();
});
