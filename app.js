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
  if (!canvas) return;
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
    cls: 'ipca', color: 'hsl(187, 100%, 50%)',
    desc: 'Inflação acumulada 12m', dataKey: 'ipca',
    tooltip: 'Índice de Preços ao Consumidor Amplo. Inflação oficial do IBGE acumulada nos últimos 12 meses.',
  },
  {
    id: 'selic', label: 'Selic', icon: '🏦', unit: '% a.a.',
    cls: 'selic', color: 'hsl(147, 100%, 45%)',
    desc: 'Taxa básica de juros', dataKey: 'selic',
    tooltip: 'Taxa básica de juros definida pelo Copom/BCB que baliza o mercado financeiro nacional.',
  },
  {
    id: 'cambio', label: 'USD/BRL', icon: '💱', unit: 'R$',
    cls: 'cambio', color: 'hsl(42, 100%, 50%)',
    desc: 'Câmbio comercial', dataKey: 'cambio',
    tooltip: 'Cotação do Dólar comercial americano em relação ao Real brasileiro.',
  },
  {
    id: 'pib', label: 'PIB', icon: '📊', unit: '% a.a.',
    cls: 'pib', color: 'hsl(265, 90%, 68%)',
    desc: 'Crescimento esperado', dataKey: 'pib',
    tooltip: 'Produto Interno Bruto. Soma de todos os bens e serviços finais produzidos no país.',
  },
];

