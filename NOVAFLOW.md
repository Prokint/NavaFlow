# NovaFlow 开发与维护

本仓库名为 **NavaFlow**，产品界面使用 **NovaFlow**。代码基于 [HalluCodex](https://github.com/AkumaRealLabs/hallucodex-desktop) 的 `hallucodex-v0.1.10` 标签；其上游是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。原 Git 历史、MIT 许可证和第三方声明均保留；Logo 使用已选定的黑灰交扣图形。

## 当前定制

应用名称、原生菜单、账号页、首页、提示文案和打包程序名已改为 NovaFlow。桌面、侧栏、首页、浏览器与安装器图标从 `design/brand/novaflow-symbol-transparent.png` 生成；可运行 `node customizations/novaflow/prepare-logo.mjs` 后重新执行桌面文档中的 Linux 和托盘渲染命令。技术包名、协议标识和数据目录继续兼容 HalluCodex：`~/.hallucodex` 与 Electron 的 `hallucodex` 用户数据目录。原 DeepSeek Harness 的 `~/.dsh` 和系统中的 `dsh` 命令不需要修改。NovaFlow 与原 HalluCodex 共用数据，切换时先退出另一份应用。

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

默认服务为 `https://api.lanjiaotrade.com`。点击“登录 NovaFlow → 登录并使用模型”，在隔离的登录窗口完成站点原有的账号验证后，应用自动加载该账号当前分组可用的模型；尚未选过模型时自动选择第一个可用模型。账号模式复用站点的登录会话和 `/pg/chat/completions`，无需创建、复制或填写 API Key。当前账号模式支持 Chat Completions 的流式对话和工具调用。

登录窗口直接使用站点的登录页面，保留站点自己的密码加密和多因素验证流程。主进程仅接收第一方 HttpOnly 刷新 Cookie，使用系统加密存储保存在独立的 `new-api-account` 目录；不保存密码、短期访问 Token 或管理 API Key。重启时自动恢复会话，退出登录时撤销本次站点会话。旧桌面授权目录保持独立，旧协议实现仍保留在源码中。模型目录和账户余额只向应用界面公开必要信息，模型请求通过受限的本地代理进入站点。

API Key 模式作为备用入口保留。在“模型与 API Key”或“设置 → 模型”中编辑 `NovaFlow API`，地址为 `https://api.lanjiaotrade.com/v1`，填写专用模型 Key 后获取模型并保存。Key 经 Host 凭据服务保存，配置仅引用 `NOVAFLOW_API_KEY`。该入口也支持其他 OpenAI Chat/Responses 或 Anthropic 兼容服务。DeepSeek 账号和遥测继续关闭，现有 DSH 应用与系统 `dsh` 命令不变。

中转站必须有可用上游渠道和账户额度。账号模式只展示站点明确声明支持 Chat Completions 且该账号分组允许的模型；缺少容量元数据时使用可调整的保守默认值（上下文 65536、输出 8192），已知模型优先使用适配器目录中的容量。账号模式不显示不存在的设备独立额度。

## Git 与发布

`origin` 指向本仓库，`upstream` 指向 HalluCodex；同步上游时先在独立分支合并、检查品牌改动并运行相关验证。现有工作流继承自上游，需要在维护者确认目标、标签和权限后再手动发版。GitHub Actions 的签名证书和发布密钥需要在本仓库重新配置，未从上游复制。

```sh
git remote add upstream https://github.com/AkumaRealLabs/hallucodex-desktop.git
git fetch upstream --tags
git switch -c codex/sync-upstream
```

不提交 `.env`、密钥、账号数据、`node_modules`、本地应用包或构建缓存。版权与依赖声明见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
