/* ============================================================
   AGENT INSIGHT PORTAL — shared runtime
   站点配置 / 导航 / 动效 / Markdown 加载渲染 / Tabs
   ============================================================ */
'use strict';

/* ---------- 全局站点配置（改这里即可全站生效） ---------- */
window.SITE = {
  name: 'Agent Insight',
  repo: 'https://atomgit.com/openeuler/agent-insight',          // AtomGit 官方代码仓
  releases: 'https://atomgit.com/openeuler/agent-insight/releases', // 发行版
  issues: 'https://atomgit.com/openeuler/agent-insight/issues',
  pullRequests: 'https://atomgit.com/openeuler/agent-insight/pulls',
  discussions: 'https://atomgit.com/openeuler/agent-insight/discussions',
  license: 'Apache-2.0',
  docsEditBase: 'https://atomgit.com/openeuler/agent-insight/tree/master/docs'
};

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initReticle();
  initTicker();
  initCounters();
  initLongmap();
  initTabs();
  initMatrixFilter();
  initSiteLinks();
  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
});

/* ---------- 导航 ---------- */
function initNav() {
  const burger = document.querySelector('.nav-burger');
  if (burger) burger.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-links a[data-nav]').forEach(a => {
    if (a.dataset.nav === page) a.classList.add('active');
  });
}

/* ---------- 滚动显现 ---------- */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const d = +e.target.dataset.d || 0;
        setTimeout(() => e.target.classList.add('in'), d * 90);
        io.unobserve(e.target);
      }
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => io.observe(el));
}

/* ---------- hero 视场标线 ---------- */
function initReticle() {
  const wrap = document.querySelector('.hero-visual');
  if (!wrap) return;
  const x = wrap.querySelector('.ret-x'), y = wrap.querySelector('.ret-y');
  const ring = wrap.querySelector('.ret-ring'), read = wrap.querySelector('.ret-read');
  if (!x || !y) return;
  wrap.addEventListener('mousemove', e => {
    const r = wrap.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    x.style.top = py + 'px'; y.style.left = px + 'px';
    if (ring) { ring.style.top = py + 'px'; ring.style.left = px + 'px'; }
    if (read) {
      read.style.top = Math.min(py + 26, r.height - 30) + 'px';
      read.style.left = Math.min(px + 24, r.width - 150) + 'px';
      read.textContent = 'X:' + String(Math.round(px)).padStart(4, '0') +
        ' Y:' + String(Math.round(py)).padStart(4, '0') +
        ' · TRACE LOCK ●';
    }
  });
  wrap.addEventListener('mouseleave', () => {
    x.style.top = '40%'; y.style.left = '60%';
    if (ring) { ring.style.top = '40%'; ring.style.left = '60%'; }
    if (read) { read.style.top = 'calc(40% + 30px)'; read.style.left = 'calc(60% + 26px)'; read.textContent = 'X:0000 Y:0000 · SECTOR —'; }
  });
}

/* ---------- 跑马灯（复制一份实现无缝滚动） ---------- */
function initTicker() {
  const t = document.getElementById('ticker');
  if (!t) return;
  t.innerHTML += t.innerHTML;
}

/* ---------- 数字滚动 ---------- */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const t0 = performance.now(), dur = 1400;
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target % 1 ? (target * eased).toFixed(1) : Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: .5 });
  els.forEach(el => io.observe(el));
}

