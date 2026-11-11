/* Agent Insight 官网 · 公共脚本：导航 / 图库 / 灯箱放大 / 复制 / 过滤 / Markdown 加载 */
'use strict';
document.documentElement.classList.add('js');

window.SITE = {
  repo: 'https://atomgit.com/openeuler/agent-insight',
  releases: 'https://atomgit.com/openeuler/agent-insight/releases',
  issues: 'https://atomgit.com/openeuler/agent-insight/issues',
  pullRequests: 'https://atomgit.com/openeuler/agent-insight/pulls',
  npm: 'https://www.npmjs.com/package/agent-insight',
  docsEditBase: 'https://atomgit.com/openeuler/agent-insight/tree/master/docs/zh'
};

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)');

document.addEventListener('DOMContentLoaded', () => {
  initSiteLinks();
  initNav();
  initGalleries();
  initLightbox();
  initCopy();
  initFilter();
  initReveal();
  initMdPanels();
  initToTop();
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});

/* ---------- 回到顶部 ---------- */
function initToTop() {
  const b = document.querySelector('.to-top');
  if (!b) return;
  let t = false;
  const upd = () => { t = false; b.classList.toggle('show', scrollY > innerHeight * 1.5); };
  addEventListener('scroll', () => { if (!t) { t = true; requestAnimationFrame(upd); } }, { passive: true });
  b.addEventListener('click', () => window.scrollTo({ top: 0, behavior: REDUCED.matches ? 'auto' : 'smooth' }));
  upd();
}

/* ---------- 全站链接 ---------- */
function initSiteLinks() {
  document.querySelectorAll('[data-site]').forEach(el => {
    const u = SITE[el.dataset.site];
    if (u) el.href = u;
  });
}

/* ---------- 导航 ---------- */
function initNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  });
  const burger = document.querySelector('.nav-burger');
  if (!burger) return;
  const set = open => {
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('no-scroll', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  };
  burger.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
  document.querySelectorAll('.m-menu a').forEach(a => a.addEventListener('click', () => set(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  matchMedia('(min-width: 900px)').addEventListener('change', e => { if (e.matches) set(false); });
}

/* ---------- 图库：自动轮播（可见时播放；悬停、触摸、放大查看时暂停），舞台比例固定不跳动 ---------- */
let LB_OPEN = false;
function initGalleries() {
  document.querySelectorAll('[data-gallery]').forEach(root => {
    const tabs = [...root.querySelectorAll('.g-tab')];
    const panels = [...root.querySelectorAll('.g-panel')];
    const cap = root.querySelector('.g-cap');
    const barLabel = root.querySelector('.frame-bar span');
    if (!panels.length) return;
    const delay = +root.dataset.autoplay || 0;
    let i = 0, timer = null, remaining = delay, startedAt = 0;
    let visible = false, hover = false, hold = false, holdTimer = null;

    function show(n, focus, init) {
      i = (n + panels.length) % panels.length;
      panels.forEach((p, k) => {
        p.classList.toggle('is-active', k === i);
        p.setAttribute('aria-hidden', k === i ? 'false' : 'true');
        const v = p.querySelector('video');
        if (v) { if (k === i && !REDUCED.matches) v.play().catch(() => {}); else v.pause(); }
      });
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', k === i ? 'true' : 'false');
        t.tabIndex = k === i ? 0 : -1;
      });
      const p = panels[i];
      if (cap && p.dataset.cap) cap.innerHTML = p.dataset.cap;
      if (barLabel && p.dataset.title) barLabel.textContent = p.dataset.title;
      if (focus) tabs[i].focus({ preventScroll: true });
      const bar = tabs[i] && tabs[i].parentElement;   // 只在标签栏内部横向滚动，不带动整页
      if (bar && !init) bar.scrollTo({ left: tabs[i].offsetLeft - bar.clientWidth / 2 + tabs[i].offsetWidth / 2, behavior: 'smooth' });
      // 重置进度条与计时
      const prog = tabs[i] && tabs[i].querySelector('.g-prog');
      if (prog) { prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = ''; }
      clearTimeout(timer); timer = null; remaining = delay;
      evaluate();
    }
    function blocked() { return !delay || !visible || hover || hold || LB_OPEN || document.hidden || REDUCED.matches; }
    function evaluate() {
      if (!delay) return;
      if (blocked()) {
        if (timer) { clearTimeout(timer); timer = null; remaining = Math.max(300, remaining - (performance.now() - startedAt)); }
        root.classList.add('g-paused');
      } else if (!timer) {
        startedAt = performance.now();
        timer = setTimeout(() => { timer = null; show(i + 1); }, remaining);
        root.classList.remove('g-paused');
      }
    }
    if (delay) root.classList.add('g-playing', 'g-paused');

    tabs.forEach((t, k) => {
      t.addEventListener('click', () => show(k));
      t.addEventListener('keydown', e => {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1, true); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1, true); }
      });
    });
    root.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; evaluate(); } });
    root.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; evaluate(); } });
    root.addEventListener('touchstart', () => {
      hold = true; evaluate(); clearTimeout(holdTimer);
      holdTimer = setTimeout(() => { hold = false; evaluate(); }, 6000);
    }, { passive: true });
    document.addEventListener('visibilitychange', evaluate);
    document.addEventListener('lightbox', evaluate);
    if (delay && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; evaluate(); }), { threshold: .35 }).observe(root);
    }
    show(0, false, true);
  });
}

