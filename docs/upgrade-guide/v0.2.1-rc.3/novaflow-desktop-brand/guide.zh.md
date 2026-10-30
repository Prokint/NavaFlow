---
kind: upgrade-guide
description: 桌面发布标签、安装包名称与应用标识统一使用 NovaFlow 品牌。
---

# NovaFlow 桌面发布标识

[English](guide.md) | 中文

## 变更

桌面发布使用 `novaflow-v<版本>` 标签、`novaflow-*` 安装包文件名和 `com.novaflow.desktop` 应用标识。发布工作流为 [novaflow-desktop-release.yml](../../../../.github/workflows/novaflow-desktop-release.yml)。依赖旧品牌发布名称的自动化需要随工作流调整。仓库仍为 `Prokint/NavaFlow`。

新安装使用 `~/.novaflow` 和系统应用数据目录下的 `novaflow`。已有桌面数据与账号设置保留原路径。已记录的模型路由通过兼容别名继续调用，新模型选择使用 NovaFlow 路由。会话文件和加密账号记录不会被改写。

实现可选桌面授权扩展的服务器需要接受 `novaflow-desktop` 客户端标识。标准 New API 的账号会话登录和所选中转站地址保持不变。

## 迁移

1. 将发布自动化与下载引用改为 NovaFlow 标签和文件名格式。发布前为 `com.novaflow.desktop` 配置签名身份。
2. 与旧版共用已有数据时，先退出旧桌面应用，再启动新构建。保留显式设置的 `DSH_HOME`，新构建仍会遵循该设置。
3. 确认账号、工作区与已有对话均可见。新安装应创建 NovaFlow 目录。原 DeepSeek Harness 的数据和系统 `dsh` 命令保持独立。
