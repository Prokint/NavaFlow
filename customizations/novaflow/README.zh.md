# 本地安装包改名工具

[English](README.md) | 中文

该工具保存最初在 macOS 上将 HalluCodex 0.1.10 改为 NovaFlow 的安装包修改步骤，供复现或回溯。日常二次开发以本仓库 TypeScript 源码为准。

```sh
python3 customizations/novaflow/rebrand-installed.py \
  --source-app /path/to/HalluCodex.app \
  --output-app /path/to/local-output/NovaFlow.app
```

要求 macOS、Python 3 和 Node.js。输出目录必须不存在。工具复制应用，替换品牌文案，保留图片、协议和数据目录，更新 ASAR 完整性清单并停用原更新源。它不会更改输入应用，不读取本机账号或会话。

输出应用及其辅助应用仍需由维护者使用 `codesign` 进行本地签名；正式分发另需完成签名、公证与实际安装验收。不要将输出应用或 `changes.json` 构建报告提交到源码仓库。
