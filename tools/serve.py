#!/usr/bin/env python3
"""本地预览服务器：与 GitHub Pages 行为一致——/install 自动对应 install.html，找不到的页面显示 404.html。
用法：python tools/serve.py [端口]，默认 8000；也可以直接双击 serve.bat。"""
import http.server, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.md': 'text/markdown; charset=utf-8', '.json': 'application/json; charset=utf-8',
                      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
                      '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4'}

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def send_head(self):
        path = self.path.split('?', 1)[0].split('#', 1)[0]
        local = self.translate_path(path)
        if not os.path.exists(local) and os.path.exists(local + '.html'):
            self.path = path + '.html'          # /install → install.html
        elif not os.path.exists(local):
            return self.send_404()
        return super().send_head()

    def send_404(self):
        with open(os.path.join(ROOT, '404.html'), 'rb') as f:
            body = f.read().replace(b'<base href="/agent-insight-web/">', b'<base href="/">')
        self.send_response(404)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        import io
        return io.BytesIO(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


if __name__ == '__main__':
    print(f'Agent Insight 本地预览：http://localhost:{PORT}  （Ctrl+C 停止）')
    http.server.ThreadingHTTPServer(('', PORT), Handler).serve_forever()
