# Agent Insight 产品官网

Agent Insight 官方产品站点（纯静态）：首页 / 安装 / 社区 / 文档 / 联系我们。
v4 重构要点：移动端适配、图片按原始比例完整展示并支持点击放大、安装页只保留 npm 安装、去掉外链字体（国内访问更快）。

## 本地预览

```bash
# 方式一：双击
serve.bat

# 方式二：手动
python -m http.server 8000
```

访问 <http://localhost:8000>。
> 文档页用 fetch 加载 Markdown，必须通过 HTTP 访问；直接双击 HTML（file://）会加载失败。

## 目录结构

```text
├─ index.html              首页（Hero 图库、关键能力、五大能力分区、集成矩阵、加入项目）
├─ install.html            安装页（npm / npx 安装步骤）
├─ dev.html                社区页（ANSE SIG 简介、参与路径）
├─ docs.html               文档中心（文档首页、目录树、本页目录、全文搜索；/ 或 Ctrl+K 唤起搜索）
├─ contact.html            联系我们（二维码、资源推荐）
├─ assets/
│  ├─ css/site.css         全站样式（唯一样式文件，移动优先）
│  ├─ js/site.js           导航 / 图库切换 / 图片放大 / 复制 / 过滤 / Markdown 加载
│  ├─ js/docs.js           文档树 / Hash 路由 / 全文搜索
│  ├─ vendor/marked.min.js Markdown 渲染器（本地）
│  └─ img/                 产品图片；PNG 配有同名 .webp（页面优先加载 WebP，放大时看原 PNG）
├─ 404.html                页面不存在时显示
├─ content/docs/           文档 Markdown + manifest.json
├─ tools/update_docs.py    文档目录同步 + WebP 生成（update_docs.bat 双击运行）
├─ deploy/nginx.conf       nginx 部署示例
└─ legacy/                 历史版本备份（v3-backup 为本次重构前的版本）
```

## 常见维护

| 要更新什么 | 改哪里 |
| --- | --- |
| 仓库地址、Releases 等全站链接 | `assets/js/site.js` 顶部 `window.SITE` |
| 新增 / 修改文档 | `content/docs/*.md`，并在 `manifest.json` 中登记 |
| 首页文案、图片 | `index.html` |
| 安装命令 | `install.html` |

### 替换或新增首页图片

每个能力分区的图片是一个“图库”（`data-gallery`）：自动轮播（首页大图 6 秒、能力分区 5 秒，悬停或放大查看时暂停），也可点标签切换；图片完整显示不裁切，点击“放大查看”进入全屏，可切换到原图大小拖动查看细节。轮播间隔由 `data-autoplay` 控制（毫秒）。

1. 把图片放进 `assets/img/`；位图建议另存一份同名 `.webp`（体积通常小 70% 以上），没有 `.webp` 时删掉对应的 `<source>` 行即可；
2. 在 `index.html` 对应 `<figure class="g-panel">` 中修改 `src`、`alt`、`width`/`height`（填图片真实像素尺寸，避免加载时页面跳动）；
3. `data-cap` 是图下说明文字，`data-title` 是图片框顶部标题。

## 部署

纯静态站点，没有后端，任何能托管静态文件的地方都可以：

| 方式 | 适合 | 做法 |
| --- | --- | --- |
| 自有服务器 + nginx | 已有服务器、内网环境 | 把整个目录上传到服务器，参考 `deploy/nginx.conf` 配置后 `nginx -s reload` |
| 对象存储 + CDN | 公网访问、免运维 | 华为云 OBS / 阿里云 OSS / 腾讯云 COS 开启“静态网站托管”，上传整个目录，首页设为 `index.html`、404 页设为 `404.html` |
| 代码托管平台 Pages | 跟代码仓一起维护 | 把站点放进 Git 仓库，开启 Pages 服务（以平台实际提供的为准） |

注意：
- 上传时保持目录结构不变，尤其是 `content/`（文档页按相对路径读取 Markdown）；
- `tools/`、`deploy/`、`legacy/`、`.hallmark/` 不需要对外发布，可以不上传；
- 必须通过 HTTP(S) 访问，直接双击 HTML 文件时文档页无法加载。

## 更新内容

### 更新文档

1. 把新的或修改过的 `.md` 放进 `content/docs/` 对应目录（`tutorial/` 入门教程、`how-to/` 操作指南、`reference/` 参考文档、`explanation/` 概念与原理），文档里引用的截图放进 `assets/img/docs/`；
2. 双击 `tools/update_docs.bat`（或运行 `python tools/update_docs.py`）：自动把新文档登记到目录、移除已删除的文档，标题取自文档开头的 `title:`；
3. 本地 `serve.bat` 预览确认后，把变动的文件上传到服务器即可。文档是浏览器实时读取的，不需要重新“构建”。

想调整文档在目录中的顺序或改显示标题，直接编辑 `content/docs/manifest.json`。

### 更新首页图片

1. 用新图覆盖 `assets/img/` 下的同名文件（文件名不变最省事）；
2. 运行 `tools/update_docs.bat`，会为新图片重新生成 `.webp`（需要 `pip install pillow`）；
3. 如果图片尺寸比例变了，把 `index.html` 里对应 `<img>` 的 `width`、`height` 改成新图的像素尺寸；
4. 上传 `assets/img/` 下变动的文件。

### 在线更新（推荐做法）

站点本身是静态文件，“在线更新”的关键是让发布自动化：

1. 把整个站点目录放进一个 Git 仓库（可以是 agent-insight 主仓库下的 `website/` 目录，也可以单独建仓）；
2. 配置流水线：每次合入主干后，自动运行 `python tools/update_docs.py`，再把站点同步到服务器（rsync / scp）或对象存储（ossutil、obsutil、coscmd 等命令行工具）；
3. 之后无论在 AtomGit 网页上直接编辑 Markdown、上传图片，还是本地提交 PR，合入后几分钟内官网自动更新；文档页的“在 AtomGit 上编辑”入口也就形成了闭环。

如果暂时不搭流水线，最简单的方式是：服务器上直接 `git pull` 站点仓库，nginx 指向该目录即可。

## 来源

- 官方代码仓：<https://atomgit.com/openeuler/agent-insight>（openEuler ANSE SIG，Apache-2.0）
- npm 包：`agent-insight`
