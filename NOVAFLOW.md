# NovaFlow 开发与维护

本仓库名为 **NavaFlow**，产品界面使用 **NovaFlow**。代码基于 [HalluCodex](https://github.com/AkumaRealLabs/hallucodex-desktop) 的 `hallucodex-v0.1.10` 标签；其上游是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。原 Git 历史、MIT 许可证、第三方声明和 logo 均保留。

## 当前定制

应用名称、原生菜单、账号页、首页、提示文案和打包程序名已改为 NovaFlow。技术包名、协议标识和数据目录继续兼容 HalluCodex：`~/.hallucodex` 与 Electron 的 `hallucodex` 用户数据目录。原 DeepSeek Harness 的 `~/.dsh` 和系统中的 `dsh` 命令不需要修改。NovaFlow 与原 HalluCodex 共用数据，切换时先退出另一份应用。

源码的更新检查和打包更新配置指向 `Prokint/NavaFlow`，不再读取原 HalluCodex 更新源。私有仓库没有匿名可读的 Release 时不会提供更新。继承的发行标签前缀及文件名仍为 `hallucodex-v*`、`hallucodex-*`，正式发版前需统一调整发布工作流、安装器元数据及更新解析器。

## 开发

需要 Node.js `^22.19.0` 或 `>=24`、pnpm（版本见 `package.json`），macOS 原生构建还需要兼容的 Xcode Command Line Tools。

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run dev:desktop
```

`dev:desktop` 会准备开发运行时并启动独立开发实例。已有构建时可以运行 `pnpm run start:desktop`。首次运行时按桌面开发指南准备运行时依赖，完整说明见 [桌面应用文档](apps/desktop/README.zh.md) 和 [开发指南](docs/development.zh.md)。

本机 Command Line Tools 默认 SDK 与链接器不兼容时，可仅对本次命令指定已安装的兼容 SDK，不修改系统设置：

```sh
SDKROOT=/Library/Developer/CommandLineTools/SDKs/MacOSX15.4.sdk pnpm run build
```

## 代码入口

| 路径 | 用途 |
|---|---|
| `apps/desktop/src` | 桌面窗口、菜单、账号和更新 |
| `apps/desktop/src/hallucodex` | 服务器地址、授权、模型目录、请求代理 |
| `apps/desktop-host/src/hallucodex.ts` | 模型协议适配 |
| `apps/desktop/scripts/electron-builder-config.mjs` | 应用名称与打包配置 |
| `packages/client/ui-brand-official` | 首页与账号入口品牌界面 |
| `packages/llm/llm-pi-ai` | 自定义模型提供方能力 |
| `customizations/novaflow/rebrand-installed.py` | 最初本地安装包品牌修改的可复现工具 |

## 自有中转站

当前仍沿用原服务设置，没有接入自有中转站。桌面账号模式要求服务器支持 `/api/desktop/v1` 授权、分组、模型目录和余额接口。普通兼容模型 API 的 Base URL 与 API Key 需要恢复或新增自定义提供方入口；不能仅修改默认域名。后续应先确定中转站接口与登录方式，再验证流式响应、工具调用、取消和上下文容量。

## Git 与发布

`origin` 指向本仓库，`upstream` 指向 HalluCodex；同步上游时先在独立分支合并、检查品牌改动并运行相关验证。现有工作流继承自上游，需要在维护者确认目标、标签和权限后再手动发版。GitHub Actions 的签名证书和发布密钥需要在本仓库重新配置，未从上游复制。

```sh
git remote add upstream https://github.com/AkumaRealLabs/hallucodex-desktop.git
git fetch upstream --tags
git switch -c codex/sync-upstream
```

不提交 `.env`、密钥、账号数据、`node_modules`、本地应用包或构建缓存。版权与依赖声明见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