/* ---------- 灯箱：点击放大，再点看原图，可拖动/双指缩放 ---------- */
const ICON = {
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>'
};

function initLightbox() {
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', '图片查看');
  lb.innerHTML =
    '<div class="lb-top"><span class="lb-title"></span>' +
    '<button type="button" class="lb-btn lb-zoom">' + ICON.zoom + '<span>原图</span></button>' +
    '<button type="button" class="lb-btn lb-close" aria-label="关闭">' + ICON.close + '</button></div>' +
    '<div class="lb-body"><img alt=""></div>' +
    '<div class="lb-hint">点击图片可在“适应屏幕 / 原图大小”间切换，原图模式下可拖动查看细节</div>' +
    '<button type="button" class="lb-nav lb-prev" aria-label="上一张">' + ICON.prev + '</button>' +
    '<button type="button" class="lb-nav lb-next" aria-label="下一张">' + ICON.next + '</button>';
  document.body.appendChild(lb);
  const img = lb.querySelector('.lb-body img');
  const body = lb.querySelector('.lb-body');
  const title = lb.querySelector('.lb-title');
  const zoomBtn = lb.querySelector('.lb-zoom');
  const prev = lb.querySelector('.lb-prev'), next = lb.querySelector('.lb-next');
  let group = [], idx = 0, lastFocus = null;

  const srcOf = el => el.dataset.full || el.currentSrc || el.src;
  function render() {
    const el = group[idx];
    lb.classList.remove('zoomed');
    img.style.width = '';
    zoomBtn.querySelector('span').textContent = '原图';
    img.src = srcOf(el);
    img.alt = el.alt || '';
    title.textContent = (group.length > 1 ? (idx + 1) + ' / ' + group.length + ' · ' : '') + (el.alt || '');
    prev.hidden = next.hidden = group.length < 2;
  }
  function open(el) {
    const scope = el.closest('[data-gallery], .prose');
    group = scope ? [...scope.querySelectorAll(scope.matches('.prose') ? 'img' : '.g-panel img')] : [el];
    idx = Math.max(0, group.indexOf(el));
    lastFocus = document.activeElement;
    render();
    lb.classList.add('open');
    document.body.classList.add('no-scroll');
    LB_OPEN = true; document.dispatchEvent(new Event('lightbox'));
    lb.querySelector('.lb-close').focus();
  }
  function close() {
    lb.classList.remove('open', 'zoomed');
    img.style.width = '';
    LB_OPEN = false; document.dispatchEvent(new Event('lightbox'));
    if (!document.body.classList.contains('menu-open')) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus();
  }
  function toggleZoom(e) {
    const zoomed = !lb.classList.contains('zoomed');
    let rx = .5, ry = .5;
    if (e && e.target === img) {
      const r = img.getBoundingClientRect();
      rx = (e.clientX - r.left) / r.width; ry = (e.clientY - r.top) / r.height;
    }
    lb.classList.toggle('zoomed', zoomed);
    // 原图模式：桌面按原始像素；手机放大到约 2.5 倍屏宽，避免过度放大
    img.style.width = zoomed ? Math.min(img.naturalWidth || 2000, Math.max(innerWidth * 2.5, 1200)) + 'px' : '';
    zoomBtn.querySelector('span').textContent = zoomed ? '适应屏幕' : '原图';
    if (zoomed) requestAnimationFrame(() => {
      body.scrollLeft = img.offsetWidth * rx - body.clientWidth / 2;
      body.scrollTop = img.offsetHeight * ry - body.clientHeight / 2;
    });
  }
  const go = d => { idx = (idx + d + group.length) % group.length; render(); };

  img.addEventListener('click', toggleZoom);
  zoomBtn.addEventListener('click', () => toggleZoom());
  lb.querySelector('.lb-close').addEventListener('click', close);
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  body.addEventListener('click', e => { if (e.target === body && !lb.classList.contains('zoomed')) close(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft' && group.length > 1) go(-1);
    if (e.key === 'ArrowRight' && group.length > 1) go(1);
  });
  // 轻扫切换（仅适应屏幕模式）
  let sx = null;
  body.addEventListener('touchstart', e => { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  body.addEventListener('touchend', e => {
    if (sx === null || lb.classList.contains('zoomed') || group.length < 2) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    sx = null;
  });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.zoom-btn');
    if (btn) {
      const panel = btn.closest('.g-panel');
      const el = panel && panel.querySelector('img');
      if (el) { e.preventDefault(); open(el); }
      return;
    }
    const el = e.target.closest('.g-panel.is-active img, .prose img');
    if (el && !el.closest('a')) { e.preventDefault(); open(el); }
  });
}

/* ---------- 复制 ---------- */
function copyText(text, btn) {
  const done = () => {
    const label = btn.querySelector('span') || btn;
    const old = label.textContent;
    label.textContent = '已复制';
    setTimeout(() => { label.textContent = old; }, 1500);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text) && done());
  } else if (fallbackCopy(text)) done();
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
  ta.remove(); return ok;
}
function initCopy() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.copy, btn));
  });
}