function buildKPICard(def, value, prevValue, focusExp) {
  const delta = (value != null && prevValue != null) ? value - prevValue : null;
  const displayVal = value != null ? Number(value).toFixed(2) : '—';
  const focusVal = focusExp != null ? Number(focusExp).toFixed(2) : '—';

  let deltaHTML = '';
  if (delta != null) {
    const absDelta = Math.abs(delta);
    if (absDelta < 0.001) {
      deltaHTML = `<span class="card-delta flat">— Estável vs anterior</span>`;
    } else {
      let isGood = false;
      if (def.id === 'ipca' || def.id === 'cambio') {
        // Falling inflation / lower exchange rate is positive (green)
        isGood = delta < 0;
      } else {
        // Selic / PIB growth is positive (green)
        isGood = delta > 0;
      }
      const dirCls = isGood ? 'up' : 'down';
      const sign = delta > 0 ? '▲' : '▼';
      const deltaText = def.unit === 'R$' ? `R$ ${absDelta.toFixed(2)}` : `${absDelta.toFixed(2)} p.p.`;
      deltaHTML = `<span class="card-delta ${dirCls}">${sign} ${deltaText} vs anterior</span>`;
    }
  }

  return `
  <div class="kpi-card ${def.cls}" role="listitem" aria-label="${def.label}: ${displayVal}${def.unit}">
    <div class="card-header">
      <div class="card-label-group">
        <span class="card-label">${def.label}</span>
        <span class="scope-note-trigger" tabindex="0" aria-label="Explicação sobre ${def.label}" data-tooltip="${def.tooltip}">ⓘ</span>
      </div>
      <span class="card-icon" aria-hidden="true">${def.icon}</span>
    </div>
    <div class="card-value">
      ${displayVal}<span class="card-unit"> ${def.unit}</span>
    </div>
    <div class="card-meta">
      <span class="card-sub">${def.desc}</span>
      <span class="card-sub">Focus: <strong style="color:var(--clr-text-primary)">${focusVal}${def.unit !== 'R$' ? def.unit : ''}</strong></span>
      ${deltaHTML}
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

  // Update Sketchbook annotation badge
  const sketchbookBadge = document.getElementById('chart-sketchbook-badge');
  if (sketchbookBadge) {
    const annotations = {
      ipca: '✏️ Meta Inflação: 3,00% (Intervalo 1,50% a 4,50%)',
      selic: '✏️ Decisão Copom: Manutenção de juros & Trajetória',
      cambio: '✏️ PTAX Banco Central: Cotação comercial de fechamento',
      pib: '✏️ Expectativa Focus: Produto Interno Bruto nacional',
    };
    sketchbookBadge.innerHTML = `<span>${annotations[indicator] || '✏️ Anotação Técnica BCB'}</span>`;
  }

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

/* Fetch Selic Copom meeting expectations */
async function fetchFocusSelicCopom(top = 100) {
  const select = 'Data,Reuniao,Mediana,Media,Minimo,Maximo,numeroRespondentes';
  const url = `${CONFIG.ODATA_BASE}ExpectativasMercadoSelic?%24format=json&%24select=${select}&%24top=${top}&%24orderby=Data%20desc`;
  try {
    const json = await fetchJSON(url);
    return json.value || [];
  } catch (e) { console.warn('fetchFocusSelicCopom', e); return []; }
}

/* ─────────────────────────────────────────────
   FOCUS DETAIL CARDS
───────────────────────────────────────────── */
async function loadFocusDetail() {
  const grid = document.getElementById('focus-grid');
  if (!grid) return;

  const currentYear = new Date().getFullYear();

  try {
    const [ipcaMonthly, selicCopom, cambMonthly, pibAnnual] = await Promise.all([
      fetchFocusMonthly('IPCA', 100),
      fetchFocusSelicCopom(100),
      fetchFocusMonthly('Câmbio', 100),
      fetchFocusAnnual('PIB Total', 50),
    ]);

    function getMonthlyRows(raw, unit) {
      if (!raw || !raw.length) return '';
      const latestDate = raw[0].Data;
      const survey = raw.filter(r => r.Data === latestDate);

      // Unique reference months sorted
      const monthsMap = {};
      survey.forEach(r => {
        if (!monthsMap[r.DataReferencia]) monthsMap[r.DataReferencia] = r;
      });

      const sorted = Object.values(monthsMap)
        .sort((a, b) => a.DataReferencia.localeCompare(b.DataReferencia))
        .slice(0, 5); // Take 5 upcoming months

      return sorted.map(r => {
        const [m, y] = r.DataReferencia.split('/');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const mLabel = `${monthNames[parseInt(m) - 1] ?? m}/${y.slice(2)}`;
        const valStr = r.Mediana != null ? Number(r.Mediana).toFixed(2) + ' ' + unit : '—';
        return `
        <div class="focus-row">
          <span class="focus-row-label">${mLabel}</span>
          <span class="focus-row-value highlight">${valStr}</span>
        </div>`;
      }).join('');
    }

    function getCopomRows(raw) {
      if (!raw || !raw.length) return '';
      const latestDate = raw[0].Data;
      const survey = raw.filter(r => r.Data === latestDate);

      const meetingsMap = {};
      survey.forEach(r => {
        if (!meetingsMap[r.Reuniao]) meetingsMap[r.Reuniao] = r;
      });

      const sorted = Object.values(meetingsMap)
        .sort((a, b) => {
          const [rA, yA] = a.Reuniao.split('/');
          const [rB, yB] = b.Reuniao.split('/');
          if (yA !== yB) return parseInt(yA) - parseInt(yB);
          return parseInt(rA.replace('R', '')) - parseInt(rB.replace('R', ''));
        })
        .slice(0, 5);

      return sorted.map(r => {
        const valStr = r.Mediana != null ? Number(r.Mediana).toFixed(2) + ' % a.a.' : '—';
        return `
        <div class="focus-row">
          <span class="focus-row-label">Copom ${r.Reuniao}</span>
          <span class="focus-row-value highlight">${valStr}</span>
        </div>`;
      }).join('');
    }

    const getAnnualRows = (raw, unit) => {
      const byYr = {};
      raw.filter(r => r.baseCalculo === 0).forEach(r => {
        if (!byYr[r.DataReferencia]) byYr[r.DataReferencia] = r;
      });
      return [currentYear, currentYear + 1, currentYear + 2].map(yr => {
        const r = byYr[yr];
        const valStr = r?.Mediana != null ? Number(r.Mediana).toFixed(2) + ' ' + unit : '—';
        return `
        <div class="focus-row">
          <span class="focus-row-label">${yr}</span>
          <span class="focus-row-value">${valStr}</span>
        </div>`;
      }).join('');
    };

    const cards = [
      { title: 'IPCA Mensal', badge: 'Próximos Meses', rows: getMonthlyRows(ipcaMonthly, '%') },
      { title: 'Selic Projetada', badge: 'Reuniões Copom', rows: getCopomRows(selicCopom) },
      { title: 'Câmbio Mensal', badge: 'Expectativa USD', rows: getMonthlyRows(cambMonthly, 'R$') },
      { title: 'PIB Anual', badge: 'Projeção Anual', rows: getAnnualRows(pibAnnual, '%') },
    ];

    grid.innerHTML = cards.map(c => `
      <div class="focus-card">
        <div class="focus-card-header">
          <span class="focus-card-title">${c.title}</span>
          <span class="focus-card-year-badge">${c.badge}</span>
        </div>
        <div class="focus-rows">
          ${c.rows}
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Focus detail error:', err);
    grid.innerHTML = `<div class="focus-card" style="grid-column:1/-1;text-align:center;color:var(--clr-text-muted)">Falha ao carregar detalhamento Focus.</div>`;
  }
}

