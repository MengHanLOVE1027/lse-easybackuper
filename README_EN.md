<div align="center">

![LSE-EasyBackuper](https://socialify.git.ci/MengHanLOVE1027/lse-easybackuper/image?custom_language=JavaScript&description=1&font=Inter&forks=1&issues=1&language=1&logo=https://zh.minecraft.wiki/images/Chiseled_Bookshelf_%28stage_6%29_%28S%29_JE1.png?bbb31&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Auto)
<h3>LSE-EasyBackuper</h3>

<p>
  <b>A lightweight, high-performance, and comprehensive hot backup plugin for Minecraft servers based on LeviLamina. </b>

Powered by LeviLamina.<br>
</p>
</div>
<div align="center">

[![README](https://img.shields.io/badge/README-中文|Chinese-blue)](README.md) [![README_EN](https://img.shields.io/badge/README-英文|English-blue)](README_EN.md)

[![Github Version](https://img.shields.io/github/v/release/MengHanLOVE1027/lse-easybackuper)](https://github.com/MengHanLOVE1027/lse-easybackuper/releases) [![GitHub License](https://img.shields.io/badge/License-AGPL%203.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0) [![LSE Version](https://img.shields.io/badge/LSE-0.10.2+-yellow.svg)](https://github.com/LeviLamina/LeviLamina) [![Platform](https://img.shields.io/badge/Platform-LeviLamina-9cf.svg)](https://levimc.org/) [![Downloads](https://img.shields.io/github/downloads/MengHanLOVE1027/lse-easybackuper/total.svg)](https://github.com/MengHanLOVE1027/lse-easybackuper/releases)

![](https://img.shields.io/github/v/release/MengHanLOVE1027/lse-easybackuper?style=flat-square&logo=github&color=orange&label=Version) ![](https://img.shields.io/github/downloads/MengHanLOVE1027/lse-easybackuper/total?style=flat-square&logo=github&color=33ccff&label=Downloads) ![](https://img.shields.io/github/languages/top/MengHanLOVE1027/lse-easybackuper?style=flat-square&logo=javascript&color=yellow) ![](https://img.shields.io/github/stars/MengHanLOVE1027/lse-easybackuper?style=flat-square&logo=github&color=yellow&label=Stars) ![](https://img.shields.io/github/last-commit/MengHanLOVE1027/lse-easybackuper?style=flat-square&color=lightgrey) ![](https://komarev.com/ghpvc/?username=MengHanLOVE1027&repo=lse-easybackuper&color=green&style=flat-square&label=Views)

</div>

---

## 📖 Introduction

LSE-EasyBackuper is a backup plugin specifically designed for LeviLamina servers, aiming to simplify the backup process, improve backup efficiency, and ensure data security. It supports automatic scheduled backups, intelligent cleanup, real-time notifications, multi-threaded acceleration, multi-format support, backup restoration, and multi-language support, providing server administrators with a comprehensive data protection solution.

---

## ✨ Core Features

| Feature              | Description                              |
| ----------------- | --------------------------------- |
| 🔄**Automatic Scheduled Backup** | Intelligent scheduled backup based on cron expressions      |
| 🧹**Intelligent Cleanup**     | Automatically clean old backups to save disk space      |
| 📢**Real-time Notifications**     | Send notifications to players before and after backup            |
| ⚡**Multi-threaded Acceleration**   | Parallel file processing, significantly improving backup speed    |
| 🗜️**Multi-format Support**   | Supports 7z, zip, tar.gz compression formats |
| 🔄**Backup Restoration**     | One-click restore backup, supports automatic restart        |
| 🌍**Multi-language Interface**   | Supports Chinese, English and other languages        |
| 📝**Complete Logging System** | Colored log output, daily log storage      |

---

## 🗂️ Directory Structure

```
Server Root/
├── logs/
│   └── EasyBackuper/                    # Log directory
│       └── easybackuper_YYYYMMDD.log    # Main log file
├── plugins/
│   └── EasyBackuper/                    # Plugin resource directory
│       ├── 7za.exe                      # 7z compression tool
│       ├── EasyBackuper.js              # Main plugin file
│       ├── config/
│       │   └── EasyBackuper.json        # Configuration file
│       └── langs/                       # Multi-language files
│           ├── zh_CN.json               # Simplified Chinese
│           └── en_US.json               # English
└── backup/                              # Backup file storage directory
```

---

## 🚀 Quick Start

### Installation Steps

1. **Download Plugin**
   - Download the latest version from [Release Page](https://github.com/MengHanLOVE1027/lse-easybackuper/releases)
   - Or get it from [MineBBS](https://www.minebbs.com/resources/easybackuper-eb-minecraft.7771/)

2. **Install Plugin**
   ```bash
   # Extract the plugin archive to the server plugins directory
   ```
   Or install using lip command:
   ```sh
   lip install github.com/MengHanLOVE1027/lse-easybackuper
   ```

3. **Install Dependencies**
   - Place `7za.exe`, `mhlove-truncate.exe` in the `plugins/lse-easybackuper/` directory (mhlove-truncate.exe can be obtained from the [Release Page](https://github.com/MengHanLOVE1027/lse-easybackuper/releases) or [MineBBS](https://www.minebbs.com/resources/easybackuper-eb-minecraft.7771/))

4. **Start Server**
   - Restart the server or use `/ll reload EasyBackuper` command
   - The plugin will automatically generate default configuration files

---

## ⚙️ Configuration Details

Configuration file location: `plugins/EasyBackuper/config/EasyBackuper.json`

### 📋 Main Configuration Items

```json
{
  // 🌐 Internationalization Settings
  "Language": "en_US",  // Options: zh_CN, en_US

  // 🗜️ Compression Configuration
  "Compression": {
    "method": "zip",  // Compression algorithm: 7z, zip, tar
    "exe_7z_path": "./plugins/EasyBackuper/7za.exe",  // 7z executable path
    "formats": {
      "7z": {
        "extension": ".7z",
        "compress_args": ["a", "-t7z", "-mx=5"],
        "extract_args": ["x", "-y"]
      },
      "zip": {
        "extension": ".zip",
        "compress_args": ["a", "-tzip", "-mx=5"],
        "extract_args": ["x", "-y"]
      },
      "tar": {
        "extension": ".tar.gz",
        "compress_args": ["a", "-ttar", "-mx=5"],
        "extract_args": ["x", "-y"]
      }
    }
  },

  // 📁 Executable File Paths
  "exe_7z_path": ".\\plugins\\EasyBackuper\\7za.exe",  // 7z compression tool path
  "exe_mhlove_truncate_path": ".\\plugins\\EasyBackuper\\mhlove-truncate.exe",  // Truncate tool path

  // 📁 Storage Path
  "BackupFolderPath": "./backup/",  // Backup file storage path

  // ⚡ Performance Configuration
  "Max_Workers": 4,  // Number of concurrent threads

  // 🧹 Auto Cleanup
  "Auto_Clean": {
    "Use_Number_Detection": {
      "Status": false,    // Enable auto cleanup
      "Max_Number": 5,   // Maximum number of backups to keep
      "Mode": 0          // 0=Clean after server start, 1=Clean after backup, 2=Clean on server start
    }
  },

  // ⏰ Scheduled Tasks
  "Scheduled_Tasks": {
    "Status": false,                // Enable scheduled backup
    "Cron": "*/30 * * * * *"      // Cron expression, every 30 seconds
  },

  // 📢 Notification Settings
  "Broadcast": {
    "Status": true,                // Enable broadcast notifications
    "Time_ms": 5000,              // Notification time before backup (milliseconds)
    "Title": "[OP]Backup starting soon~",
    "Message": "Backup will start in 5 seconds!",
    "Server_Title": "[Server]Never Gonna Give You UP~",
    "Server_Message": "Never Gonna Let You Down~",
    "Backup_success_Title": "Backup completed!",
    "Backup_success_Message": "Star service, connecting with love",
    "Backup_wrong_Title": "Excellent service, backup failed",
    "Backup_wrong_Message": "RT"
  },

  // 🔍 Debug Settings
  "Debug_MoreLogs": false,         // Enable detailed logs (console)
  "Debug_MoreLogs_Player": false,  // Enable detailed logs (player)
  "Debug_MoreLogs_Cron": false,   // Enable detailed logs (Cron tasks)

  // 🔄 Restore Configuration
  "Restore": {
    "backup_old_world_before_restore": true  // Backup current world before restore
  },

  // 📊 Data Statistics
  "Bstats": {
    "EnableModule": true,  // Enable BStats data statistics
    "logSentData": false,  // Log sent data
    "serverUUID": ""       // Server unique identifier (auto-generated)
  }
}
```

### ⏰ Cron Expression Examples

| Expression           | Description        |
| ---------------- | ----------- |
| `*/30 * * * * *` | Every 30 seconds  |
| `0 0 3 ? * *`    | Every day at 3 AM |
| `0 0 */2 ? * ?`  | Every 2 hours |
| `0 0 0 ? * MON`  | Every Monday at midnight  |

---

## 🎮 Command Manual

### Backup Management Commands

| Command             | Permission | Description               |
| ---------------- | ---- | ------------------ |
| `/backup`        | OP   | Execute manual backup immediately   |
| `/backup init`   | OP   | Reinitialize configuration file |
| `/backup reload` | OP   | Reload configuration file       |

### Restore Management Commands

| Command                   | Permission | Description                          |
| ---------------------- | ---- | ----------------------------- |
| `/restore list <number>` | OP   | Show all available backups (can specify number) |
| `/restore <index>`      | OP   | Restore specified backup                  |
| `/restore`             | OP   | Show restore help                  |

---

## 🔧 Advanced Features

### 🗜️ 7z Compression Configuration

1. **Download 7za.exe**
   ```bash
   # Download 7za.exe from 7-Zip official website
   # Place it in plugins/EasyBackuper/ directory
   ```

2. **Modify Configuration**
   ```json
   {
     "Compression": {
       "method": "7z",
       "exe_7z_path": "./plugins/EasyBackuper/7za.exe"
     }
   }
   ```

3. **Reload Configuration**
   ```bash
   /backup reload
   ```

### 🚀 Multi-threading Optimization Recommendations

| Server Type         | Recommended Threads | Description            |
| ------------------ | ---------- | --------------- |
| Small Server (1-2 cores) | 2-4        | Avoid excessive CPU usage |
| Medium Server (4 cores)   | 4-6        | Balance performance and resources  |
| Large Server (8+ cores)  | 6-8        | Maximize backup speed  |

> ⚠️ **Note**: Too many threads may cause server lag, please adjust according to actual situation.

---

## 🛠️ Troubleshooting

### Common Issues

<details>
<summary><b>❓ Automatic backup not executing</b></summary>

**Check Steps:**
1. Confirm scheduled task status is enabled
   ```json
   "Scheduled_Tasks": {
     "Status": true,
     ...
   }
   ```
2. Check cron expression format
3. View log files
   ```bash
   cat logs/EasyBackuper/easybackuper_*.log
   ```
</details>

### 📊 Log File Description

| Log File | Location                                                  | Purpose                       |
| -------- | ----------------------------------------------------- | -------------------------- |
| Main Log   | `logs/EasyBackuper/easybackuper_YYYYMMDD.log`         | Record backup, cleanup and other routine operations   |

---

## 📄 License

This project is open-sourced under the **AGPL-3.0** license.

```
Copyright (c) 2023 梦涵LOVE

This program is free software: you can redistribute it and/or modify it,
but must comply with the terms of the AGPL-3.0 license.
```

For the full license text, please refer to the [LICENSE](LICENSE) file.

---

## 👥 Contributing Guide

Issues and Pull Requests are welcome!

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit changes**
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push the branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Create a Pull Request**

---

## 🌟 Support & Feedback

- **GitHub Issues**: [Submit Issue](https://github.com/MengHanLOVE1027/lse-easybackuper/issues)
- **MineBBS**: [Discussion Thread](https://www.minebbs.com/resources/easybackuper-eb-minecraft.7771/)
- **Author**: 梦涵LOVE

---

<div align="center">

**⭐ If this project helps you, please give us a Star!**

[![Star History Chart](https://api.star-history.com/svg?repos=MengHanLOVE1027/lse-easybackuper&type=Date)](https://star-history.com/#MengHanLOVE1027/lse-easybackuper&Date)
