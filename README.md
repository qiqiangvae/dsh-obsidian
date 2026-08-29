# dsh-obsidian

[![npm version](https://img.shields.io/npm/v/@qiqiangvae/dsh-obsidian)](https://www.npmjs.com/package/@qiqiangvae/dsh-obsidian)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

把 Obsidian 变成「自组织 AI 第二大脑」的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 单插件。

在 npm 上发布为 [`@qiqiangvae/dsh-obsidian`](https://www.npmjs.com/package/@qiqiangvae/dsh-obsidian)。

中文 | [English](./README.en.md)

对标 [AgriciDaniel/claude-obsidian](https://github.com/AgriciDaniel/claude-obsidian)（MIT），
基于 LLM Wiki 模式（Andrej Karpathy）。
合并了 `dsh-plugin-wiki-skills` + `dsh-plugin-wiki-tools` 两个上游插件——详见 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。

## 为什么做这个

两个上游 DSH 插件都很棒，但有几个问题：

1. **DSH 正在快速迭代，经常破坏公开的 cordis API。** 一旦破坏，两个插件就停止加载，而原维护者的更新节奏跟不上框架。
2. **把 skills 和 tools 拆成两个插件，架构上没错，但对个人使用不友好。** 你几乎总是两个都要。

所以：合成一个插件、统一版本，并提供清晰的 v2.x 升级路线
（见 [`PORTING_PLAN.md`](./PORTING_PLAN.md)）。

## 安装

前置条件：

- DSH 0.x 或更新（带 `dsh plugin` CLI），Node ≥ 22.19
- 磁盘上有一个 Obsidian vault

### 从 npm 安装（推荐）

```bash
# 1. 添加插件
dsh plugin --profile web add @qiqiangvae/dsh-obsidian

# 2. 在你 profile 的 cordis.patch.yml 里配置 vault 路径
#    (~/.dsh/profiles/web/cordis.patch.yml)
#
#   - id: dsh-obsidian
#     config:
#       vaultPath: /absolute/path/to/your/obsidian/vault
#       # 可选：
#       # typeFolders: { domain: "wiki/areas" }
#       # maxQueryResults: 10
#
# 3. 重启 DSH
dsh web

# 4. （可选）初始化一个全新 vault
#    在 DSH 里运行 wiki_scaffold 工具，参数 { template: "default", apply: true }
```

锁定某个具体版本：

```bash
dsh plugin --profile web add @qiqiangvae/dsh-obsidian@0.1.0
```

### 从 GitHub 安装

```bash
dsh plugin --profile web add github:qiqiangvae/dsh-obsidian
```

> **为什么是 scoped 包名？** 非 scoped 的 `dsh-obsidian` 已被另一个无关的
> vault 文件系统插件（[mingzeng21/dsh-obsidian](https://github.com/mingzeng21/dsh-obsidian)）
> 占用。本包以 `@qiqiangvae/dsh-obsidian` 发布以避免撞名。

### 从本地代码安装（开发时）

```bash
git clone git@github.com:qiqiangvae/dsh-obsidian.git
cd dsh-obsidian
pnpm install      # 开发依赖（typescript、@types）
pnpm run build    # 编译 src/ → lib/
dsh plugin --profile web add link:$(pwd)
```

## 你能得到什么

### 工具（注册在 `ctx.tools`）

| 工具 | 作用 |
| ---- | ---- |
| `wiki_query` | BM25 检索，返回片段 + 链接图；quick 模式直接返回 hot + index |
| `wiki_write` | 单页写入，含 type 路由、frontmatter 补全、index/log 记账、source-hash 去重跳过 |
| `wiki_lint` | 健康检查：重复、死链、孤儿页、frontmatter 缺失、空章节、失效 index/hot |
| `wiki_scaffold` | 初始化 LLM Wiki 目录结构（默认 dry-run） |
| `wiki_rename` | 重命名页面（含机器页保护） |
| `wiki_list` | 列出所有页面标题 |

### 技能（注册在 `ctx.skills`）

来自 Lion-1209 v1 套件：

- `wiki` — vault 脚手架与路由
- `wiki-ingest` — 把来源捕获进 vault
- `wiki-query` — 带引用地从 vault 回答问题
- `wiki-lint` — 健康检查工作流
- `save` — 归档对话洞察
- `think` — 10 原则推理循环

外加 kepano 的参考技能（Obsidian Flavored Markdown、Bases）与 DSH 风格扩展：

- `obsidian-markdown`、`obsidian-bases`、`json-canvas`、`defuddle`、`obsidian-cli`

## 开发

```bash
pnpm install
pnpm run build    # tsc → lib/
pnpm test         # node --test test/
```

在 `src/` 下改代码，构建到 `lib/`，重启 DSH。开发期间想热更新，再在 DSH
checkout 里跑 `pnpm run dev:web`。

## 许可证

MIT。见 [`LICENSE`](./LICENSE) 与 [`ATTRIBUTION.md`](./ATTRIBUTION.md)。
