/* Agent Insight portal — shared runtime: nav / copy keys / switcher / filter / md loader */
'use strict';
document.documentElement.classList.add('js');

window.SITE = {
  repo: 'https://atomgit.com/openeuler/agent-insight',
  releases: 'https://atomgit.com/openeuler/agent-insight/releases',
  issues: 'https://atomgit.com/openeuler/agent-insight/issues',
  pullRequests: 'https://atomgit.com/openeuler/agent-insight/pulls',
  discussions: 'https://atomgit.com/openeuler/agent-insight/discussions',
  docsEditBase: 'https://atomgit.com/openeuler/agent-insight/tree/master/docs/zh'
};

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initRotator();
  initShots();
  initMinis();
  initSiteLinks();
  initCopy();
  initSwitcher();
  initFilter();
  initReveal();
  initMdPanels();
  initCounters();
});

/* 数字滚动(仅真实给出的数字) */
function initCounters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const el = e.target, target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.textContent = target + suffix; return;
      }
      const t0 = performance.now(), dur = 1100;
      (function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }, { threshold: .5 });
  els.forEach(el => io.observe(el));
}

/* 轮播:悬停/聚焦暂停,圆点可切,减弱运动静态 */
function initRotator() {
  const root = document.querySelector('[data-rotator]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.rotator-slide')];
  const dots = [...root.querySelectorAll('.rotator-dots button')];
  const cap = document.querySelector('.rotator-cap span');
  const caps = JSON.parse(root.dataset.caps || '[]');
  if (slides.length < 2) return;
  let i = 0, timer = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((sl, k) => sl.classList.toggle('is-active', k === i));
    dots.forEach((d, k) => d.setAttribute('aria-selected', k === i ? 'true' : 'false'));
    if (cap && caps[i]) cap.textContent = caps[i];
  }
  function play() { if (!timer && !reduced.matches) timer = setInterval(() => show(i + 1), 4000); }
  function pause() { clearInterval(timer); timer = null; }
  dots.forEach((d, k) => d.addEventListener('click', () => { pause(); show(k); play(); }));
  root.addEventListener('pointerenter', pause);
  root.addEventListener('pointerleave', play);
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', play);
  reduced.addEventListener('change', () => reduced.matches ? pause() : play());
  show(0); play();
}

/* 真实图轮播:分段进度条,悬停暂停,圆点可切 */
function initShots() {
  const root = document.querySelector('[data-shots]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.shots-slide')];
  const bars = [...root.querySelectorAll('.shots-bars button')];
  const cap = root.querySelector('.shots-cap');
  const caps = JSON.parse(root.dataset.caps || '[]');
  if (slides.length < 2) return;
  let i = 0, timer = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function fill(k) {
    bars.forEach((b, idx) => {
      b.classList.toggle('is-active', idx === k);
      b.setAttribute('aria-selected', idx === k ? 'true' : 'false');
      if (idx === k) { const inner = b.querySelector('i'); inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''; }
    });
  }
  function show(n) {
    i = (n + slides.length) % slides.length;
    slides.forEach((sl, k) => sl.classList.toggle('is-active', k === i));
    fill(i);
    if (cap && caps[i]) cap.textContent = caps[i];
  }
  function play() { if (!timer && !reduced.matches) timer = setInterval(() => show(i + 1), 4000); }
  function pause() { clearInterval(timer); timer = null; }
  bars.forEach((b, k) => b.addEventListener('click', () => { pause(); show(k); play(); }));
  root.addEventListener('pointerenter', () => { root.classList.add('paused'); pause(); });
  root.addEventListener('pointerleave', () => { root.classList.remove('paused'); play(); });
  root.addEventListener('focusin', () => { root.classList.add('paused'); pause(); });
  root.addEventListener('focusout', () => { root.classList.remove('paused'); play(); });
  reduced.addEventListener('change', () => reduced.matches ? pause() : play());
  show(0); play();
}

/* 板块迷你轮播:双图淡入轮换 + 分段进度条(播放高亮,播完复位,可点击) */
function initMinis() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-mini]').forEach(root => {
    const slides = [...root.querySelectorAll('.mini-slide')];
    if (slides.length < 2) return;
    // 生成进度条
    const bars = document.createElement('div');
    bars.className = 'mini-bars';
    bars.setAttribute('role', 'group');
    bars.setAttribute('aria-label', '切换图片');
    const btns = slides.map((_, k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<i></i>';
      b.setAttribute('aria-label', '第 ' + (k + 1) + ' 张');
      bars.appendChild(b);
      return b;
    });
    root.after(bars);
    let i = 0, timer = null;
    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((sl, k) => {
        sl.classList.toggle('is-active', k === i);
        sl.setAttribute('aria-hidden', k === i ? 'false' : 'true');
      });
      // 播放时当前段高亮;其余段恢复默认色
      btns.forEach((b, k) => {
        b.classList.toggle('is-active', k === i);
        b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        if (k === i) { const inner = b.querySelector('i'); inner.style.animation = 'none'; void inner.offsetWidth; inner.style.animation = ''; }
      });
    }
    function play() { if (!timer && !reduced.matches) timer = setInterval(() => show(i + 1), 4000); }
    function pause() { clearInterval(timer); timer = null; }
    btns.forEach((b, k) => b.addEventListener('click', () => { pause(); show(k); play(); }));
    root.addEventListener('pointerenter', () => { root.classList.add('paused'); pause(); });
    root.addEventListener('pointerleave', () => { root.classList.remove('paused'); play(); });
    root.addEventListener('focusin', () => { root.classList.add('paused'); pause(); });
    root.addEventListener('focusout', () => { root.classList.remove('paused'); play(); });
    reduced.addEventListener('change', () => reduced.matches ? pause() : play());
    show(0); play();
  });
}

