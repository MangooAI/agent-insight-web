# v7: hero as full-bleed generated art (text baked), nav left + code dropdown, rotator = 3 diagrams, features = 4 capabilities
import re

# ---------- CSS ----------
p = 'assets/css/site.css'
s = open(p, encoding='utf-8').read()

# 导航:链接靠左,右侧"代码"下拉
s = s.replace('.nav-in{display:flex;align-items:center;gap:32px;min-height:68px}',
              '.nav-in{display:flex;align-items:center;gap:28px;min-height:72px}')
s = s.replace('.nav-links{display:flex;gap:6px;margin-left:auto}',
              '.nav-links{display:flex;gap:6px;margin-left:8px}')
s = s.replace('.nav-right{display:flex;align-items:center;gap:16px;flex:none;font-size:14px;font-weight:500;color:var(--ink-2)}',
              '.nav-right{display:flex;align-items:center;gap:16px;flex:none;margin-left:auto;font-size:14px;font-weight:500;color:var(--ink-2)}')
s = s.replace('/* hero */',
'''/* 代码下拉 */
.nav-drop{position:relative}
.nav-drop-btn{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:var(--ink-2);padding:10px 12px;border-radius:10px;background:none;border:none;cursor:pointer;transition:color .2s}
.nav-drop:hover .nav-drop-btn,.nav-drop:focus-within .nav-drop-btn{color:var(--blue)}
.nav-drop-btn .caret{transition:transform .25s var(--ease)}
.nav-drop:hover .caret,.nav-drop:focus-within .caret{transform:rotate(180deg)}
.nav-drop-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:180px;background:var(--white);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);padding:8px;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .2s,transform .25s var(--ease),visibility 0s linear .2s;z-index:150}
.nav-drop:hover .nav-drop-menu,.nav-drop:focus-within .nav-drop-menu{opacity:1;visibility:visible;transform:none;transition:opacity .2s,transform .25s var(--ease)}
.nav-drop-menu a{display:block;padding:10px 14px;font-size:14px;border-radius:10px;color:var(--ink-2);text-decoration:none}
.nav-drop-menu a:hover{background:var(--bg-soft);color:var(--blue)}

/* hero */''')

# hero:整图背景 + 按钮悬浮左下
s = s.replace('''.hero{background:linear-gradient(180deg,#FFF 0%,var(--bg-blue) 78%,#FFF 100%);border-bottom:1px solid var(--line);overflow:clip}
.hero-in{display:block;padding-block:clamp(48px,7vh,80px) clamp(32px,4vh,48px);text-align:center}
.hero-in h1{margin-inline:auto}
.hero-in .hero-lede{margin-inline:auto}
.hero-in .hero-cta{justify-content:center}''',
'''.hero{position:relative;border-bottom:1px solid var(--line);overflow:clip;background:var(--bg-soft)}
.hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center}
.hero-in{position:relative;z-index:1;min-height:clamp(460px,46vw,900px);display:flex;align-items:flex-end;padding-bottom:clamp(48px,6vh,88px)}
.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:760px){
  .hero-bg{position:static;display:block;width:100%;height:auto;object-fit:contain}
  .hero-in{min-height:0;display:block;padding:24px 0 0}
}''')

# rotator 幻灯片:contain 适配矢量图
s = s.replace('.rotator-slide img{width:100%;height:100%;object-fit:cover;object-position:center}',
              '.rotator-slide img{width:100%;height:100%;object-fit:contain;object-position:center}')

# 特性四卡
s = s.replace('.feat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}',
              '.feat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}')
s = s.replace('  .feat-grid,.dir-grid{grid-template-columns:repeat(2,minmax(0,1fr))}',
              '  .feat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}\n  .dir-grid{grid-template-columns:repeat(2,minmax(0,1fr))}')
open(p, 'w', encoding='utf-8').write(s)
print('css ok')

# ---------- 四页导航 ----------
drop = '''<div class="nav-drop">
        <button type="button" class="nav-drop-btn" aria-haspopup="true">代码
          <svg class="caret" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="nav-drop-menu">
          <a data-site="repo" href="#" target="_blank" rel="noopener">AtomGit 仓库</a>
          <a data-site="releases" href="#" target="_blank" rel="noopener">更新日志</a>
          <a data-site="issues" href="#" target="_blank" rel="noopener">Issues</a>
        </div>
      </div>'''
for pg in ['index.html', 'install.html', 'dev.html', 'docs.html']:
    s = open(pg, encoding='utf-8').read()
    s = re.sub(r'<a data-site="repo" href="#" target="_blank" rel="noopener">AtomGit</a>', drop.replace('\\', '\\\\'), s, count=1)
    open(pg, 'w', encoding='utf-8').write(s)
print('nav ok')

# ---------- index hero + rotator + features ----------
s = open('index.html', encoding='utf-8').read()