/* ---------- 首页长图：随滚动展开 ---------- */
function initLongmap() {
  const frame = document.querySelector('.longmap-frame');
  const img = document.querySelector('.longmap-frame img');
  const bar = document.querySelector('.longmap-progress .bar i');
  const pct = document.getElementById('longmapPct');
  if (!frame || !img) return;
  let raf = null;
  function update() {
    raf = null;
    const r = frame.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 = 帧进入视口底部, 1 = 帧顶部到达 nav 附近
    const total = r.height + vh * .6;
    const p = Math.min(Math.max((vh * .92 - r.top) / total, 0), 1);
    img.style.transform = 'scale(' + (1.06 - .06 * p) + ')';
    if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    if (pct) pct.textContent = 'REVEAL ' + String(Math.round(p * 100)).padStart(3, '0') + '%';
  }
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ---------- Markdown 渲染 ---------- */
function mdReady() {
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
    return Promise.resolve();
  }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'assets/vendor/marked.min.js';
    s.onload = () => { marked.setOptions({ gfm: true, breaks: false }); res(); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

/* 渲染增强：代码块语言标识 + 复制按钮 + 标题锚点 */
function enhanceMd(container) {
  container.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    let lang = '';
    if (code && code.className) lang = (code.className.match(/language-(\S+)/) || [])[1] || '';
    if (lang) {
      const l = document.createElement('span');
      l.className = 'lang'; l.textContent = lang;
      pre.appendChild(l);
    }
    const btn = document.createElement('button');
    btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'COPY';
    btn.addEventListener('click', () => {
      const text = code ? code.textContent : pre.textContent;
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'COPIED ✓';
        setTimeout(() => btn.textContent = 'COPY', 1600);
      });
    });
    pre.appendChild(btn);
  });
  container.querySelectorAll('h2, h3').forEach(h => {
    if (!h.id) {
      h.id = h.textContent.trim().toLowerCase()
        .replace(/[`*]/g, '').replace(/[^\w一-龥]+/g, '-').replace(/^-+|-+$/g, '') || 'sec';
    }
    const a = document.createElement('a');
    a.className = 'heading-anchor'; a.href = '#' + h.id;
    a.textContent = '#'; a.setAttribute('aria-label', '锚点链接');
    // 用 replaceState 代替默认跳转,避免触发 hashchange 干扰 docs 路由 / tabs
    a.addEventListener('click', e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', location.pathname + location.search + '#' + h.id);
    });
    h.appendChild(a);
  });
}

function mdErrorBox(url) {
  return '<div class="md-error"><b>文档加载失败</b> — 无法读取 <code>' + url + '</code><br>' +
    '本站点的安装步骤与文档由 Markdown 文件驱动，需要通过 HTTP 访问（浏览器直接双击打开 file:// 文件时会被拦截）。<br>' +
    '请在站点根目录运行 <code>serve.bat</code>（或 <code>python -m http.server 8000</code>）后，访问 <code>http://localhost:8000</code>。</div>';
}

async function loadMd(url, target) {
  const box = typeof target === 'string' ? document.querySelector(target) : target;
  if (!box) return;
  box.innerHTML = '<div class="dr-empty" style="padding:48px 0">LOADING DOCUMENT …</div>';
  try {
    await mdReady();
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    box.innerHTML = '<div class="md-content">' + marked.parse(text) + '</div>';
    enhanceMd(box);
  } catch (err) {
    console.error('[md]', url, err);
    box.innerHTML = mdErrorBox(url);
  }
}

/* ---------- Tabs（安装页平台切换） ---------- */
function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(root => {
    const tabs = [...root.querySelectorAll('.tab')];
    const panels = [...root.querySelectorAll('.tab-panel')];
    if (!tabs.length) return;
    function activate(key, pushHash) {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === key));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === key));
      const panel = panels.find(p => p.dataset.panel === key);
      if (panel && !panel.dataset.loaded) {
        panel.dataset.loaded = '1';
        const holder = panel.querySelector('[data-md]');
        if (holder && holder.dataset.md) loadMd(holder.dataset.md, holder);
      }
      if (pushHash !== false) history.replaceState(null, '', '#' + key);
    }
    tabs.forEach(t => t.addEventListener('click', () => activate(t.dataset.tab)));
    const initial = (location.hash || '').replace('#', '') || tabs[0].dataset.tab;
    activate(tabs.some(t => t.dataset.tab === initial) ? initial : tabs[0].dataset.tab, false);
  });
}

/* ---------- 集成矩阵过滤 ---------- */
function initMatrixFilter() {
  const input = document.getElementById('matrixFilter');
  if (!input) return;
  const rows = [...document.querySelectorAll('.matrix-row')];
  const empty = document.querySelector('.matrix-empty');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    rows.forEach(r => {
      const hit = r.textContent.toLowerCase().includes(q);
      r.style.display = hit ? '' : 'none';
      if (hit) n++;
    });
    if (empty) empty.style.display = n ? 'none' : '';
  });
}

/* ---------- 站点链接（凡带 data-site 的元素自动补 href） ---------- */
function initSiteLinks() {
  document.querySelectorAll('[data-site]').forEach(el => {
    const key = el.dataset.site;
    if (SITE[key]) el.href = SITE[key];
    if (el.dataset.label && SITE[key]) el.textContent = SITE[key].replace('https://', '');
  });
}
