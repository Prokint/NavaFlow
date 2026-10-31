# 本地安装包改名工具

[English](README.md) | 中文

该工具为已有的上游 macOS 安装包应用 NovaFlow 显示品牌，供复现或回溯。日常二次开发以本仓库 TypeScript 源码为准。

```sh
python3 customizations/novaflow/rebrand-installed.py \
  --source-app /path/to/Upstream.app --source-name Upstream \
  --output-app /path/to/local-output/NovaFlow.app
```

要求 macOS、Python 3 和 Node.js。输出目录必须不存在。工具复制应用，替换品牌文案，保留图片、协议和数据目录，更新 ASAR 完整性清单并停用原更新源。它不会更改输入应用，不读取本机账号或会话。

输出应用及其辅助应用仍需由维护者使用 `codesign` 进行本地签名；正式分发另需完成签名、公证与实际安装验收。不要将输出应用或 `changes.json` 构建报告提交到源码仓库。

`apply-built.py --app /path/to/NovaFlow.app --backup /path/to/new-backup` 可替换已完全退出的本地安装包中的第一方构建模块，记录备份，并更新运行时与 ASAR 完整性。安装包仍使用旧 Host 模块文件名时，传入 `--previous-module-name <basename>`，工具会重命名对应的两个归档条目，并更新运行时清单和包导出。备份目录必须不存在。启动前需重新签名应用。

## 当前 Logo 资源

所选黑灰交扣图形位于 `design/brand/novaflow-symbol-transparent.png`，原始选择图和抠图提示词一并保存。运行 `node customizations/novaflow/prepare-logo.mjs` 可生成桌面图标、侧栏标志、favicon 和安装器图片；再运行桌面文档中的 Linux 和托盘渲染命令。图形使用白色圆角底板，浅色和深色主题共用同一份资源。

`apply-logo.py` 可将准备好的资源更新到已退出的本地 macOS 应用，使用 `--app`、`--icns` 和一个尚不存在的 `--backup` 目录。该工具保留原包备份，更新嵌入标志与完整性清单；之后须重新签名再启动。源码构建则直接由 electron-builder 使用新 PNG 生成平台图标。