/* ---------- 集成平台过滤 ---------- */
function initFilter() {
  const input = document.getElementById('intgFilter');
  if (!input) return;
  const groups = [...document.querySelectorAll('#intgList .igroup')];
  const none = document.querySelector('#intgList .intg-none');
  groups.forEach(g => g.querySelectorAll('.chip').forEach(c => c.dataset.label = c.textContent));
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let total = 0;
    groups.forEach(g => {
      const groupHit = q && g.querySelector('h4').textContent.toLowerCase().includes(q);
      let n = 0;
      g.querySelectorAll('.chip').forEach(c => {
        const label = c.dataset.label;
        const pos = label.toLowerCase().indexOf(q);
        const hit = !q || groupHit || pos >= 0;
        c.hidden = !hit;
        c.innerHTML = q && pos >= 0 ? esc(label.slice(0, pos)) + '<mark>' + esc(label.slice(pos, pos + q.length)) + '</mark>' + esc(label.slice(pos + q.length)) : esc(label);
        if (hit) n++;
      });
      g.hidden = n === 0;
      total += n;
    });
    if (none) none.hidden = total > 0;
  });
}
function esc(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

/* ---------- 进场动画 ---------- */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (REDUCED.matches || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .08, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
  setTimeout(() => els.forEach(el => el.classList.add('in')), 2000);
}

/* ---------- Markdown（文档页使用） ---------- */
function mdReady() {
  if (window.marked) { marked.setOptions({ gfm: true, breaks: false }); return Promise.resolve(); }
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'assets/vendor/marked.min.js';
    s.onload = () => { marked.setOptions({ gfm: true, breaks: false }); res(); };
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

/* 去掉 YAML frontmatter；把相对 md 链接映射到文档路由 */
function preprocessMd(md, currentFile) {
  let text = md.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
  const map = window.DOC_FILE_MAP || {};
  text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (m, label, href) => {
    if (/^(https?:|#|mailto:)/.test(href)) return m;
    if (!href.endsWith('.md') && !href.includes('.md#')) return m;
    const [path, anchor] = href.split('#');
    let resolved = path;
    if (path.startsWith('./') || path.startsWith('../')) {
      const base = currentFile.split('/').slice(0, -1);
      for (const seg of path.split('/')) {
        if (seg === '.') continue;
        else if (seg === '..') base.pop();
        else base.push(seg);
      }
      resolved = base.join('/');
    }
    const id = map[resolved];
    if (id) return '[' + label + '](docs.html#/' + id + (anchor ? '#' + anchor : '') + ')';
    return m;
  });
  return text;
}

function enhanceMd(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.querySelector('.copy')) return;
    const code = pre.querySelector('code');
    const lang = code && (code.className.match(/language-(\S+)/) || [])[1];
    if (lang) {
      const l = document.createElement('span');
      l.className = 'lang'; l.textContent = lang;
      pre.appendChild(l);
    }
    const btn = document.createElement('button');
    btn.className = 'copy'; btn.type = 'button'; btn.textContent = '复制';
    btn.addEventListener('click', () => copyText(code ? code.textContent : pre.textContent, btn));
    pre.appendChild(btn);
  });
  container.querySelectorAll('img').forEach(im => { im.loading = 'lazy'; im.removeAttribute('style'); });
}

function mdErrorBox(url) {
  return '<div class="md-error"><b>文档加载失败</b>：无法读取 <code>' + url + '</code>。<br>' +
    '本站内容由 Markdown 文件驱动，需要通过 HTTP 访问。请在站点根目录运行 <code>serve.bat</code>（或 <code>python -m http.server 8000</code>）后访问 <code>http://localhost:8000</code>，不要直接双击 HTML 文件。</div>';
}

async function loadMd(url, target, currentFile) {
  const box = typeof target === 'string' ? document.querySelector(target) : target;
  if (!box) return;
  box.innerHTML = '<div class="md-loading">加载中 …</div>';
  try {
    await mdReady();
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.text();
    box.innerHTML = '<div class="prose">' + marked.parse(preprocessMd(raw, currentFile || url)) + '</div>';
    enhanceMd(box);
  } catch (err) {
    console.error('[md]', url, err);
    box.innerHTML = mdErrorBox(url);
  }
}

function initMdPanels() {
  document.querySelectorAll('[data-md]').forEach(el => loadMd(el.dataset.md, el));
}