old = re.search(r'<header class="hero">[\s\S]*?</header>', s).group(0)
new = '''<header class="hero">
  <img class="hero-bg" src="assets/img/hero-art.png" alt="" width="1920" height="900" fetchpriority="high">
  <div class="wrap hero-in">
    <h1 class="visually-hidden">让生产级 Agent,跑得稳 · 看得清 · 测得全 · 诊得准</h1>
    <p class="visually-hidden">Agent Insight 构建覆盖 Agent 全生命周期的可靠性保障能力:行为可观测、质量可度量、故障可定位、能力可进化,越用越好。</p>
    <div class="hero-cta">
      <a class="btn btn-blue" href="install.html">立即安装</a>
      <a class="btn btn-line" href="docs.html">在线文档</a>
    </div>
  </div>
</header>'''
s = s.replace(old, new)

old = re.search(r'<div class="hero-banner">[\s\S]*?</div>\s*\n</section>', s)
# rotator 整段替换(从 hero-banner 到 </section> 前)
rot_old = re.search(r'  <div class="hero-banner">[\s\S]*?</section>\n</header>|  <div class="hero-banner">[\s\S]*?(?=<section class="sec")', s)
rot_new = '''<div class="wrap hero-banner">
    <div class="sec-head" style="margin-bottom:24px">
      <h2 style="font-size:clamp(22px,2.4vw,30px)">一张图看懂 Agent Insight</h2>
    </div>
    <div class="rotator" data-rotator data-caps='["系统架构 · 平台服务 + 客户端节点 + 评测节点,已对接 17 个主流 Agent 平台","应对策略 · 检测、恢复、诊断、优化闭环,数据与证据支撑全环节","生产级可靠性 · 持续正确 × 运行一致 × 出错可发现 × 根因可定位 × 系统可恢复"]'>
      <div class="rotator-track">
        <figure class="rotator-slide is-active">
          <img src="assets/img/diagram-arch.svg" alt="系统架构图:Agent Insight 平台服务连接客户端节点与评测节点" width="1600" height="640" fetchpriority="high">
        </figure>
        <figure class="rotator-slide">
          <img src="assets/img/diagram-loop.svg" alt="应对策略图:故障检测、故障恢复、根因诊断、闭环优化四步闭环" width="1600" height="640" loading="lazy">
        </figure>
        <figure class="rotator-slide">
          <img src="assets/img/diagram-formula.svg" alt="生产级可靠性公式:持续正确 × 运行一致 × 出错可发现 × 根因可定位 × 系统可恢复" width="1600" height="640" loading="lazy">
        </figure>
      </div>
      <div class="rotator-dots" role="group" aria-label="切换图解">
        <button type="button" aria-label="系统架构图" aria-selected="true"></button>
        <button type="button" aria-label="应对策略图" aria-selected="false"></button>
        <button type="button" aria-label="生产级可靠性公式" aria-selected="false"></button>
      </div>
    </div>
    <p class="rotator-cap"><span>系统架构 · 平台服务 + 客户端节点 + 评测节点,已对接 17 个主流 Agent 平台</span></p>
  </div>
</header>

<section class="sec" id="features">'''
assert rot_old, 'rotator block not found'
s = s.replace(rot_old.group(0), rot_new)

# features 四卡(官方文案)
old = re.search(r'<div class="sec-head">\s*<h2>关键能力</h2>[\s\S]*?</div>\s*<div class="feat-grid">[\s\S]*?</div>\s*</div>\s*</section>', s).group(0)
new = '''<div class="sec-head">
      <h2>关键能力</h2>
      <p>观测、验证、防护、改进闭环:能完成一次任务,不等于能持续、可控地交付。</p>
    </div>
    <div class="feat-grid">
      <div class="feat reveal">
        <div class="feat-ico" style="background:var(--blue-soft);color:var(--blue)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3"/></svg></div>
        <h3>观测</h3>
        <p>看清执行过程:还原 Agent 层、MaaS 网关层到推理层的端到端执行链路,多视图全局分析 Agent 行为轨迹。</p>
      </div>
      <div class="feat reveal" data-d="1">
        <div class="feat-ico" style="background:var(--teal-soft);color:var(--teal)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 19V10M10 19V5M16 19v-6M22 19H2"/></svg></div>
        <h3>验证</h3>
        <p>量化能力与风险:结合多维评测和故障注入,评估任务效果、运行稳定性与容错恢复能力,验证优化成效。</p>
      </div>
      <div class="feat reveal" data-d="2">
        <div class="feat-ico" style="background:var(--violet-soft);color:var(--violet)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg></div>
        <h3>防护</h3>
        <p>及时发现并处置异常:通过运行时故障感知与分级干预,阻断故障传播,支持任务恢复,让执行过程稳定可控。</p>
      </div>
      <div class="feat reveal" data-d="3">
        <div class="feat-ico" style="background:var(--amber-soft);color:var(--amber)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z"/></svg></div>
        <h3>改进</h3>
        <p>让问题驱动持续优化:基于轨迹证据定位根因,结合评测与诊断结果实现策略调优、可靠性增强,持续提升 Agent 能力。</p>
      </div>
    </div>
  </div>
</section>'''
s = s.replace(old, new)

# 旧 hero-banner 已被并入 header;移除残留(section 头重复)
open('index.html', 'w', encoding='utf-8').write(s)
print('index ok')
