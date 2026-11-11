#!/usr/bin/env python3
"""
文档与图片更新助手（Windows 双击 tools\\update_docs.bat，或 python tools/update_docs.py）

做两件事：
1. 扫描 content/docs/ 下的所有 .md，同步 manifest.json：
   - 新增的文档自动登记（标题、关键词取自文件开头的 frontmatter），按所在目录归入分组；
   - 已删除的文档自动移出目录；
   - 已有条目的顺序、标题、ID 保持不变（手工调整过的不会被覆盖）。
2. 为 assets/img/ 下新增或更新过的 PNG / JPG 生成同名 .webp（需要 Pillow：pip install pillow；
   未安装时跳过这一步，网站照样可用，只是图片体积大一些）。

只加 --check 参数时只报告差异、不写文件。
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'content', 'docs')
MANIFEST = os.path.join(DOCS, 'manifest.json')
IMG = os.path.join(ROOT, 'assets', 'img')
GROUPS = [('tutorial', '入门教程', 'TUTORIALS'), ('how-to', '操作指南', 'HOW-TO'),
          ('reference', '参考文档', 'REFERENCE'), ('explanation', '概念与原理', 'EXPLANATION')]
CHECK = '--check' in sys.argv


def frontmatter(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    m = re.match(r'^---\s*\n([\s\S]*?)\n---\s*\n', text)
    fm = {}
    if m:
        for line in m.group(1).splitlines():
            kv = re.match(r'^(\w+):\s*(.*)$', line)
            if kv:
                fm[kv.group(1)] = kv.group(2).strip()
    title = fm.get('title', '').strip('"\'')
    if not title:
        h = re.search(r'^#\s+(.+)$', text, re.M)
        title = h.group(1).strip() if h else os.path.splitext(os.path.basename(path))[0]
    kw = fm.get('keywords', '')
    kw = ' '.join(re.findall(r'"([^"]+)"', kw)) or kw.strip('[]"\'')
    return title, kw


def sync_manifest():
    with open(MANIFEST, encoding='utf-8') as f:
        manifest = json.load(f)
    by_name = {g['group']: g for g in manifest}
    for top, name, en in GROUPS:
        if name not in by_name:
            g = {'group': name, 'groupEn': en, 'items': []}
            manifest.append(g); by_name[name] = g

    on_disk = set()
    for dirpath, _, files in os.walk(DOCS):
        for fn in files:
            if fn.endswith('.md'):
                on_disk.add(os.path.relpath(os.path.join(dirpath, fn), DOCS).replace('\\', '/'))

    listed = {it['file'] for g in manifest for it in g['items']}
    ids = {it['id'] for g in manifest for it in g['items']}
    removed, added = [], []

    for g in manifest:
        keep = []
        for it in g['items']:
            if it['file'] in on_disk:
                keep.append(it)
            else:
                removed.append(it['file'])
        g['items'] = keep

    for rel in sorted(on_disk - listed):
        top = rel.split('/')[0]
        group = next((name for t, name, _ in GROUPS if t == top), '操作指南')
        title, kw = frontmatter(os.path.join(DOCS, rel))
        parts = rel[:-3].split('/')
        base = re.sub(r'^\d+-', '', parts[-1]) or parts[-1]
        doc_id = base
        if doc_id in ids:
            doc_id = (parts[-2] + '-' + base) if len(parts) > 1 else base
        n = 2
        while doc_id in ids:
            doc_id = f'{base}-{n}'; n += 1
        ids.add(doc_id)
        by_name[group]['items'].append({'id': doc_id, 'title': title, 'en': '', 'file': rel, 'keywords': kw})
        added.append(f'{rel}  →  {group} / {title}  (#/{doc_id})')

    print(f'文档：共 {len(on_disk)} 篇；新增 {len(added)}，移除 {len(removed)}')
    for a in added: print('  + ' + a)
    for r in removed: print('  - ' + r)
    if (added or removed) and not CHECK:
        with open(MANIFEST, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        print('  已更新 content/docs/manifest.json')


def make_webp():
    try:
        from PIL import Image
    except ImportError:
        print('图片：未安装 Pillow，跳过 WebP 生成（可运行 pip install pillow 后重试）')
        return
    made = 0
    for dirpath, _, files in os.walk(IMG):
        if os.sep + 'docs' in dirpath:   # 文档内截图直接引用 PNG，不需要 WebP
            continue
        for fn in files:
            if not fn.lower().endswith(('.png', '.jpg', '.jpeg')) or fn.startswith(('og-', 'apple-touch', 'qr-')):
                continue
            src = os.path.join(dirpath, fn)
            dst = os.path.splitext(src)[0] + '.webp'
            if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src):
                continue
            if CHECK:
                print('  需要生成 ' + os.path.relpath(dst, ROOT)); made += 1; continue
            im = Image.open(src)
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGBA')
            im.save(dst, 'WEBP', quality=86, method=6)
            made += 1
            print(f'  生成 {os.path.relpath(dst, ROOT)}  ({os.path.getsize(src)//1024} KB → {os.path.getsize(dst)//1024} KB)')
    print(f'图片：{"需要" if CHECK else "已"}生成 {made} 个 WebP')


if __name__ == '__main__':
    sync_manifest()
    make_webp()
