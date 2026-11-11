/* Agent Insight portal — docs runtime: manifest / tree / hash route / full-text search */
'use strict';

const DocsApp = {
  manifest: null,
  flat: [],
  cache: new Map(),
  current: null,

  async init() {
    try {
      const res = await fetch('content/docs/manifest.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      this.manifest = await res.json();
    } catch (e) {
      document.getElementById('docBody').innerHTML =
        '<div class="md-error"><b>文档清单加载失败</b>:无法读取 <code>content/docs/manifest.json</code>。请通过本地服务访问本站(运行 <code>serve.bat</code> 或 <code>python -m http.server 8000</code>)。</div>';
      return;
    }
    this.manifest.forEach(g => g.items.forEach(it => {
      it.group = g.group;
      this.flat.push(it);
    }));
    // 供 preprocessMd 把相对链接映射到路由
    window.DOC_FILE_MAP = {};
    this.flat.forEach(it => window.DOC_FILE_MAP[it.file] = it.id);
    this.buildTree();
    this.initSearch();
    this.initMenuBtn();
    addEventListener('hashchange', () => this.route());
    this.route();
  },

  buildTree() {
    const tree = document.getElementById('docTree');
    tree.innerHTML = '';
    this.manifest.forEach((g, gi) => {
      const box = document.createElement('div');
      box.className = 'tgroup' + (gi > 0 ? ' closed' : '');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span aria-hidden="true">▾</span><span>' + g.group + '</span><span class="chev" aria-hidden="true">▾</span>';
      btn.setAttribute('aria-label', (gi > 0 ? '展开' : '收起') + g.group);
      btn.addEventListener('click', () => {
        box.classList.toggle('closed');
        btn.querySelector('.chev').textContent = box.classList.contains('closed') ? '▸' : '▾';
      });
      const items = document.createElement('div');
      items.className = 'titems';
      g.items.forEach(it => {
        const a = document.createElement('a');
        a.href = '#/' + it.id;
        a.className = 'titem';
        a.dataset.id = it.id;
        a.textContent = it.title;
        items.appendChild(a);
      });
      box.appendChild(btn); box.appendChild(items);
      tree.appendChild(box);
    });
  },

  markActive(id) {
    document.querySelectorAll('.titem').forEach(a =>
      a.classList.toggle('active', a.dataset.id === id));
    const active = document.querySelector('.titem.active');
    if (active) {
      const grp = active.closest('.tgroup');
      if (grp && grp.classList.contains('closed')) {
        grp.classList.remove('closed');
        const c = grp.querySelector('.chev');
        if (c) c.textContent = '▾';
      }
      active.scrollIntoView({ block: 'nearest' });
    }
  },

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
    const setNav = (elId, target, label) => {
      const a = document.getElementById(elId);
      if (!target) { a.classList.add('disabled'); a.href = 'javascript:void(0)'; a.querySelector('.t').textContent = '—'; return; }
      a.classList.remove('disabled');
      a.href = '#/' + target.id;
      a.querySelector('.t').textContent = target.title;
    };
    setNav('docPrev', this.flat[idx - 1]);
    setNav('docNext', this.flat[idx + 1]);
    if (this.cache.has(item.id)) {
      body.innerHTML = this.cache.get(item.id).html;
      enhanceMd(body);
      window.scrollTo(0, 0);
      return;
    }
    body.innerHTML = '<div class="md-loading">加载中 …</div>';
    try {
      await mdReady();
      const res = await fetch('content/docs/' + item.file, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = await res.text();
      const parsed = marked.parse(preprocessMd(raw, item.file));
      const html = '<div class="prose cut" style="padding: clamp(24px, 4vw, 56px);">' + parsed + '</div>' +
        '<div class="md-note" style="margin-top: 16px;">本页由 <code>content/docs/' + item.file + '</code> 驱动,内容随 AtomGit 仓库文档更新。发现错误?欢迎 <a href="' + SITE.issues + '" target="_blank" rel="noopener">提 Issue</a>。</div>';
      const text = parsed.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.cache.set(item.id, { html, text });
      body.innerHTML = html;
      enhanceMd(body);
      window.scrollTo(0, 0);
      [this.flat[idx - 1], this.flat[idx + 1]].forEach(n => {
        if (n && !this.cache.has(n.id)) {
          fetch('content/docs/' + n.file).then(r => r.ok ? r.text() : '').then(t => {
            if (t) {
              const p = marked.parse(preprocessMd(t, n.file));
              this.cache.set(n.id, { html: '<div class="prose cut" style="padding: clamp(24px,4vw,56px);">' + p + '</div>', text: p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
            }
          }).catch(() => {});
        }
      });
    } catch (e) {
      console.error('[docs]', item.file, e);
      body.innerHTML = mdErrorBox('content/docs/' + item.file);
    }
  },

  initSearch() {
    const input = document.getElementById('docSearch');
    const panel = document.getElementById('docResults');
    let timer = null, selIdx = -1, results = [];

    const snippetOf = (text, pos, q) => {
      const s = Math.max(0, pos - 34), e = Math.min(text.length, pos + q.length + 60);
      return (s > 0 ? '…' : '') + text.slice(s, e) + (e < text.length ? '…' : '');
    };
    const highlight = (s, q) => {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return s.replace(new RegExp('(' + esc + ')', 'gi'), '<mark>$1</mark>');
    };
    const render = () => {
      if (!results.length) {
        panel.innerHTML = '<div class="dr-empty">没有找到「' + input.value.trim() + '」相关内容</div>';
        panel.classList.add('open');
        return;
      }
      panel.innerHTML = '<div class="dr-head">' + results.length + ' 条结果</div>' +
        results.slice(0, 30).map((r, i) =>
          '<button class="dr-item' + (i === selIdx ? ' sel' : '') + '" data-i="' + i + '">' +
          '<span class="t"><span class="g">' + r.item.group + '</span>' + highlight(r.item.title, input.value.trim()) + '</span>' +
          (r.snippet ? '<span class="s">' + highlight(r.snippet, input.value.trim()) + '</span>' : '') +
          '</button>').join('');
      panel.classList.add('open');
      panel.querySelectorAll('.dr-item').forEach(b => {
        b.addEventListener('click', () => {
          location.hash = '#/' + results[+b.dataset.i].item.id;
          panel.classList.remove('open'); input.blur();
        });
      });
    };

    const doSearch = qRaw => {
      const q = qRaw.trim().toLowerCase();
      results = []; selIdx = -1;
      if (!q) { panel.classList.remove('open'); panel.innerHTML = ''; return; }
      this.flat.forEach(it => {
        const titleHit = (it.title + it.en + (it.keywords || '')).toLowerCase().includes(q);
        const c = this.cache.get(it.id);
        if (c) {
          const pos = c.text.toLowerCase().indexOf(q);
          if (titleHit) results.push({ item: it, score: 20, snippet: pos >= 0 ? snippetOf(c.text, pos, q) : '' });
          else if (pos >= 0) results.push({ item: it, score: 6 + Math.max(0, 6 - Math.floor(pos / 400)), snippet: snippetOf(c.text, pos, q) });
        } else if (titleHit) {
          results.push({ item: it, score: 20, snippet: '' });
          fetch('content/docs/' + it.file).then(r => r.ok ? r.text() : '').then(t => {
            if (!t) return;
            const p = marked.parse(preprocessMd(t, it.file));
            const text = p.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            this.cache.set(it.id, { html: '<div class="prose cut" style="padding: clamp(24px,4vw,56px);">' + p + '</div>', text });
            const pos = text.toLowerCase().indexOf(q);
            if (pos >= 0) { results.push({ item: it, score: 6, snippet: snippetOf(text, pos, q) }); render(); }
          }).catch(() => {});
        }
      });
      results.sort((a, b) => b.score - a.score);
      render();
    };

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => doSearch(input.value), 160);
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') { input.value = ''; panel.classList.remove('open'); input.blur(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!results.length) return;
        selIdx = e.key === 'ArrowDown' ? (selIdx + 1) % results.length : (selIdx - 1 + results.length) % results.length;
        render();
      } else if (e.key === 'Enter' && results.length) {
        const r = results[Math.max(selIdx, 0)];
        location.hash = '#/' + r.item.id;
        panel.classList.remove('open'); input.blur();
      }
    });
    document.addEventListener('click', e => {
      if (!e.target.closest('.docs-search')) panel.classList.remove('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); input.focus();
      }
    });
  },

  initMenuBtn() {
    const btn = document.getElementById('docsMenuBtn');
    if (btn) btn.addEventListener('click', () => document.body.classList.toggle('docs-menu-open'));
  }
};

document.addEventListener('DOMContentLoaded', () => DocsApp.init());
