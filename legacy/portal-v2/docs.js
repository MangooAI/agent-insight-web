/* ============================================================
   AGENT INSIGHT PORTAL — docs page runtime
   文档树 / Hash 路由 / 全文搜索
   ============================================================ */
'use strict';

const DocsApp = {
  manifest: null,      // [{group, groupEn, items:[{id,title,en,file,keywords}]}]
  flat: [],            // 拍平后的 item 列表（保持顺序）
  cache: new Map(),    // id -> {html, text}
  current: null,

  async init() {
    try {
      const res = await fetch('content/docs/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.manifest = await res.json();
    } catch (e) {
      document.getElementById('docBody').innerHTML =
        '<div class="md-error"><b>文档清单加载失败</b> — 无法读取 <code>content/docs/manifest.json</code>。<br>' +
        '请通过本地服务访问本站（运行 <code>serve.bat</code> 或 <code>python -m http.server 8000</code>），而不是直接双击 HTML 文件。</div>';
      return;
    }
    this.manifest.forEach(g => g.items.forEach(it => {
      it.group = g.group; it.groupEn = g.groupEn;
      this.flat.push(it);
    }));
    this.buildTree();
    this.initSearch();
    this.initMenuBtn();
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  /* ---------- 侧边栏 ---------- */
  buildTree() {
    const tree = document.getElementById('docTree');
    tree.innerHTML = '';
    this.manifest.forEach((g, gi) => {
      const box = document.createElement('div');
      box.className = 'tree-group' + (gi > 0 ? ' closed' : '');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span>▾</span><span>' + g.group + '</span>' +
        '<span class="chev" style="color:var(--ink-3)">▾</span>';
      // 让第一行显示组名 + 折叠箭头
      btn.innerHTML = '<span style="color:var(--ink-3)">▾</span><span>' + g.group + '</span>' +
        '<span class="chev" style="color:var(--ink-3);font-size:9px">' + (gi > 0 ? '▾ 展开' : '▾') + '</span>';
      btn.addEventListener('click', () => {
        box.classList.toggle('closed');
        btn.querySelector('.chev').textContent = box.classList.contains('closed') ? '▸ 展开' : '▾';
      });
      if (gi > 0) btn.querySelector('.chev').textContent = '▸ 展开';
      const items = document.createElement('div');
      items.className = 'tree-items';
      g.items.forEach(it => {
        const a = document.createElement('a');
        a.href = '#/' + it.id;
        a.className = 'tree-item';
        a.dataset.id = it.id;
        a.innerHTML = it.title + '<span class="en">' + it.en + '</span>';
        items.appendChild(a);
      });
      box.appendChild(btn); box.appendChild(items);
      tree.appendChild(box);
    });
  },

  markActive(id) {
    document.querySelectorAll('.tree-item').forEach(a =>
      a.classList.toggle('active', a.dataset.id === id));
    const active = document.querySelector('.tree-item.active');
    if (active) {
      const grp = active.closest('.tree-group');
      if (grp && grp.classList.contains('closed')) {
        grp.classList.remove('closed');
        const chev = grp.querySelector('.chev');
        if (chev) chev.textContent = '▾';
      }
      active.scrollIntoView({ block: 'nearest' });
    }
  },

  /* ---------- 路由 ---------- */
  route() {
    const id = decodeURIComponent((location.hash || '').replace(/^#\/?/, ''));
    const item = this.flat.find(i => i.id === id) || this.flat[0];
    if (!item) return;
    if (this.current === item.id && this.cache.has(item.id)) { this.markActive(item.id); return; }
    this.current = item.id;
    if (location.hash !== '#/' + item.id) history.replaceState(null, '', '#/' + item.id);
    this.render(item);
  },

  async render(item) {
    this.markActive(item.id);
    document.getElementById('docCrumbGroup').textContent = item.group;
    document.getElementById('docCrumbTitle').textContent = item.title;
    document.getElementById('docEdit').href = SITE.docsEditBase + '/' + item.file;
    document.title = item.title + ' — Agent Insight 文档';
    const body = document.getElementById('docBody');
    const idx = this.flat.indexOf(item);
    const prev = this.flat[idx - 1], next = this.flat[idx + 1];
    setNav('docPrev', prev, '上一篇');
    setNav('docNext', next, '下一篇');
    function setNav(elId, target, label) {
      const a = document.getElementById(elId);
      if (!target) { a.classList.add('disabled'); a.href = 'javascript:void(0)'; a.querySelector('.t').textContent = '—'; return; }
      a.classList.remove('disabled');
      a.href = '#/' + target.id;
      a.querySelector('.t').textContent = target.title;
    }
    if (this.cache.has(item.id)) {
      body.innerHTML = this.cache.get(item.id).html;
      enhanceMd(body);
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      return;
    }
    body.innerHTML = '<div class="dr-empty" style="padding:64px 0">LOADING DOCUMENT …</div>';
    try {
      await mdReady();
      const res = await fetch('content/docs/' + item.file, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const md = await res.text();
      const html = '<div class="md-content">' + marked.parse(md) + '</div>' +
        '<div class="md-note"><b>MAINTENANCE</b> · 本文档由 <code>content/docs/' + item.file +
        '</code> 驱动，修改 Markdown 即可更新本页。发现错误？<a href="' + SITE.issues + '" target="_blank" rel="noopener" style="color:var(--lime)">提交 Issue</a> 或直接 PR。</div>';
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const text = tmp.textContent.replace(/\s+/g, ' ').trim();
      this.cache.set(item.id, { html, text });
      body.innerHTML = html;
      enhanceMd(body);
      window.scrollTo(0, 0);
      // 后台预热相邻文档，加快翻页
      [this.flat[idx - 1], this.flat[idx + 1]].forEach(n => {
        if (n && !this.cache.has(n.id)) {
          fetch('content/docs/' + n.file).then(r => r.ok ? r.text() : '').then(t => {
            if (t) this.cache.set(n.id, {
              html: '<div class="md-content">' + marked.parse(t) + '</div>', text: t.replace(/\s+/g, ' ').trim()
            });
          }).catch(() => {});
        }
      });
    } catch (e) {
      console.error('[docs]', item.file, e);
      body.innerHTML = mdErrorBox('content/docs/' + item.file);
    }
  },

  /* ---------- 搜索 ---------- */
  initSearch() {
    const input = document.getElementById('docSearch');
    const panel = document.getElementById('docResults');
    let timer = null, selIdx = -1, results = [];

    const doSearch = q => {
      q = q.trim().toLowerCase();
      results = []; selIdx = -1;
      if (q.length < 1) { panel.classList.remove('open'); panel.innerHTML = ''; return; }
      if (q.length < 2) {  // 单字符只匹配标题
        this.flat.forEach(it => {
          if ((it.title + it.en + (it.keywords || '')).toLowerCase().includes(q))
            results.push({ item: it, score: 10, snippet: '' });
        });
      } else {
        this.flat.forEach(it => {
          const titleHay = (it.title + it.en + (it.keywords || '')).toLowerCase();
          let score = 0;
          if (titleHay.includes(q)) score += 20;
          const c = this.cache.get(it.id);
          if (c) {
            const pos = c.text.toLowerCase().indexOf(q);
            if (pos >= 0) {
              score += 6 + Math.max(0, 8 - Math.floor(pos / 300)); // 靠前命中加分
              results.push({ item: it, score, snippet: snippetOf(c.text, pos, q) });
              return;
            }
          } else {
            score += it._maybe ? 1 : 0; // 未加载文档仅标题参与
          }
          if (score >= 20) results.push({ item: it, score, snippet: '' });
        });
        // 未加载的文档异步加载后再搜一次
        this.flat.forEach(it => {
          if (!this.cache.has(it.id)) {
            fetch('content/docs/' + it.file).then(r => r.ok ? r.text() : '').then(t => {
              if (!t) return;
              this.cache.set(it.id, {
                html: '<div class="md-content">' + marked.parse(t) + '</div>',
                text: t.replace(/\s+/g, ' ').trim()
              });
              const c = this.cache.get(it.id);
              const pos = c.text.toLowerCase().indexOf(q);
              if (pos >= 0) {
                results.push({ item: it, score: 6, snippet: snippetOf(c.text, pos, q) });
                render();
              }
            }).catch(() => {});
          }
        });
      }
      results.sort((a, b) => b.score - a.score);
      render();
    };

    const snippetOf = (text, pos, q) => {
      const start = Math.max(0, pos - 40);
      const end = Math.min(text.length, pos + q.length + 70);
      return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    };

    const highlight = (s, q) => {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return s.replace(new RegExp('(' + esc + ')', 'gi'), '<mark>$1</mark>');
    };

    const render = () => {
      if (!results.length) {
        panel.innerHTML = '<div class="dr-empty">未找到「' + input.value.trim() + '」相关内容</div>';
        panel.classList.add('open');
        return;
      }
      panel.innerHTML = '<div class="dr-head">' + results.length + ' RESULTS · 搜索结果</div>' +
        results.slice(0, 30).map((r, i) =>
          '<button class="dr-item' + (i === selIdx ? ' sel' : '') + '" data-i="' + i + '">' +
          '<span class="t"><span class="g">' + r.item.group + '</span>' + highlight(r.item.title, input.value.trim()) + '</span>' +
          (r.snippet ? '<span class="s">' + highlight(r.snippet, input.value.trim()) + '</span>' : '') +
          '</button>'
        ).join('');
      panel.classList.add('open');
      panel.querySelectorAll('.dr-item').forEach(b => {
        b.addEventListener('click', () => {
          const r = results[+b.dataset.i];
          location.hash = '#/' + r.item.id;
          close();
        });
      });
    };

    const close = () => { panel.classList.remove('open'); input.blur(); };

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(input.value), 160);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!results.length) return;
        selIdx = e.key === 'ArrowDown'
          ? (selIdx + 1) % results.length
          : (selIdx - 1 + results.length) % results.length;
        render();
      } else if (e.key === 'Enter' && selIdx >= 0) {
        location.hash = '#/' + results[selIdx].item.id; close();
      } else if (e.key === 'Enter' && results.length) {
        location.hash = '#/' + results[0].item.id; close();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.docs-search')) panel.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
        document.querySelector('.docs-side').scrollIntoView({ block: 'nearest' });
      }
    });
  },

  initMenuBtn() {
    const btn = document.getElementById('docsMenuBtn');
    if (btn) btn.addEventListener('click', () => document.body.classList.toggle('docs-menu-open'));
  }
};

document.addEventListener('DOMContentLoaded', () => DocsApp.init());
