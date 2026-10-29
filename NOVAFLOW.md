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

默认中转地址为 `https://api.lanjiaotrade.com/v1`，客户端通过标准 API Key 接入。在应用菜单“模型与 API Key”或“设置 → 模型”中编辑 `NovaFlow API`，填写专用模型 Key，展开“自定义设置”，获取并选择模型后保存。默认不猜测服务器上的模型；模型目录为空时需要先发现或手动添加，再在对话选择器选择模型。管理员登录密码不能用作模型 Key。

Key 通过 Host 的凭据服务保存，配置仅引用 `NOVAFLOW_API_KEY`，不会写入 YAML 或源码。提供方编辑器支持修改 Base URL、模型和协议；OpenAI Chat/Responses 使用含 `/v1` 的地址，Anthropic Messages 使用站点根地址。新部署不恢复原桌面 OAuth，也不请求 `/api/desktop/v1` 接口。DeepSeek 账号和遥测服务继续关闭，系统中的现有 DSH 应用及 `dsh` 命令不变。

中转站必须配置可用上游渠道才能返回模型并处理请求。没有渠道或专用 Key 时只能验证客户端配置和模拟协议，无法完成真实模型对话测试。

## Git 与发布

`origin` 指向本仓库，`upstream` 指向 HalluCodex；同步上游时先在独立分支合并、检查品牌改动并运行相关验证。现有工作流继承自上游，需要在维护者确认目标、标签和权限后再手动发版。GitHub Actions 的签名证书和发布密钥需要在本仓库重新配置，未从上游复制。

```sh
git remote add upstream https://github.com/AkumaRealLabs/hallucodex-desktop.git
git fetch upstream --tags
git switch -c codex/sync-upstream
```

不提交 `.env`、密钥、账号数据、`node_modules`、本地应用包或构建缓存。版权与依赖声明见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
