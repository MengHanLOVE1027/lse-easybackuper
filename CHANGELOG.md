# Changelog

EasyBackuper 所有重要变更记录。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

---

## [0.4.8-beta.1] - 2026-08-12

### ✨ 新增 · Added
- i18n 国际化支持（zh_CN / en_US），通过配置文件 `Language` 字段切换语言

### 🔧 修复 · Fixed
- 修复版本号配置，确保版本正确显示
- 更新 `update_versions.json` 中各版本的 `download_url` 为 Release 下载链接

### 🏗️ 构建 · Build
- 添加 CI 工作流（Lint & Build Check）
- 优化 PR 生成内容和 Release 说明，支持从 CHANGELOG.md 提取分类总结

### 📝 文档 · Docs
- 更新 README 和 README_EN，添加版本和下载统计徽章

---

## [0.4.7] - 2026-08-09

### 🔧 修复 · Fixed
- 修复版本号配置，确保 0.4.7 正确显示
- 修复部分 bug，优化备份状态管理
- 更新插件重载指令，修正为 `ll reload EasyBackuper`

### 📝 文档 · Docs
- 更新 README 和 README_EN，添加版本和下载统计徽章

---

## [0.4.6] - 2026-08-09

### 🔧 修复 · Fixed
- 修复部分 bug，优化备份状态管理
- 修复 cron 调度器触发时机问题

---

## [0.4.6-beta.5] - 2026-08-09

### 🔧 修复 · Fixed
- 修复部分 bug
- 优化 cron 调度器

---

## [0.4.6-beta.4] - 2026-08-09

### 🔧 修复 · Fixed
- 修复部分 bug

---

## [0.4.6-beta.3] - 2026-08-09

### 🔧 修复 · Fixed
- 修复部分 bug

### 🏗️ 构建 · Build
- 优化构建流程

---

## [0.4.6-beta.2] - 2026-08-09

### 🔧 修复 · Fixed
- 修复部分 bug

---

## [0.4.6-beta.1] - 2026-08-09

### ✨ 新增 · Added
- 添加 GitHub Actions 工作流，支持自动 PR 创建和发布
- 添加下载 7za.exe 步骤并更新构建流程

### 🔧 修复 · Fixed
- 修复部分 bug

### 🏗️ 构建 · Build
- PyInstaller 编译时添加 Pillow 依赖

---

## [0.4.5] - 2026-03-03

### 🔧 修复 · Fixed
- 修复部分 bug
- 更新下载链接至最新的原始文件地址

---

## [0.4.4] - 2026-03-02

### ✨ 新增 · Added
- 适配 EasyCheckUpdate 插件，支持自动检查更新
- 支持 BStats 统计
- 多彩日志输出

### 🔧 修复 · Fixed
- 修复部分 bug

### 🗑️ 移除 · Removed
- 不再支持多语言（过于臃肿）

---

## [0.4.3] - 2025-02-04

### ✨ 新增 · Added
- 新增回档功能
- 多线程并发处理
- 自定义备份格式
- 自定义日志功能

---

## [0.4.0] - 2025-01-12

### ✨ 新增 · Added
- 添加截断文件功能及辅助 Python 程序（`mhlove-truncate`）

### 🔧 修复 · Fixed
- 修复自动清理排序问题
- 规范文件名中的日期格式
- 更详细的 Debug 日志输出
- 备份时显示文件名及大小提示

### 📦 分发 · Distribution
- 重新被 Bedrinth 收录

---

## [0.3.0] - 2024-12-14

### ✨ 新增 · Added
- 支持在备份后清理冗余备份压缩包
- 支持选择清理模式：开服时清理、备份后清理、开服和备份同时清理

### 🏗️ 重构 · Refactored
- 模块化插件结构
- 补全参数注释和类型标注

---

## [0.2.9] - 2024-08-05

### 🔧 修复 · Fixed
- 修复部分问题，优化代码稳定性

---

## [0.2.8] - 2024-07-23

### 📝 其他 · Misc
- 添加 AGPLv3 许可证
- 更新 README 文档
- 更新 tooth.json（取消对 LeviLamina 的版本限定）

---

## [0.1.0] - 2024-07-10

### 🎉 初始发布 · Initial Release
- 轻量级 Minecraft 服务器热备份
- 支持定时自动备份（cron 表达式）
- 支持手动触发备份
- 7z 高压缩比备份
- 自动清理过期备份

---

[0.4.7]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.6...v0.4.7
[0.4.6]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.5...v0.4.6
[0.4.6-beta.5]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.6-beta.4...v0.4.6-beta.5
[0.4.6-beta.4]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.6-beta.3...v0.4.6-beta.4
[0.4.6-beta.3]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.6-beta.2...v0.4.6-beta.3
[0.4.6-beta.2]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.6-beta.1...v0.4.6-beta.2
[0.4.6-beta.1]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.5...v0.4.6-beta.1
[0.4.5]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.4...v0.4.5
[0.4.4]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.3...v0.4.4
[0.4.3]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.4.0...v0.4.3
[0.4.0]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.2.9...v0.3.0
[0.2.9]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.2.8...v0.2.9
[0.2.8]: https://github.com/MengHanLOVE1027/lse-easybackuper/compare/v0.1.0...v0.2.8
[0.1.0]: https://github.com/MengHanLOVE1027/lse-easybackuper/releases/tag/v0.1.0
