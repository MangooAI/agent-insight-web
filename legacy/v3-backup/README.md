# Agent Insight 产品门户

Agent Insight 官方产品门户静态站点:首页 / 安装 / 开发(SIG)/ 文档中心。
设计延续"仪器风"设计语言;安装步骤与文档均由 **Markdown 驱动**,社区改 md 即更新站点。

## 本地预览

```bash
# 方式一:双击
serve.bat

# 方式二:手动
python -m http.server 8000
```

访问 <http://localhost:8000>。
> 必须通过 HTTP 访问:页面用 fetch 加载 Markdown,直接双击 HTML(file://)会被浏览器拦截,页面上也会给出提示。

## 目录结构

```text
├─ index.html              首页(Banner、长图、功能、集成矩阵、加入项目)
├─ install.html            安装页(下载卡片 + 平台 Tab,内容读 md)
├─ dev.html                开发页(SIG 简介、参与方向、参与路径、Roadmap)
├─ docs.html               文档中心(目录树 + 全文搜索 + md 渲染)
├─ assets/
│  ├─ css/tokens.css       Hallmark Cobalt 主题令牌
│  ├─ css/base.css         Hallmark 基础规则(Floor)
│  ├─ css/portal.css       门户样式(首行是 Hallmark stamp)
│  ├─ js/field.js          首页 ASCII 字符场(canvas)
│  ├─ js/site.js           导航 / 复制 / 切换 / Markdown 加载
│  ├─ js/docs.js           文档树 / Hash 路由 / 全文搜索
│  ├─ vendor/marked.min.js Markdown 渲染器(本地,v12.0.2)
│  ├─ img/logo-light.svg   官方 Logo(来自 sucai)
│  ├─ img/product/*.png    真实产品截图(来自官方胶片 pptx)
│  └─ img/docs/**          文档内图片(随仓库 docs/images 同步)
├─ content/
│  ├─ install/*.md         安装步骤(Docker / OpenShift 为仓库原文,source 为本地维护)
│  └─ docs/                52 篇真实文档(同步自 atomgit docs/zh)+ manifest.json
├─ serve.bat               Windows 一键预览
└─ legacy/index-v1-backup.html   旧版单页备份
```

## 如何更新内容(不改代码)

| 要更新什么 | 改哪里 |
| --- | --- |
| 安装步骤 | `content/install/*.md` |
| 新增/修改文档 | `content/docs/*.md` + 在 `manifest.json` 中登记(不登记不会出现在目录与搜索中) |
| 文档分组/顺序/关键词 | `content/docs/manifest.json` |
| 仓库地址、Releases、版本号等全站链接 | `assets/js/portal.js` 顶部 `window.SITE` |
| 首页文案/功能卡片 | `index.html`(静态 HTML) |
| SIG 方向 / 路线图 | `dev.html` |

### 新增一篇文档的完整步骤

1. 在 `content/docs/` 新建 `16-xxx.md`;
2. 打开 `content/docs/manifest.json`,在对应分组 `items` 中加入:
   ```json
   { "id": "my-doc", "title": "我的文档", "en": "My Doc", "file": "16-xxx.md", "keywords": "搜索关键词" }
   ```
3. 刷新页面即可,搜索自动生效。

## 常用约定

- 文档内可以互相链接:`[文本](../docs.html#/quickstart)`(hash 路由);
- 代码块自动带语言标识与 COPY 按钮;引用块 `>` 默认是提示样式;
- 图片放入 `assets/img/` 后用相对路径引用:`![说明](../assets/img/xxx.png)`;
- 版本号、下载地址一律以 [AtomGit Releases](https://atomgit.com/openeuler/agent-insight/releases) 为准,门户不硬编码版本。

## 部署

纯静态站点,任何静态托管均可(nginx、GitHub/GitCode Pages、对象存储 + CDN):
把本目录原样上传,入口 `index.html`。注意保持 `content/` 路径不变(前端按相对路径 fetch)。

## 来源说明

- 官方代码仓:<https://atomgit.com/openeuler/agent-insight>(openEuler / SIG-Intelligence,Apache-2.0)
- 门户视觉资产(banner / 长图 / 流程图)为本仓库手绘 SVG,可自由替换为产品真实截图。
