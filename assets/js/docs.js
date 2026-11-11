/* Agent Insight 文档中心：首页 / 目录树 / 路由 / 文章渲染 / 本页目录 / 全文搜索 */
'use strict';

const GROUP_META = {
  '入门教程': { icon: '<path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h6"/>', desc: '从零开始，跑通第一条链路与第一次评测', cls: 'c-blue' },
  '操作指南': { icon: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>', desc: '按任务完成部署、接入、评测、诊断与优化', cls: 'c-teal' },
  '参考文档': { icon: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', desc: '接口、配置、协议与故障目录的精确说明', cls: 'c-violet' },
  '概念与原理': { icon: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>', desc: '理解平台架构、核心概念与设计原理', cls: 'c-amber' }
};
const START_IDS = [
  ['quick-start', '入门教程', '注册模型、创建 Agent、完成接入，看到第一条链路'],
  ['product-overview', '产品概览', '五大能力模块与整体工作流'],
  ['core-concepts', '核心概念', 'Agent、Trace、Skill、Evaluator 等术语'],
  ['faq', '常见问题', '安装、接入与数据上报的排查方法']
];
const CALLOUT = {
  note: ['说明', 'note'], info: ['说明', 'note'], tip: ['提示', 'tip'], important: ['重要', 'important'],
  warning: ['警告', 'warning'], caution: ['注意', 'warning'], danger: ['危险', 'danger']
};
const ICO_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const escH = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const Docs = {
  groups: [], flat: [], byId: new Map(), raw: new Map(), index: null, indexing: null,
  current: null,

  async init() {
    this.main = document.getElementById('docMain');
    this.toc = document.getElementById('docToc');
    try {
      const res = await fetch('content/docs/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.groups = await res.json();
    } catch (e) {
      this.main.innerHTML = '<div class="md-error"><b>文档清单加载失败</b>：无法读取 <code>content/docs/manifest.json</code>。请通过本地服务访问本站（运行 <code>serve.bat</code> 或 <code>python -m http.server 8000</code>）。</div>';
      return;
    }
    this.groups.forEach(g => g.items.forEach(it => { it.group = g.group; this.flat.push(it); this.byId.set(it.id, it); }));
    window.DOC_FILE_MAP = {};
    this.flat.forEach(it => { window.DOC_FILE_MAP[it.file] = it.id; });
    this.buildTree();
    this.initDrawer();
    this.initSearch();
    addEventListener('hashchange', () => this.route());
    this.route();
  },

  /* ---------------- 路由：#/id 或 #/id#anchor，空为文档首页 ---------------- */
  parseHash() {
    const m = location.hash.match(/^#\/?([^#]*)(?:#(.*))?$/);
    if (!m) return { id: '', anchor: '' };
    return { id: decodeURIComponent(m[1] || ''), anchor: m[2] ? decodeURIComponent(m[2]) : '' };
  },
  route() {
    this.closeDrawer();
    const { id, anchor } = this.parseHash();
    if (!id) { this.current = null; this.renderHome(); return; }
    const item = this.byId.get(id);
    if (!item) { this.current = null; this.renderNotFound(id); return; }
    if (this.current === item.id) { this.scrollToAnchor(anchor); return; }
    this.current = item.id;
    this.renderDoc(item, anchor);
  },
  scrollToAnchor(anchor, instant) {
    if (!anchor) { window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' }); return; }
    const el = document.getElementById(anchor) || document.getElementById(anchor.toLowerCase());
    if (el) el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
  },

  /* ---------------- 目录树 ---------------- */
  buildTree() {
    const tree = document.getElementById('docTree');
    tree.innerHTML = this.groups.map((g, gi) => {
      const meta = GROUP_META[g.group] || {};
      return '<div class="tgroup" data-g="' + gi + '">' +
        '<button type="button" class="tg-btn" aria-expanded="false">' +
        '<span class="tg-ico ' + (meta.cls || '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (meta.icon || '') + '</svg></span>' +
        '<span class="tg-name">' + escH(g.group) + '</span><span class="tg-cnt">' + g.items.length + '</span>' +
        '<svg class="tg-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>' +
        '<div class="titems">' + g.items.map(it => '<a class="titem" href="#/' + encodeURIComponent(it.id) + '" data-id="' + escH(it.id) + '">' + escH(it.title) + this.dupHint(it) + '</a>').join('') + '</div></div>';
    }).join('');
    tree.querySelectorAll('.tg-btn').forEach(b => b.addEventListener('click', () => {
      const g = b.parentElement;
      const open = !g.classList.contains('open');
      g.classList.toggle('open', open);
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    }));
  },
  // 同名文档（如两个“快速开始”）补充所属模块，避免混淆
  dupHint(it) {
    const same = this.flat.filter(x => x.title === it.title);
    if (same.length < 2) return '';
    const seg = it.file.split('/');
    const mod = { 'agent-ras': 'Agent RAS', 'agent-fault-injection': '故障注入' }[seg[seg.length - 2]] || seg[seg.length - 2];
    return ' <small>· ' + escH(mod) + '</small>';
  },
  label(it) { return it.title + this.dupHint(it).replace(/<[^>]+>/g, ''); },
  markActive(id) {
    document.querySelectorAll('.titem').forEach(a => {
      const on = a.dataset.id === id;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const active = document.querySelector('.titem.active');
    document.querySelectorAll('.tgroup').forEach((g, gi) => {
      const open = active ? g.contains(active) : gi === 0;
      if (open) { g.classList.add('open'); g.querySelector('.tg-btn').setAttribute('aria-expanded', 'true'); }
    });
    if (active) {
      const side = document.getElementById('docsSide');
      const r = active.getBoundingClientRect(), sr = side.getBoundingClientRect();
      if (r.top < sr.top + 80 || r.bottom > sr.bottom - 20) side.scrollTop += r.top - sr.top - sr.height / 3;
    }
    document.querySelector('.docs-home-link').classList.toggle('active', !id);
  },

  /* ---------------- 文档首页 ---------------- */
  renderHome() {
    document.title = '文档 · Agent Insight';
    this.setBar('文档首页');
    this.markActive(null);
    this.toc.innerHTML = '';
    document.body.classList.add('docs-is-home');
    const start = START_IDS.filter(([id]) => this.byId.has(id)).map(([id, k, d]) => {
      const it = this.byId.get(id);
      return '<a class="dh-start" href="#/' + id + '"><span class="k">' + k + '</span><b>' + escH(it.title) + '</b><span class="d">' + d + '</span><span class="go">阅读 →</span></a>';
    }).join('');
    const groups = this.groups.map(g => {
      const meta = GROUP_META[g.group] || {};
      const items = g.items.map((it, k) => '<li' + (k >= 6 ? ' class="more" hidden' : '') + '><a href="#/' + encodeURIComponent(it.id) + '">' + escH(it.title) + this.dupHint(it) + '</a></li>').join('');
      return '<section class="dh-group">' +
        '<div class="dh-gh"><span class="tg-ico ' + (meta.cls || '') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (meta.icon || '') + '</svg></span>' +
        '<div><h2>' + escH(g.group) + ' <small>' + escH(g.groupEn || '') + '</small></h2><p>' + escH(meta.desc || '') + '</p></div><span class="tg-cnt">' + g.items.length + ' 篇</span></div>' +
        '<ul>' + items + '</ul>' +
        (g.items.length > 6 ? '<button type="button" class="dh-more">展开全部 ' + g.items.length + ' 篇</button>' : '') +
        '</section>';
    }).join('');
    this.main.innerHTML =
      '<div class="dh-hero">' +
        '<span class="eyebrow">文档中心</span>' +
        '<h1>Agent Insight 文档</h1>' +
        '<p>' + this.flat.length + ' 篇中文文档，随 AtomGit 仓库 docs/zh 同步：从安装接入到评测、诊断与优化。</p>' +
        '<button type="button" class="dh-search" data-open-search>' + ICO_SEARCH + '<span>搜索文档标题与正文…</span><kbd>/</kbd></button>' +
      '</div>' +
      '<h2 class="dh-title">从这里开始</h2><div class="dh-starts">' + start + '</div>' +
      '<h2 class="dh-title">按类型浏览</h2><div class="dh-groups">' + groups + '</div>';
    this.main.querySelectorAll('.dh-more').forEach(b => b.addEventListener('click', () => {
      const ul = b.previousElementSibling;
      const open = b.dataset.open !== '1';
      ul.querySelectorAll('.more').forEach(li => { li.hidden = !open; });
      b.dataset.open = open ? '1' : '';
      b.textContent = open ? '收起' : '展开全部 ' + ul.children.length + ' 篇';
    }));
    window.scrollTo(0, 0);
  },
  renderNotFound(id) {
    this.setBar('未找到文档');
    this.markActive(null);
    this.toc.innerHTML = '';
    document.body.classList.remove('docs-is-home');
    this.main.innerHTML = '<div class="doc-404"><h1>没有找到这篇文档</h1><p>链接 <code>' + escH(id) + '</code> 可能已调整或下线。</p><p><a class="btn btn-primary" href="#/">返回文档首页</a> <button type="button" class="btn btn-ghost" data-open-search>搜索文档</button></p></div>';
  },
  setBar(t) { const el = document.getElementById('docBarTitle'); if (el) el.textContent = t; },

  /* ---------------- 文章 ---------------- */
  async fetchRaw(item) {
    if (this.raw.has(item.id)) return this.raw.get(item.id);
    const res = await fetch('content/docs/' + item.file, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const t = await res.text();
    this.raw.set(item.id, t);
    return t;
  },
  frontmatter(raw) {
    const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    const fm = {};
    if (m) m[1].split('\n').forEach(line => {
      const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
      if (kv) fm[kv[1]] = kv[2];
    });
    return fm;
  },
  async renderDoc(item, anchor) {
    document.body.classList.remove('docs-is-home');
    this.markActive(item.id);
    this.setBar(item.title);
    document.title = item.title + ' · Agent Insight 文档';
    this.main.innerHTML = '<div class="md-loading"><span class="spin"></span>加载中…</div>';
    this.toc.innerHTML = '';
    let raw;
    try { await mdReady(); raw = await this.fetchRaw(item); }
    catch (e) { console.error('[docs]', item.file, e); this.main.innerHTML = mdErrorBox('content/docs/' + item.file); return; }
    if (this.current !== item.id) return;   // 期间又切换了文档
    const fm = this.frontmatter(raw);
    const html = marked.parse(preprocessMd(raw, item.file));
    const plain = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<[^>]+>/g, '');
    const minutes = Math.max(1, Math.round(plain.replace(/\s+/g, '').length / 450));
    const idx = this.flat.indexOf(item);
    const prev = this.flat[idx - 1], next = this.flat[idx + 1];
    const editUrl = SITE.docsEditBase + '/' + item.file;
    const title = fm.title || item.title;

    this.main.innerHTML =
      '<nav class="doc-crumb" aria-label="面包屑"><a href="#/">文档</a><span>/</span><span>' + escH(item.group) + '</span></nav>' +
      '<header class="doc-head"><h1>' + escH(title) + '</h1>' +
      (fm.description ? '<p class="doc-desc">' + escH(fm.description) + '</p>' : '') +
      '<div class="doc-meta"><span>约 ' + minutes + ' 分钟阅读</span>' +
      '<a href="' + editUrl + '" target="_blank" rel="noopener">在 AtomGit 上编辑</a>' +
      '<a href="' + SITE.issues + '" target="_blank" rel="noopener">反馈问题</a></div></header>' +
      '<details class="toc-inline" hidden><summary>本页目录</summary><nav></nav></details>' +
      '<div class="prose" id="docProse">' + html + '</div>' +
      '<nav class="doc-pager" aria-label="上一篇与下一篇">' +
        (prev ? '<a class="pg prev" href="#/' + encodeURIComponent(prev.id) + '"><span class="k">← 上一篇</span><span class="t">' + escH(this.label(prev)) + '</span></a>' : '<span></span>') +
        (next ? '<a class="pg next" href="#/' + encodeURIComponent(next.id) + '"><span class="k">下一篇 →</span><span class="t">' + escH(this.label(next)) + '</span></a>' : '<span></span>') +
      '</nav>' +
      '<p class="doc-note">本页内容由 <code>content/docs/' + escH(item.file) + '</code> 驱动，随 AtomGit 仓库文档同步。发现错误？欢迎 <a href="' + SITE.issues + '" target="_blank" rel="noopener">提 Issue</a> 或 <a href="' + editUrl + '" target="_blank" rel="noopener">直接编辑</a>。</p>';

    const prose = document.getElementById('docProse');
    this.polish(prose, item, title);
    enhanceMd(prose);
    this.buildToc(prose, item);
    requestAnimationFrame(() => this.scrollToAnchor(anchor, true));
    // 图片陆续加载会推动版面：短时间内保持锚点位置，用户主动滚动后不再干预
    if (anchor) {
      const until = performance.now() + 3000;
      let user = false;
      const stop = () => { user = true; };
      addEventListener('wheel', stop, { once: true, passive: true });
      addEventListener('touchmove', stop, { once: true, passive: true });
      addEventListener('keydown', stop, { once: true });
      prose.querySelectorAll('img').forEach(im => im.addEventListener('load', () => {
        if (!user && performance.now() < until && this.current === item.id) this.scrollToAnchor(anchor, true);
      }));
    }
  },

  /* 渲染后整理：去掉重复标题、标题锚点、提示块、表格横滚、外链新窗口 */
  polish(prose, item, title) {
    // 只含锚点的空段落 → 拆出锚点，避免多余空白
    prose.querySelectorAll('p').forEach(p => {
      if (!p.textContent.trim() && p.querySelector('a[id]') && !p.querySelector('img')) p.replaceWith(...p.childNodes);
    });
    const first = prose.querySelector('h1');
    if (first && first.textContent.trim().replace(/\s/g, '') === title.replace(/\s/g, '')) first.remove();
    prose.querySelectorAll('h1').forEach(h => { const h2 = document.createElement('h2'); h2.innerHTML = h.innerHTML; h.replaceWith(h2); });

    const used = new Set();
    prose.querySelectorAll('h2, h3, h4').forEach(h => {
      let slug = h.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-') || 'section';
      let s = slug, n = 1;
      const src = document.getElementById(s);   // 源文档里的 <a id> 锚点让位给标题
      if (src && src.tagName === 'A' && prose.contains(src) && !src.textContent.trim()) src.removeAttribute('id');
      while (used.has(s) || (document.getElementById(s) && document.getElementById(s) !== h)) s = slug + '-' + n++;
      used.add(s);
      h.id = s;
      const a = document.createElement('a');
      a.className = 'h-anchor'; a.href = '#/' + encodeURIComponent(item.id) + '#' + encodeURIComponent(s);
      a.setAttribute('aria-label', '本节链接'); a.textContent = '#';
      h.appendChild(a);
    });

    prose.querySelectorAll('blockquote').forEach(bq => {
      const p = bq.firstElementChild;
      const strong = p && p.firstElementChild && p.firstElementChild.tagName === 'STRONG' && p.firstChild === p.firstElementChild ? p.firstElementChild : null;
      let kind = 'note';
      if (strong) {
        const key = strong.textContent.trim().toLowerCase().replace(/[:：]$/, '');
        if (CALLOUT[key]) { kind = CALLOUT[key][1]; strong.textContent = CALLOUT[key][0]; }
        strong.classList.add('co-title');
      }
      bq.classList.add('callout', 'co-' + kind);
    });

    prose.querySelectorAll('table').forEach(t => {
      const w = document.createElement('div'); w.className = 'table-wrap';
      t.parentNode.insertBefore(w, t); w.appendChild(t);
    });
    prose.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
  },

  /* ---------------- 本页目录 + 滚动高亮 ---------------- */
  buildToc(prose, item) {
    const hs = [...prose.querySelectorAll('h2, h3')];
    if (this.spy) { removeEventListener('scroll', this.spy); this.spy = null; }
    const inline = this.main.querySelector('.toc-inline');
    if (hs.length < 2) { this.toc.innerHTML = ''; return; }
    const text = h => h.firstChild ? [...h.childNodes].filter(n => !(n.classList && n.classList.contains('h-anchor'))).map(n => n.textContent).join('').trim() : '';
    const list = hs.map(h => '<a class="toc-' + h.tagName.toLowerCase() + '" href="#/' + encodeURIComponent(item.id) + '#' + encodeURIComponent(h.id) + '" data-to="' + escH(h.id) + '">' + escH(text(h)) + '</a>').join('');
    this.toc.innerHTML = '<div class="toc-in"><div class="toc-t">本页目录</div><nav>' + list + '</nav><button type="button" class="toc-top">↑ 回到顶部</button></div>';
    this.toc.querySelector('.toc-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    if (inline) { inline.hidden = false; inline.querySelector('nav').innerHTML = list; }
    const links = [...this.toc.querySelectorAll('a')];
    let ticking = false;
    this.spy = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const line = 120;
        let cur = hs[0];
        for (const h of hs) { if (h.getBoundingClientRect().top - line <= 0) cur = h; else break; }
        links.forEach(a => a.classList.toggle('active', a.dataset.to === cur.id));
        const act = this.toc.querySelector('a.active');
        const box = this.toc.querySelector('.toc-in');
        if (act && box) {
          const r = act.getBoundingClientRect(), br = box.getBoundingClientRect();
          if (r.top < br.top + 40 || r.bottom > br.bottom - 40) box.scrollTop += r.top - br.top - br.height / 2;
        }
      });
    };
    addEventListener('scroll', this.spy, { passive: true });
    this.spy();
  },

  /* ---------------- 手机抽屉 ---------------- */
  initDrawer() {
    const set = on => { document.body.classList.toggle('docs-menu-open', on); document.body.classList.toggle('no-scroll', on); };
    this.closeDrawer = () => set(false);
    document.getElementById('docsMenuBtn').addEventListener('click', () => set(true));
    document.getElementById('docsMenuClose').addEventListener('click', () => set(false));
    document.getElementById('docsOverlay').addEventListener('click', () => set(false));
    document.getElementById('docTree').addEventListener('click', e => { if (e.target.closest('.titem')) set(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
  },
  closeDrawer() {},

  /* ---------------- 搜索面板（/ 或 Ctrl/⌘+K） ---------------- */
  initSearch() {
    const pal = document.getElementById('searchPal');
    const input = document.getElementById('spInput');
    const list = document.getElementById('spList');
    const status = document.getElementById('spStatus');
    let results = [], sel = 0, timer = null;

    const open = () => {
      document.body.classList.remove('docs-menu-open');
      pal.hidden = false; document.body.classList.add('no-scroll');
      requestAnimationFrame(() => { pal.classList.add('open'); input.focus(); input.select(); });
      this.buildIndex().then(() => { if (!pal.hidden) run(); });
      run();
    };
    const close = () => {
      pal.classList.remove('open'); document.body.classList.remove('no-scroll');
      setTimeout(() => { pal.hidden = true; }, 150);
    };
    const go = r => { close(); location.hash = r.href; };
    const run = () => {
      const q = input.value.trim();
      if (!q) {
        results = START_IDS.filter(([id]) => this.byId.has(id)).map(([id, k]) => ({ href: '#/' + id, title: this.byId.get(id).title, group: k, sub: '', snip: '' }));
        status.textContent = '推荐阅读';
      } else {
        results = this.search(q);
        status.textContent = this.index ? (results.length ? '找到 ' + results.length + ' 条结果' : '没有找到“' + q + '”相关内容，换个关键词试试') : '正在建立全文索引…（已先匹配标题）';
      }
      sel = 0; draw(q);
    };
    const draw = q => {
      const terms = q ? q.toLowerCase().split(/\s+/).filter(Boolean) : [];
      const hl = s => {
        let out = escH(s);
        terms.forEach(t => { out = out.replace(new RegExp('(' + escH(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); });
        return out;
      };
      list.innerHTML = results.slice(0, 40).map((r, i) =>
        '<a class="sp-item' + (i === sel ? ' sel' : '') + '" href="' + r.href + '" data-i="' + i + '">' +
        '<span class="sp-t"><span class="sp-g">' + escH(r.group) + '</span>' + hl(r.title) + (r.sub ? '<span class="sp-sub"> › ' + hl(r.sub) + '</span>' : '') + '</span>' +
        (r.snip ? '<span class="sp-s">' + hl(r.snip) + '</span>' : '') + '</a>').join('');
      const s = list.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
    };
    list.addEventListener('click', e => {
      const a = e.target.closest('.sp-item'); if (!a) return;
      e.preventDefault(); go(results[+a.dataset.i]);
    });
    input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 120); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!results.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + Math.min(results.length, 40)) % Math.min(results.length, 40);
        draw(input.value.trim());
      } else if (e.key === 'Enter' && results[sel]) { e.preventDefault(); go(results[sel]); }
    });
    pal.addEventListener('click', e => { if (e.target === pal) close(); });
    document.getElementById('spClose').addEventListener('click', close);
    document.addEventListener('click', e => { if (e.target.closest('[data-open-search]')) { e.preventDefault(); open(); } });
    addEventListener('keydown', e => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); pal.hidden ? open() : close(); }
      else if (e.key === '/' && !typing && pal.hidden) { e.preventDefault(); open(); }
      else if (e.key === 'Escape' && !pal.hidden) close();
    });
  },

  buildIndex() {
    if (this.index) return Promise.resolve();
    if (this.indexing) return this.indexing;
    const strip = t => t
      .replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[`*_>|]/g, ' ')
      .replace(/^-{3,}$/gm, ' ');
    const queue = [...this.flat];
    const worker = async () => {
      while (queue.length) {
        const it = queue.shift();
        try {
          const raw = await this.fetchRaw(it);
          const sections = [];
          let cur = { h: '', text: '' };
          strip(raw).split('\n').forEach(line => {
            const m = line.match(/^(#{2,3})\s+(.*)$/);
            if (m) { sections.push(cur); cur = { h: m[2].replace(/#/g, '').trim(), text: '' }; }
            else cur.text += ' ' + line.replace(/^#+\s*/, '');
          });
          sections.push(cur);
          sections.forEach(s => { s.text = s.text.replace(/\s+/g, ' ').trim(); s.lower = s.text.toLowerCase(); s.hl = s.h.toLowerCase(); });
          it._sections = sections.filter(s => s.text || s.h);
        } catch (e) { it._sections = []; }
      }
    };
    this.indexing = Promise.all(Array.from({ length: 6 }, worker)).then(() => { this.index = true; });
    return this.indexing;
  },

  search(q) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const slug = h => h.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s+/g, '-');
    const out = [];
    this.flat.forEach(it => {
      const meta = (it.title + ' ' + (it.en || '') + ' ' + (it.keywords || '') + ' ' + it.group).toLowerCase();
      const titleHit = terms.every(t => meta.includes(t));
      let best = null;
      (it._sections || []).forEach(s => {
        const hay = s.hl + ' ' + s.lower;
        if (!terms.every(t => hay.includes(t) || meta.includes(t))) return;
        const inBody = terms.filter(t => hay.includes(t));
        if (!inBody.length) return;
        let score = 0;
        inBody.forEach(t => { if (s.hl.includes(t)) score += 12; score += Math.min(6, s.lower.split(t).length - 1); });
        if (!best || score > best.score) best = { s, score, t: inBody[0] };
      });
      if (!titleHit && !best) return;
      let snip = '', sub = '', href = '#/' + encodeURIComponent(it.id);
      if (best) {
        const pos = best.s.lower.indexOf(best.t);
        if (pos >= 0) {
          const a = Math.max(0, pos - 30), b = Math.min(best.s.text.length, pos + best.t.length + 70);
          snip = (a > 0 ? '…' : '') + best.s.text.slice(a, b) + (b < best.s.text.length ? '…' : '');
        } else snip = best.s.text.slice(0, 90);
        if (best.s.h) { sub = best.s.h; href += '#' + encodeURIComponent(slug(best.s.h)); }
      }
      out.push({ href, title: this.label(it), group: it.group, sub, snip, score: (titleHit ? 100 : 0) + (best ? best.score : 0) });
    });
    return out.sort((a, b) => b.score - a.score);
  }
};

document.addEventListener('DOMContentLoaded', () => Docs.init());
