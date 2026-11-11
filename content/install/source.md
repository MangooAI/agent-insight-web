# 源码构建

> 适用场景:二次开发、参与社区贡献、需要定制构建。源码托管于 AtomGit 官方代码仓。

## 第 1 步:克隆仓库

```bash
git clone https://atomgit.com/openeuler/agent-insight.git
cd agent-insight
```

也可以前往[官方代码仓](https://atomgit.com/openeuler/agent-insight)页面下载 Release 源码包。

## 第 2 步:安装依赖

```bash
npm install
```

部分可选能力依赖额外的运行时,安装过程中依赖会提示;按提示补齐即可。

## 第 3 步(可选):构建 Trae IDE 采集扩展

```bash
(cd scripts/trae-collector && npm install && npm run build)
```

仅在需要 Trae IDE 采集器时构建。

## 第 4 步:启动服务

```bash
bash scripts/start.sh
```

- 开发调试使用:`bash scripts/develop_start.sh`
- 停止服务:`bash scripts/stop.sh`

## 第 5 步:验证

访问 `http://localhost:3000`,执行一次小型 Agent 任务,确认执行列表中出现对应会话。

## 参与贡献

源码安装即开发环境。改动代码后请运行测试再提交:

```bash
npm run test
```

完整的贡献流程(CLA、分支、PR 规范)见[开发页](../dev.html)与[搭建开发环境](../docs.html#/dev-setup)。