function initNav() {
  const b = document.querySelector('.nav-burger');
  if (b) b.addEventListener('click', () => document.body.classList.toggle('menu-open'));
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
  });
}

function initSiteLinks() {
  document.querySelectorAll('[data-site]').forEach(el => {
    const u = SITE[el.dataset.site];
    if (u) el.href = u;
    if (el.dataset.label && u) el.textContent = u.replace('https://', '');
  });
}

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const old = btn.textContent;
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = old; }, 1500);
  });
}

function initCopy() {
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', () => copyText(btn.dataset.copy, btn));
  });
}

/* ---- switcher(安装页 tab) ---- */
function initSwitcher() {
  document.querySelectorAll('[data-switch]').forEach(root => {
    const tabs = [...root.querySelectorAll('[role="tab"]')];
    const panels = [...root.querySelectorAll('[role="tabpanel"]')];
    if (!tabs.length) return;
    function select(tab, focus) {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(p => p.hidden = p.id !== tab.getAttribute('aria-controls'));
      const panel = panels.find(p => p.id === tab.getAttribute('aria-controls'));
      if (panel && !panel.dataset.loaded) {
        panel.dataset.loaded = '1';
        const holder = panel.querySelector('[data-md]');
        if (holder && holder.dataset.md) loadMd(holder.dataset.md, holder);
      }
      history.replaceState(null, '', '#' + tab.getAttribute('aria-controls'));
      if (focus) tab.focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        let n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
    const initial = (location.hash || '').replace('#', '');
    const tab = tabs.find(t => t.getAttribute('aria-controls') === initial) || tabs[0];
    select(tab);
  });
}

/* ---- 集成过滤 ---- */
function initFilter() {
  const input = document.getElementById('intgFilter');
  if (!input) return;
  const items = [...document.querySelectorAll('#intgList .it')];
  const none = document.querySelector('#intgList .none');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let n = 0;
    items.forEach(it => {
      const hit = it.textContent.toLowerCase().includes(q);
      it.hidden = !hit;
      if (hit) n++;
    });
    if (none) none.hidden = n > 0;
  });
}

/* ---- one reveal ---- */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(el => el.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .08 });
  els.forEach(el => io.observe(el));
  // 安全兜底:1.4s 后全部显示,截图/无滚动场景不留隐藏内容
  setTimeout(() => els.forEach(el => el.classList.add('in')), 1400);
}

/* ---- markdown ---- */
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

/* 去掉 YAML frontmatter;把相对 md 链接映射到 docs 路由 */
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
    const code = pre.querySelector('code');
    let lang = '';
    if (code && code.className) lang = (code.className.match(/language-(\S+)/) || [])[1] || '';
    if (lang) {
      const l = document.createElement('span');
      l.className = 'lang'; l.textContent = lang;
      pre.appendChild(l);
    }
    const btn = document.createElement('button');
    btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'copy';
    btn.addEventListener('click', () => copyText(code ? code.textContent : pre.textContent, btn));
    pre.appendChild(btn);
  });
}

function mdErrorBox(url) {
  return '<div class="md-error"><b>文档加载失败</b>:无法读取 <code>' + url + '</code>。<br>' +
    '本站内容由 Markdown 文件驱动,需要通过 HTTP 访问。请在站点根目录运行 <code>serve.bat</code>(或 <code>python -m http.server 8000</code>)后访问 <code>http://localhost:8000</code>,而不是直接双击 HTML 文件。</div>';
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
    const html = '<div class="prose">' + marked.parse(preprocessMd(raw, currentFile || url)) + '</div>';
    box.innerHTML = html;
    enhanceMd(box);
  } catch (err) {
    console.error('[md]', url, err);
    box.innerHTML = mdErrorBox(url);
  }
}

function initMdPanels() {
  document.querySelectorAll('[data-md]').forEach(el => {
    if (el.closest('[role="tabpanel"]')) return;   // 面板由 switcher 惰性加载
    loadMd(el.dataset.md, el);
  });
}