/* ─────────────────────────────────────────────
   NEWS TICKER
───────────────────────────────────────────── */
async function loadNewsTicker() {
  const track = document.getElementById('ticker-track');
  if (!track) return;

  const headlines = [
    'Copom fixa meta da Taxa Selic em 14,25% a.a. na decisão do Banco Central',
    'IBGE / BCB: Inflação acumulada no IPCA atinge 4,64% nos últimos 12 meses',
    'Câmbio PTAX: Dólar comercial cotado a R$ 5,07 na taxa oficial de fechamento',
    'Boletim Focus: Mercado projeta IPCA em 5,12% e Selic em 14,00% a.a. para o fim de 2026',
    'Atividade Econômica: Projeção de crescimento do PIB nacional mantida em 1,99% a.a.',
    'Política Monetária: Banco Central reafirma compromisso com o centro da meta de inflação',
  ];

  const allTexts = [...headlines, ...headlines];
  track.innerHTML = allTexts.map(t => `<span class="ticker-item">${t}</span>`).join('');
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
      { tag: 'Política Monetária', title: 'Ata do Copom detalha balanço de riscos para inflação e trajetória da Selic', date: 'Oficial', url: 'https://www.bcb.gov.br/publicacoes/atascopom' },
      { tag: 'Inflação & Meta', title: 'Expectativas para o IPCA permanecem ancoradas na meta oficial do Banco Central', date: 'Oficial', url: 'https://www.bcb.gov.br/publicacoes/ri' },
      { tag: 'Mercado Financeiro', title: 'Boletim Focus consolida previsões dos principais economistas e instituições', date: 'Semanal', url: 'https://www.bcb.gov.br/controleinflacao/boletimfocus' },
      { tag: 'Copom & Juros', title: 'Calendário de Reuniões e Decisões da Taxa Selic pelo Banco Central', date: 'Oficial', url: 'https://www.bcb.gov.br/politicamonetaria/copom' },
      { tag: 'Câmbio & Reservas', title: 'Banco Central divulga estatísticas de setor externo e fluxo cambial', date: 'Mensal', url: 'https://www.bcb.gov.br/noticias' },
      { tag: 'Notas Técnicas', title: 'Relatório Trimestral de Inflação apresenta cenários alternativos para a economia', date: 'Trimestral', url: 'https://www.bcb.gov.br/publicacoes/ri' },
    ];
    grid.innerHTML = fallbacks.map(item => `
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="news-card">
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
   ENTERPRISE SEARCH MODAL (Ctrl+K) & SEARCH ZONES
───────────────────────────────────────────── */
const SEARCH_DATABASE = [
  { zone: 'bestbets', type: 'bestbet', title: '🎯 Meta de Inflação IPCA 2026', sub: 'Meta oficial estipulada pelo CMN: 3,00% com intervalo de tolerância de 1,50% a 4,50%', action: () => selectChartIndicator('ipca') },
  { zone: 'bestbets', type: 'bestbet', title: '🎯 Taxa Selic & Reuniões do Copom', sub: 'Acompanhe a trajetória da taxa básica de juros e o calendário oficial', action: () => selectChartIndicator('selic') },
  { zone: 'bestbets', type: 'bestbet', title: '🎯 Projeção do Dólar (USD/BRL)', sub: 'Expectativas de mercado para o câmbio comercial de fechamento', action: () => selectChartIndicator('cambio') },
  { zone: 'indicators', type: 'indicator', title: '📊 Série 433 — IPCA Variação Mensal', sub: 'SGS Banco Central · Índice Nacional de Preços ao Consumidor Amplo', action: () => selectChartIndicator('ipca') },
  { zone: 'indicators', type: 'indicator', title: '📊 Série 432 — Selic Anualizada % a.a.', sub: 'SGS Banco Central · Meta da taxa básica fixada pelo Copom', action: () => selectChartIndicator('selic') },
  { zone: 'indicators', type: 'indicator', title: '📊 Série 1 — Câmbio Dólar Comercial (PTAX)', sub: 'SGS Banco Central · Cotação de venda do Dólar americano', action: () => selectChartIndicator('cambio') },
  { zone: 'news', type: 'news', title: '📰 Atas das Reuniões do Copom', sub: 'Análise detalhada da diretoria do Banco Central sobre a economia e decisão da Selic', url: 'https://www.bcb.gov.br/publicacoes/atascopom' },
  { zone: 'news', type: 'news', title: '📰 Relatório Trimestral de Inflação (RTI)', sub: 'Projeções e cenários alternativos para a trajetória dos preços', url: 'https://www.bcb.gov.br/publicacoes/ri' },
  { zone: 'news', type: 'news', title: '📰 Pesquisa Focus — Relatório de Mercado', sub: 'Relatório semanal oficial com a mediana de +140 instituições financeiras', url: 'https://www.bcb.gov.br/controleinflacao/boletimfocus' },
  { zone: 'news', type: 'news', title: '📰 Calendário Copom & Decisões de Juros', sub: 'Datas das reuniões ordinárias e comunicados da Taxa Selic', url: 'https://www.bcb.gov.br/politicamonetaria/copom' },
];

function selectChartIndicator(ind) {
  const tab = document.getElementById(`tab-${ind}`);
  if (tab) tab.click();
  if (window.closeSearchModal) window.closeSearchModal();
}

function initEnterpriseSearch() {
  const modal = document.getElementById('search-modal');
  const triggerBtn = document.getElementById('btn-search-trigger');
  const closeBtn = document.getElementById('btn-close-search');
  const input = document.getElementById('search-input');
  const resultsContainer = document.getElementById('search-results-list');
  const zoneTabs = document.querySelectorAll('.zone-tab');

  if (!modal || !input) return;

  let activeZone = 'all';

  function openModal() {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    input.focus();
    renderResults();
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    input.value = '';
  }

  window.closeSearchModal = closeModal;

  triggerBtn?.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Hotkey Ctrl+K / Cmd+K / Esc
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openModal();
    } else if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeModal();
    }
  });

  // Zone Tabs
  zoneTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      zoneTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeZone = tab.dataset.zone;
      renderResults();
    });
  });

  // Input listener
  input.addEventListener('input', renderResults);

  function renderResults() {
    const q = input.value.toLowerCase().trim();
    let filtered = SEARCH_DATABASE.filter(item => {
      const matchZone = activeZone === 'all' || item.zone === activeZone;
      const matchQuery = !q || item.title.toLowerCase().includes(q) || item.sub.toLowerCase().includes(q);
      return matchZone && matchQuery;
    });

    if (!filtered.length) {
      resultsContainer.innerHTML = `<div style="padding:1.5rem;text-align:center;color:var(--clr-text-muted);font-size:0.85rem">Nenhum resultado encontrado para "${q}".</div>`;
      return;
    }

    resultsContainer.innerHTML = filtered.map(item => `
      <div class="search-result-item" tabindex="0" data-type="${item.type}">
        <div>
          <div class="result-item-title">${item.title}</div>
          <div style="font-size:0.72rem;color:var(--clr-text-muted);margin-top:2px">${item.sub}</div>
        </div>
        <span class="result-item-badge ${item.type}">${item.type === 'bestbet' ? 'BEST BET' : item.type.toUpperCase()}</span>
      </div>
    `).join('');

    // Click handlers
    resultsContainer.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.addEventListener('click', () => {
        const item = filtered[i];
        if (item.action) item.action();
        else if (item.url) window.open(item.url, '_blank');
        closeModal();
      });
    });
  }
}

function initFacetedNavigation() {
  // Facet chips for topic filtering
  const chips = document.querySelectorAll('.facet-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const topic = chip.dataset.facetTopic;

      if (topic === 'all') {
        document.querySelectorAll('.kpi-card').forEach(c => c.style.display = 'flex');
      } else {
        document.querySelectorAll('.kpi-card').forEach(c => {
          c.style.display = c.classList.contains(topic) ? 'flex' : 'none';
        });
        const tab = document.getElementById(`tab-${topic}`);
        if (tab) tab.click();
      }
    });
  });

  // Algorethics algorithm selector
  const algoSelect = document.getElementById('select-algo');
  algoSelect?.addEventListener('change', () => {
    loadNewsGrid();
  });
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

  // Init Phase 2 Features
  initEnterpriseSearch();
  initFacetedNavigation();

  // Auto refresh every 15 min
  setInterval(loadAll, CONFIG.REFRESH_INTERVAL_MS);

  // Initial load
  loadAll();
});
