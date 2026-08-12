// LiteLoader-AIDS automatic generated
/// <reference path="c:\Users\HeYuHan\.LiteDev/dts/helperlib/src/index.d.ts"/>

// TAG: BStats模块 - By Nico6719
// #region BStats模块 - By Nico6719
/**
 * EasyBackuper - bStats 遥测模块
 */
function bstatsRandomGradientLog(text) {
    const len = text.length;
    let out = '';
    for (let i = 0; i < len; i++) {
        const t = len <= 1 ? 0 : i / (len - 1);
        const [r, g, b] = globalLerpColor(t);
        out += `\x1b[38;2;${r};${g};${b}m` + text[i];
    }
    logger.log(out + '\x1b[0m');
}

class BStatsImpl {
    constructor(pluginId) {
        this.pluginId = pluginId;
        this.enabled = true;
        this.debugMode = false;
        this.pluginName = plugin_name;
        this.pluginVersion = plugin_version;

        // 初始设为空，方便观察是否获取成功
        this.cachedCoreCount = "Unknown";
        this.cachedOsName = "Unknown";
        this.cachedOsArch = "Unknown";
        this.cachedOsVersion = "Unknown";

        this.platform = "bukkit"; // 保持为 "bukkit" 以便 bstats.org 接受
        this.baseUrl = `https://bstats.org/api/v2/data/${this.platform}`;

        // 立即同步一次配置并探测系统信息
        this.syncConfig();
        this.probeSystemInfo();
    }

    /**
     * 从 server.properties 文件中读取 online-mode 设置
     * @returns {number} 1 表示 true (在线模式), 0 表示 false (离线模式)
     */
    readServerProperties() {
        const path = './server.properties';
        try {
            if (File.exists(path)) {
                const content = File.readFrom(path);
                const match = content.match(/^online-mode\s*=\s*(true|false)/m);
                if (match) {
                    const value = match[1];
                    if (this.debugMode) bstatsRandomGradientLog(`从 server.properties 读取到 online-mode: ${value}`);
                    return value === 'true' ? 1 : 0;
                }
            }
            if (this.debugMode) logger.warn("server.properties 中未找到 'online-mode'，将使用默认值 1。");
        } catch (e) {
            if (this.debugMode) logger.error(`读取 server.properties 失败: ${e.message}，将使用默认值 1。`);
        }
        // 默认返回 1 (在线模式)
        return 1;
    }

    syncConfig() {
        try {
            // 从bstats/config.json读取配置
            const bstatsConfigPath = plugin_path + "/bstats/config.json";
            let bstatsConfig = {};
            if (File.exists(bstatsConfigPath)) {
                try {
                    const configContent = File.readFrom(bstatsConfigPath);
                    bstatsConfig = JSON.parse(configContent);
                } catch (e) {
                    logger.error("读取bstats配置文件失败: " + e.message);
                }
            }

            // 从插件配置中读取BStats配置
            const bstatsConf = pluginConfig.get("Bstats") || {};
            this.enabled = bstatsConfig.enabled !== undefined ? bstatsConfig.enabled : (bstatsConf.EnableModule !== undefined ? bstatsConf.EnableModule : true);
            this.debugMode = bstatsConfig.logSentDataEnabled !== undefined ? bstatsConfig.logSentDataEnabled : (bstatsConf.logSentData !== undefined ? bstatsConf.logSentData : false);
            this.serverUUID = bstatsConfig.serverUUID || bstatsConf.serverUUID || this.generateUUID();

            // 如果配置中没有UUID，保存新生成的UUID
            if (!bstatsConfig.serverUUID && !bstatsConf.serverUUID) {
                const updatedBstatsConf = pluginConfig.get("Bstats") || {};
                updatedBstatsConf.serverUUID = this.serverUUID;
                pluginConfig.set("Bstats", updatedBstatsConf);
            }
        } catch (e) {
            logger.error("同步BStats配置失败: " + e.message);
            // 使用默认UUID
            this.serverUUID = this.generateUUID();
        }
    }

    // 深度探测系统信息
    probeSystemInfo() {
        // 1. 尝试通过 process 对象获取
        try {
            if (typeof process !== 'undefined') {
                this.cachedOsName = process.platform || this.cachedOsName;
                this.cachedOsArch = process.arch || this.cachedOsArch;
            }
        } catch (e) { }

        // 2. 尝试通过异步命令预加载
        const updateVal = (cmd, prop) => {
            try {
                system.cmd(cmd, (exit, out) => {
                    if (exit === 0 && out) this[prop] = out.trim();
                });
            } catch (e) { }
        };

        updateVal("nproc", "cachedCoreCount");
        updateVal("uname -s", "cachedOsName");
        updateVal("uname -m", "cachedOsArch");
        updateVal("uname -r", "cachedOsVersion");

        // 3. 针对 Windows 的特殊探测
        if (this.cachedOsName === "Unknown") {
            updateVal("echo %NUMBER_OF_PROCESSORS%", "cachedCoreCount");
            updateVal("echo %OS%", "cachedOsName");
            updateVal("echo %PROCESSOR_ARCHITECTURE%", "cachedOsArch");
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    collectData() {
        // 每次收集数据时都重新同步配置，确保 UUID 等信息是最新的
        this.syncConfig();

        let playerCount = 0;
        try { playerCount = mc.getOnlinePlayers().length; } catch (e) { }

        // 获取LSE版本
        const lseVerRaw = (typeof ll !== 'undefined') ? ll.versionString() : "Unknown";
        const pureLseVersion = lseVerRaw.replace("LSE-QuickJS ", "").split(" ")[0];

        // 获取Minecraft版本
        let mcVer = (typeof mc !== 'undefined' ? mc.getBDSVersion() : "1.21.0");
        if (mcVer.startsWith('v')) mcVer = mcVer.substring(1);

        // 获取压缩方法
        const compression = pluginConfig.get("Compression");
        const compressionMethod = compression && compression.method ? compression.method : "unknown";

        // 获取自动备份状态
        const autoBackupStatus = scheduled_tasks_status ? "Enabled" : "Disabled";

        // 获取自动清理状态
        const autoCleanStatus = use_number_detection_status ? "Enabled" : "Disabled";

        // 最终兜底：如果探测失败，至少给一个看起来真实的占位符
        const finalOsName = this.cachedOsName !== "Unknown" ? this.cachedOsName : "Windows";
        const finalOsArch = this.cachedOsArch !== "Unknown" ? this.cachedOsArch : "x86_64";
        const finalCoreCount = this.cachedCoreCount !== "Unknown" ? this.cachedCoreCount : "8";
        const finalOsVersion = this.cachedOsVersion !== "Unknown" ? this.cachedOsVersion : "10.0";

        return {
            "serverUUID": this.serverUUID,
            "metricsVersion": "2",
            "playerAmount": playerCount,
            "onlineMode": this.readServerProperties(),
            "bukkitVersion": mcVer,
            "javaVersion": "N/A (Bedrock)",
            "osName": finalOsName,
            "osArch": finalOsArch,
            "osVersion": finalOsVersion,
            "coreCount": parseInt(finalCoreCount) || 8,
            "service": {
                "id": this.pluginId,
                "pluginVersion": this.pluginVersion,
                "customCharts": [
                    { "chartId": "lse_version", "type": "simple_pie", "data": { "value": pureLseVersion } },
                    { "chartId": "compression_method", "type": "simple_pie", "data": { "value": compressionMethod } },
                    { "chartId": "auto_backup_status", "type": "simple_pie", "data": { "value": autoBackupStatus } },
                    { "chartId": "auto_clean_status", "type": "simple_pie", "data": { "value": autoCleanStatus } }
                ]
            }
        };
    }

    submit() {
        if (!this.enabled) {
            bstatsRandomGradientLog(tr("bstats.disabled"));
            return;
        }
        const payload = this.collectData();
        if (this.debugMode) {
            bstatsRandomGradientLog("准备上报数据包内容:");
            bstatsRandomGradientLog(JSON.stringify(payload, null, 2));
        }
        try {
            network.httpPost(this.baseUrl, JSON.stringify(payload), "application/json", (status, result) => {
                if (status === 200) {
                    bstatsRandomGradientLog(tr("bstats.report_success"));
                } else {
                    logger.warn(tr("bstats.report_failed", status, result));
                }
            });
        } catch (e) {
            if (this.debugMode) {
                logger.error("网络请求异常: " + e.message);
            }
        }
    }

    start() {
        // 延长到 10 秒，给异步命令足够的时间返回结果
        setTimeout(() => this.submit(), 10 * 1000);
        setInterval(() => this.submit(), 30 * 60 * 1000);
        setTimeout(() => {
            bstatsRandomGradientLog(tr("bstats.startup", this.pluginName));
        }, 2000)
    }
}
// #endregion

// TAG: 全局常量模块
// #region 全局常量模块
// 声明常量
const plugin_name = "EasyBackuper",
    plugin_name_smallest = "easybackuper",
    plugin_version = "0.4.8-beta.3",
    plugin_description = "一个基于 LSE引擎 的轻量级、高性能、功能全面的Minecraft服务器热备份插件",
    plugin_github_link = "https://github.com/MengHanLOVE1027/lse-easybackuper",
    plugin_minebbs_link = "https://www.minebbs.com/resources/easybackuper-eb.7771/",
    plugin_update_url = "https://raw.githubusercontent.com/MengHanLOVE1027/lse-easybackuper/main/update_versions.json"
    plugin_license = "AGPL-3.0",
    plugin_path = `./plugins/${plugin_name}`,
    backup_tmp_path = "./backup_tmp/", // 临时复制解压缩路径
    world_level_name = /level-name=(.*)/.exec(File.readFrom('./server.properties'))[1], // 获取存档名称
    world_folder_path = `./worlds/${world_level_name}/` // 存档路径
// #endregion

// TAG: 配置文件模块
// #region 配置文件模块
// 配置文件初始化
const pluginConfigFile = {
    Language: "zh_CN",
    Compression: {
        method: "zip",
        exe_7z_path: "./plugins/EasyBackuper/7za.exe",
        formats: {
            "7z": {
                extension: ".7z",
                compress_args: ["a", "-t7z", "-mx=5"],
                extract_args: ["x", "-y"]
            },
            "zip": {
                extension: ".zip",
                compress_args: ["a", "-tzip", "-mx=5"],
                extract_args: ["x", "-y"]
            },
            "tar": {
                extension: ".tar.gz",
                compress_args: ["a", "-ttar", "-mx=5"],
                extract_args: ["x", "-y"]
            }
        }
    },
    exe_7z_path: ".\\plugins\\EasyBackuper\\7za.exe",
    exe_mhlove_truncate_path: ".\\plugins\\EasyBackuper\\mhlove-truncate.exe",
    BackupFolderPath: "./backup/",
    Max_Workers: 4,
    Auto_Clean: {
        Use_Number_Detection: {
            Status: false,
            Max_Number: 5,
            Mode: 0
        }
    },
    Scheduled_Tasks: {
        Status: false,
        Cron: "*/30 * * * * *"
    },
    Broadcast: {
        Status: true,
        Time_ms: 5000,
        Title: "[OP]要开始备份啦~",
        Message: "将于 5秒 后进行备份！",
        Server_Title: "[Server]Neve Gonna Give You UP~",
        Server_Message: "Never Gonna Let You Down~",
        Backup_success_Title: "备份完成！",
        Backup_success_Message: "星级服务，让爱连接",
        Backup_wrong_Title: "很好的邢级服务，使我备份失败",
        Backup_wrong_Message: "RT"
    },
    Debug_MoreLogs: false,
    Debug_MoreLogs_Player: false,
    Debug_MoreLogs_Cron: false,
    Restore: {
        backup_old_world_before_restore: true
    },
    Bstats: {
        EnableModule: true,
        logSentData: false,
        serverUUID: ""
    }
}

// 创建配置文件
let pluginConfig = new JsonConfigFile(
    plugin_path + `/config/${plugin_name}.json`,
    JSON.stringify(pluginConfigFile)
)

/**
 * 配置迁移：根据版本号将新增的配置项合并到用户已有的配置文件
 * - 保留用户所有自定义值，仅添加默认配置中存在但用户配置缺失的键
 * - 通过 _config_version 记录当前配置版本，避免重复迁移
 */
function migrateConfig() {
    const storedVersion = pluginConfig.get("_config_version") || "0.0.0";
    if (storedVersion === plugin_version) return;

    /**
     * 递归合并默认值到配置对象（只添加缺失的键，不覆盖已有值）
     * @param {JsonConfigFile} cfg - 配置对象
     * @param {Object} defaults - 默认值对象
     * @returns {boolean} 是否有变更
     */
    function deepMerge(cfg, defaults) {
        let changed = false;
        for (const key of Object.keys(defaults)) {
            const defVal = defaults[key];
            const curVal = cfg.get(key);

            if (curVal === undefined || curVal === null) {
                // 键不存在 → 添加默认值
                cfg.set(key, defVal);
                changed = true;
            } else if (
                typeof defVal === "object" && defVal !== null &&
                !Array.isArray(defVal) &&
                typeof curVal === "object" && curVal !== null &&
                !Array.isArray(curVal)
            ) {
                // 嵌套对象 → 递归合并子键
                let subChanged = false;
                const merged = Object.assign({}, curVal);
                for (const subKey of Object.keys(defVal)) {
                    if (!(subKey in curVal)) {
                        merged[subKey] = defVal[subKey];
                        subChanged = true;
                    }
                }
                if (subChanged) {
                    cfg.set(key, merged);
                    changed = true;
                }
            }
        }
        return changed;
    }

    const changed = deepMerge(pluginConfig, pluginConfigFile);
    pluginConfig.set("_config_version", plugin_version);

    if (changed) {
        logger.info(tr("migration.config_updated", plugin_version));
    }
}
// #endregion

// TAG: 全局变量模块
// #region 全局变量模块
// 全局变量
let pl, yes_no_console
// BStats实例
let bstatsInstance = null
// Cron相关变量
let scheduled_tasks = pluginConfig.get('Scheduled_Tasks')
let scheduled_tasks_status = scheduled_tasks['Status']
let scheduled_tasks_cron = scheduled_tasks['Cron']
let cronExpr = scheduled_tasks_cron
let parsed = parseCronExpression(cronExpr)
let cronTimerHandle = null       // setInterval 句柄
let lastCronTriggerSecond = -1   // 上次 cron 触发的秒级时间戳，防止同秒重复

// 获取配置文件中Auto_Clean配置内容
let auto_cleaup = pluginConfig.get('Auto_Clean')
// 读取"Use_Number_Detection"
let use_number_detection = auto_cleaup['Use_Number_Detection']
// 读取"Use_Number_Detection"中的Status, Max_Clean_Number, Mode
let use_number_detection_status = use_number_detection['Status']
let use_number_detection_max_number = use_number_detection['Max_Number']
let use_number_detection_mode = use_number_detection['Mode']

// Debug相关
let Debug_Morelogs = pluginConfig.get("Debug_MoreLogs")
let Debug_Morelogs_Player = pluginConfig.get("Debug_MoreLogs_Player")
let Debug_Morelogs_Cron = pluginConfig.get("Debug_MoreLogs_Cron")
// 备份状态变量
let is_backing_up = false
let is_restoring = false

// ── 全局随机颜色对（Logo、Tip、logInfo 共用）────────────────
function randomVividColor() {
    // 排除绿色(90°~150°)和深紫色(260°~300°)
    // 可用色相段：[0,90) [150,260) [300,360) 共 260°
    const rand = Math.random() * 260;
    let h;
    if (rand < 90) h = rand;           // 红/橙/黄
    else if (rand < 200) h = rand + 60;      // 青/蓝  (150~260)
    else h = rand + 100;     // 粉/洋红 (300~360)

    const s = 0.90 + Math.random() * 0.10;  // 90%~100% 高饱和
    const l = 0.65 + Math.random() * 0.15;  // 65%~80%  高亮度
    const a = s * Math.min(l, 1 - l);
    function f(n) {
        const k = (n + h / 30) % 12;
        return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255);
    }
    return [f(0), f(8), f(4)];
}

function generateColorPair() {
    const c1 = randomVividColor();
    let c2, attempts = 0;
    do {
        c2 = randomVividColor();
        const diff = Math.abs(c1[0] - c2[0]) + Math.abs(c1[1] - c2[1]) + Math.abs(c1[2] - c2[2]);
        if (diff > 150 || attempts++ > 20) break;
    } while (true);
    return [c1, c2];
}

// 全局唯一颜色对，本次启动所有渐变共用
const [GLOBAL_C1, GLOBAL_C2] = generateColorPair();

function globalLerpColor(t) {
    return [
        Math.round(GLOBAL_C1[0] + (GLOBAL_C2[0] - GLOBAL_C1[0]) * t),
        Math.round(GLOBAL_C1[1] + (GLOBAL_C2[1] - GLOBAL_C1[1]) * t),
        Math.round(GLOBAL_C1[2] + (GLOBAL_C2[2] - GLOBAL_C1[2]) * t)
    ];
}

function RandomColor(text) {
    const len = text.length;
    let out = '';
    for (let i = 0; i < len; i++) {
        const t = len <= 1 ? 0 : i / (len - 1);
        const [r, g, b] = globalLerpColor(t);
        out += `\x1b[38;2;${r};${g};${b}m` + text[i];
    }
    return (out + '\x1b[0m');
}

// TAG: 日志系统模块
// #region 日志系统模块
/**
 * 字符串格式化函数
 * @param {String} str 包含 %s 占位符的字符串
 * @param {...any} args 要替换的参数
 * @returns {String} 格式化后的字符串
 */
function formatString(str, ...args) {
    // 确保str是字符串类型
    if (typeof str !== 'string') {
        console.error(`formatString: str is not a string, type: ${typeof str}, value: ${str}`)
        return String(str)
    }
    // 支持 %s 和 %d 格式化占位符
    return str.replace(/%[sd]/g, () => args.shift())
}

/**
 * 格式化文件大小
 * @param {Number} size_bytes 文件大小（字节）
 * @returns {String} 格式化后的文件大小字符串
 */
function formatFileSize(size_bytes) {
    if (size_bytes === 0) return "0 B"

    const size_names = ["B", "KB", "MB", "GB", "TB"]
    let i = 0
    let size = size_bytes

    while (size >= 1024 && i < size_names.length - 1) {
        size /= 1024
        i++
    }

    return size.toFixed(2) + " " + size_names[i]
}

/**
 * 自制日志输出函数
 * @param {String} text 日志内容
 * @param {String} level 日志级别 (DEBUG, INFO, WARNING, ERROR, SUCCESS)
 */
function pluginPrint(text, level = "INFO") {

    // 日志级别颜色映射
    const level_colors = {
        "DEBUG": "\x1b[36m",    // 青色
        "INFO": "\x1b[37m",     // 白色
        "WARNING": "\x1b[33m",  // 黄色
        "ERROR": "\x1b[31m",    // 红色
        "SUCCESS": "\x1b[32m"   // 绿色
    }

    // 获取颜色
    const level_color = level_colors[level] || "\x1b[37m"
    const logger_head = `[${level_color}${level}\x1b[0m] `

    // 根据日志级别使用不同的logger方法
    switch (level) {
        case "INFO":
            logger.info(String(RandomColor(text)))
            break
        case "SUCCESS":
            logger.info(logger_head + String(RandomColor(text)))
            break
        case "DEBUG":
            logger.info(logger_head + String(RandomColor(text)))
            break
        case "WARNING":
            logger.warn(String(RandomColor(text)))
            break
        case "ERROR":
            logger.error(String(RandomColor(text)))
            break
    }

    // 写入到日志文件
    try {
        const log_dir = `./logs/${plugin_name}/`
        if (!File.exists(log_dir)) {
            File.mkdir(log_dir);
        }
        const now = new Date()
        // 格式化时间为: 2026-02-03 10:00:12,040
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')
        const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds},${milliseconds}`
        const log_file = `${log_dir}${plugin_name_smallest}_${now.toISOString().split('T')[0]}.log`
        const log_line = `${timestamp} - ${plugin_name} - ${level} - ${text}`
        File.writeLine(log_file, log_line)
    } catch (e) {
        logger.error(`写入日志文件失败: ${e}`)
    }
}
// #endregion
// #endregion

// TAG: i18n 国际化模块
// #region i18n 国际化模块

// 内置默认翻译表
const I18N_DEFAULTS = {
    "zh_CN": {
        "bstats.config_sync_failed": "同步BStats配置失败: %s",
        "bstats.disabled": "遥测模块已禁用，跳过上报。",
        "bstats.report_success": "遥测数据上报成功。",
        "bstats.report_failed": "上报失败，状态码: %s, 返回结果: %s",
        "bstats.startup": "%s遥测模块已启动。首次数据将在 10 秒后发送。",
        "bstats.read_failed": "读取bstats配置文件失败: %s",

        "cron.skip_duplicate": "Cron 跳过：同秒已触发过 (sec=%s)",
        "cron.skip_running": "Cron 跳过：上一次备份仍在进行中",
        "cron.auto_backup_starting": "自动备份正在启动中...",
        "cron.started": "Cron 调度器已启动（1s 精度）",
        "cron.stopped": "Cron 调度器已停止",

        "cleanup.files_in_world": "存档文件夹内的文件: ",
        "cleanup.files_to_delete": "需要删除的存档: ",
        "cleanup.success": "清理成功，清理了：%s",
        "cleanup.failed": "清理失败！",
        "cleanup.nothing": "本小姐看了一下，很干净捏~",
        "cleanup.starting": "自动清理正在启动中...",

        "backup.copying_file": "操作中：%s ==> %s",
        "backup.copy_error": "拷贝出错 %s: %s",
        "backup.broadcast_start": "§2§l[EasyBackuper]§r§3开始备份力！",
        "backup.copying": "拷贝中...",
        "backup.server_not_ready": "The server is not ready to save!!!",
        "backup.truncate_success": "截取成功",
        "backup.truncate_failed": "截取失败",
        "backup.compressing": "压缩中...",
        "backup.compressing_7za_exit": "7za exit code: %s",
        "backup.copy_success": "拷贝成功",
        "backup.copy_failed": "拷贝出错",
        "backup.copy_failed_broadcast": "§2§l[EasyBackuper]§r§c拷贝失败！",
        "backup.copy_success_broadcast": "§2§l[EasyBackuper]§r§6拷贝成功！",
        "backup.success": "备份成功！压缩包位于：%s (%s MB)",
        "backup.success_broadcast": "§2§l[EasyBackuper]§r§6备份成功！§e备份存档：",
        "backup.failed_broadcast": "§2§l[EasyBackuper]§r§c备份失败！",
        "backup.compress_error": "压缩出错",
        "backup.get_size_failed": "获取压缩包大小失败: %s",

        "restore.no_backups": "没有找到可用的备份文件",
        "restore.list_header": "===== 可用备份列表 =====",
        "restore.list_item": "[%d] %s (%s)",
        "restore.failed": "回档失败: %s",
        "restore.start_with_index": "开始回档操作，索引: %s",
        "restore.rejected_backup_running": "回档操作被拒绝: 正在备份中",
        "restore.wait_backup": "正在备份中，请等待备份完成后再回档！",
        "restore.rejected_restore_running": "回档操作被拒绝: 正在回档中",
        "restore.wait_restore": "正在回档中，请等待当前回档完成！",
        "restore.processing": "开始处理回档请求...",
        "restore.world_not_found": "存档文件夹不存在: %s",
        "restore.scanning": "正在扫描备份文件夹: %s",
        "restore.found_count": "找到 %s 个备份文件",
        "restore.invalid_index_range": "无效的备份索引: %s，可用范围: 1-%s",
        "restore.invalid_index": "无效的备份索引: %s",
        "restore.backup_current": "回档前备份当前的世界...",
        "restore.backup_done": "备份完成: %s",
        "restore.backup_failed_cancel": "备份失败，取消回档操作",
        "restore.selected_file": "选择的备份文件: %s",
        "restore.selected_path": "备份文件完整路径: %s",
        "restore.extracting": "开始解压备份文件...",
        "restore.extract_cmd": "解压命令: %s %s",
        "restore.extract_success": "备份文件解压成功",
        "restore.marker_created": "回档标记文件已创建",
        "restore.complete_msg": "备份文件 %s 已解压完成，请关闭服务器。重新启动服务器后将自动完成回档操作。",
        "restore.close_server": "请关闭服务器。重新启动服务器后将自动完成回档操作。",
        "restore.extract_failed": "备份文件解压失败，退出代码: %s",
        "restore.extract_output": "输出: %s",
        "restore.deleting_world": "正在删除原世界文件夹: %s",
        "restore.world_deleted": "原世界文件夹已删除",
        "restore.moving_world": "正在移动世界文件夹: %s -> %s",
        "restore.world_moved": "世界文件夹已移动",
        "restore.temp_deleted": "临时文件夹已删除",
        "restore.done": "回档操作完成",
        "restore.marker_detected": "检测到回档标记文件，开始执行回档操作...",
        "restore.marker_deleted": "回档标记文件已删除",
        "restore.list_error": "listBackups 错误: %s",
        "restore.continue_error": "continueRestore 错误: %s",

        "cmd.backup_desc": "一个基于 LSE引擎 的轻量级、高性能、功能全面的Minecraft服务器热备份插件",
        "cmd.restore_desc": "回档备份",
        "cmd.reloading": "重载中...",
        "cmd.config_reloaded": "配置文件：已重载",
        "cmd.auto_backup_status": "自动备份状态：",
        "cmd.auto_clean_status": "自动清理状态：",
        "cmd.debug_console": "Debug更多日志状态(控制台)：",
        "cmd.debug_player": "Debug更多日志状态(玩家)：",
        "cmd.debug_cron": "Debug更多日志状态(Cron)：",
        "cmd.init_success": "初始化文件成功",
        "cmd.permission_denied": "§c[EasyBackuper] §f您没有权限执行此操作！",
        "cmd.restore_help": "回档命令帮助:\n/restore - 显示此帮助信息\n/restore list <数量> - 列出指定数量的备份\n/restore <索引> - 回档到指定索引的备份",

        "plugin.author_version": "作者：梦涵LOVE | 版本：v%s",
        "plugin.thanks": "感谢您使用Easy系列插件！",
        "plugin.license_info": "本插件使用 %s 许可证协议发布",
        "plugin.github": "GitHub 仓库：%s",
        "plugin.minebbs": "插件MineBBS资源帖：%s",
        "plugin.qq_group": "Easy系列插件交流群：1083195477",
        "plugin.bstats_status": "BStats状态：",
        "plugin.update_hint": "请安装 EasyCheckUpdate 插件以为本插件提供更新检查功能",
        "plugin.unloading": "插件卸载中...",
        "plugin.unloaded": "插件卸载完成",
        "plugin.bstats_init_failed": "BStats初始化失败: %s",

        "status.enabled": "已启用",
        "status.disabled": "已禁用",

        "log.write_failed": "写入日志文件失败: %s",

        "migration.lang_updated": "语言文件已更新至版本 %s，已添加新的翻译键",
        "migration.config_updated": "配置文件已更新至版本 %s，已添加新的配置项",
        "migration.lang_exported": "已导出默认语言文件: %s",
    },

    "en_US": {
        "bstats.config_sync_failed": "Failed to sync BStats config: %s",
        "bstats.disabled": "Telemetry module disabled, skipping report.",
        "bstats.report_success": "Telemetry data reported successfully.",
        "bstats.report_failed": "Report failed, status: %s, response: %s",
        "bstats.startup": "%s telemetry module started. First data will be sent in 10 seconds.",
        "bstats.read_failed": "Failed to read bstats config: %s",

        "cron.skip_duplicate": "Cron skip: already triggered this second (sec=%s)",
        "cron.skip_running": "Cron skip: previous backup still in progress",
        "cron.auto_backup_starting": "Auto-backup starting...",
        "cron.started": "Cron scheduler started (1s precision)",
        "cron.stopped": "Cron scheduler stopped",

        "cleanup.files_in_world": "Files in world folder: ",
        "cleanup.files_to_delete": "Files to delete: ",
        "cleanup.success": "Cleanup successful, removed: %s",
        "cleanup.failed": "Cleanup failed!",
        "cleanup.nothing": "All clean, nothing to remove~",
        "cleanup.starting": "Auto-cleanup starting...",

        "backup.copying_file": "Copying: %s ==> %s",
        "backup.copy_error": "Copy error %s: %s",
        "backup.broadcast_start": "§2§l[EasyBackuper]§r§3Starting backup!",
        "backup.copying": "Copying...",
        "backup.server_not_ready": "The server is not ready to save!!!",
        "backup.truncate_success": "Truncate successful",
        "backup.truncate_failed": "Truncate failed",
        "backup.compressing": "Compressing...",
        "backup.compressing_7za_exit": "7za exit code: %s",
        "backup.copy_success": "Copy successful",
        "backup.copy_failed": "Copy failed",
        "backup.copy_failed_broadcast": "§2§l[EasyBackuper]§r§cCopy failed!",
        "backup.copy_success_broadcast": "§2§l[EasyBackuper]§r§6Copy successful!",
        "backup.success": "Backup successful! Archive: %s (%s MB)",
        "backup.success_broadcast": "§2§l[EasyBackuper]§r§6Backup successful! §eArchive: ",
        "backup.failed_broadcast": "§2§l[EasyBackuper]§r§cBackup failed!",
        "backup.compress_error": "Compression error",
        "backup.get_size_failed": "Failed to get archive size: %s",

        "restore.no_backups": "No backup files found",
        "restore.list_header": "===== Available Backups =====",
        "restore.list_item": "[%d] %s (%s)",
        "restore.failed": "Restore failed: %s",
        "restore.start_with_index": "Starting restore, index: %s",
        "restore.rejected_backup_running": "Restore rejected: backup in progress",
        "restore.wait_backup": "Backup in progress, please wait and try again!",
        "restore.rejected_restore_running": "Restore rejected: another restore in progress",
        "restore.wait_restore": "Restore in progress, please wait for it to complete!",
        "restore.processing": "Processing restore request...",
        "restore.world_not_found": "World folder not found: %s",
        "restore.scanning": "Scanning backup folder: %s",
        "restore.found_count": "Found %s backup file(s)",
        "restore.invalid_index_range": "Invalid backup index: %s, valid range: 1-%s",
        "restore.invalid_index": "Invalid backup index: %s",
        "restore.backup_current": "Backing up current world before restore...",
        "restore.backup_done": "Backup complete: %s",
        "restore.backup_failed_cancel": "Backup failed, restore cancelled",
        "restore.selected_file": "Selected backup file: %s",
        "restore.selected_path": "Backup file path: %s",
        "restore.extracting": "Extracting backup file...",
        "restore.extract_cmd": "Extract command: %s %s",
        "restore.extract_success": "Backup file extracted successfully",
        "restore.marker_created": "Restore marker file created",
        "restore.complete_msg": "Backup file %s has been extracted. Please shut down the server. The restore will complete automatically after restart.",
        "restore.close_server": "Please shut down the server. The restore will complete automatically after restart.",
        "restore.extract_failed": "Extraction failed, exit code: %s",
        "restore.extract_output": "Output: %s",
        "restore.deleting_world": "Deleting original world folder: %s",
        "restore.world_deleted": "Original world folder deleted",
        "restore.moving_world": "Moving world folder: %s -> %s",
        "restore.world_moved": "World folder moved",
        "restore.temp_deleted": "Temporary folder deleted",
        "restore.done": "Restore complete",
        "restore.marker_detected": "Restore marker detected, starting restore...",
        "restore.marker_deleted": "Restore marker file deleted",
        "restore.list_error": "listBackups error: %s",
        "restore.continue_error": "continueRestore error: %s",

        "cmd.backup_desc": "A lightweight, high-performance, and feature-rich hot backup plugin for Minecraft servers based on LSE.",
        "cmd.restore_desc": "Restore backup",
        "cmd.reloading": "Reloading...",
        "cmd.config_reloaded": "Config: reloaded",
        "cmd.auto_backup_status": "Auto-backup: ",
        "cmd.auto_clean_status": "Auto-cleanup: ",
        "cmd.debug_console": "Debug logs (console): ",
        "cmd.debug_player": "Debug logs (player): ",
        "cmd.debug_cron": "Debug logs (cron): ",
        "cmd.init_success": "Config initialized successfully",
        "cmd.permission_denied": "§c[EasyBackuper] §fYou do not have permission to do this!",
        "cmd.restore_help": "Restore command help:\n/restore - Show this help\n/restore list <count> - List specified number of backups\n/restore <index> - Restore to the specified backup index",

        "plugin.author_version": "Author: MengHanLOVE | Version: v%s",
        "plugin.thanks": "Thank you for using EasyBackuper!",
        "plugin.license_info": "Licensed under %s",
        "plugin.github": "GitHub: %s",
        "plugin.minebbs": "MineBBS: %s",
        "plugin.qq_group": "QQ Group: 1083195477",
        "plugin.bstats_status": "BStats: ",
        "plugin.update_hint": "Install EasyCheckUpdate plugin to enable update checks",
        "plugin.unloading": "Unloading plugin...",
        "plugin.unloaded": "Plugin unloaded",
        "plugin.bstats_init_failed": "BStats init failed: %s",

        "status.enabled": "Enabled",
        "status.disabled": "Disabled",

        "log.write_failed": "Failed to write log file: %s",

        "migration.lang_updated": "Language files updated to version %s, new translation keys added",
        "migration.config_updated": "Config updated to version %s, new options added",
        "migration.lang_exported": "Default language file exported: %s",
    }
};

// 语言文件目录
const LANGS_DIR = plugin_path + "/langs/";

// 运行时翻译数据（从外部文件加载，失败则回退到内置默认值）
let i18nData = {};
// 当前语言
let i18nLang = "zh_CN";

/**
 * 翻译函数
 * @param {string} key - 翻译键
 * @param {...any} args - 替换 %s/%d 占位符的参数
 * @returns {string} 翻译后的文本
 */
function tr(key, ...args) {
    let text = i18nData[key];
    if (text === undefined) {
        // 回退到内置默认语言的对应值
        const defaults = I18N_DEFAULTS[i18nLang] || I18N_DEFAULTS["zh_CN"];
        text = defaults[key];
    }
    if (text === undefined) {
        return key;
    }
    if (args.length > 0) {
        return formatString(text, ...args);
    }
    return text;
}

/**
 * 从 langs/ 目录加载语言文件
 * @param {string} lang - 语言代码
 */
function loadLangFile(lang) {
    const langFile = LANGS_DIR + lang + ".json";
    try {
        if (File.exists(langFile)) {
            const content = File.readFrom(langFile);
            const data = JSON.parse(content);
            if (typeof data === "object") {
                // 以默认值为基础，文件内容覆盖
                const defaults = I18N_DEFAULTS[lang] || I18N_DEFAULTS["zh_CN"];
                i18nData = Object.assign({}, defaults, data);
                return;
            }
        }
    } catch (e) {
        // 文件损坏，回退
    }
    // 回退到内置默认
    i18nData = Object.assign({}, I18N_DEFAULTS[lang] || I18N_DEFAULTS["zh_CN"]);
}

/**
 * 语言文件迁移：根据版本号将新增的翻译键合并到已有的语言文件中
 * - 保留用户所有自定义翻译，仅添加内置默认中新增的键
 * - 通过 langs/.version 记录当前版本，避免重复迁移
 * - 如语言文件损坏则用默认值重建
 */
function migrateLangFiles() {
    const versionFile = LANGS_DIR + ".version";
    let storedVersion = "0.0.0";

    if (File.exists(versionFile)) {
        try {
            storedVersion = File.readFrom(versionFile).trim();
        } catch (e) {
            // 读取失败，视为旧版本，执行完整迁移
        }
    }

    if (storedVersion === plugin_version) return;

    for (const lang of Object.keys(I18N_DEFAULTS)) {
        const langFile = LANGS_DIR + lang + ".json";
        const defaults = I18N_DEFAULTS[lang];

        if (File.exists(langFile)) {
            try {
                const content = File.readFrom(langFile);
                const data = JSON.parse(content);
                if (typeof data === "object") {
                    // 合并：只添加内置默认中存在但文件缺失的键
                    let changed = false;
                    for (const key of Object.keys(defaults)) {
                        if (!(key in data)) {
                            data[key] = defaults[key];
                            changed = true;
                        }
                    }
                    if (changed) {
                        File.writeTo(langFile, JSON.stringify(data, null, 4));
                        logger.info(tr("migration.lang_updated", plugin_version) + " [" + lang + "]");
                    }
                }
            } catch (e) {
                // 文件损坏 → 用默认值重建
                try {
                    File.writeTo(langFile, JSON.stringify(defaults, null, 4));
                    logger.info(tr("migration.lang_exported", lang));
                } catch (e2) {
                    // 写入失败忽略，内置默认值仍可用
                }
            }
        } else {
            // 文件不存在 → 导出默认文件
            try {
                File.writeTo(langFile, JSON.stringify(defaults, null, 4));
                logger.info(tr("migration.lang_exported", lang));
            } catch (e) {
                // 写入失败忽略
            }
        }
    }

    // 更新版本标记
    try {
        File.writeTo(versionFile, plugin_version);
    } catch (e) {
        // 写入失败不影响运行，下次启动会再次迁移
    }
}

/**
 * 初始化 i18n
 * - 迁移语言文件（如插件版本已更新）
 * - 确保 langs/ 目录存在
 * - 导出内置默认语言文件（如不存在）
 * - 加载当前语言
 */
function initI18n() {
    // 确保 langs 目录存在
    if (!File.exists(LANGS_DIR)) {
        File.mkdir(LANGS_DIR);
    }

    // 迁移语言文件：合并新版本中新增的翻译键
    migrateLangFiles();

    i18nLang = pluginConfig.get("Language") || "zh_CN";
    if (!I18N_DEFAULTS[i18nLang]) {
        i18nLang = "zh_CN";
    }
    loadLangFile(i18nLang);
}
// #endregion

// TAG: Cron解析模块
// #region Cron解析模块
/**
 * Cron传入函数
 * @param {JSON} cronExpr Cron表达式
 * @returns 秒，分，时，日，月，星期，月份
 */
function parseCronExpression(cronExpr) {
    let parts = cronExpr.split(' ')

    if (parts.length < 6 || parts.length > 7) {
        throw new Error('Invalid cron expression')
    }

    let second = parseCronPart(parts[0], 0, 59)
    let minute = parseCronPart(parts[1], 0, 59)
    let hour = parseCronPart(parts[2], 0, 23)
    let dayOfMonth = parseCronPart(parts[3], 1, 31)
    let month = parseCronPart(parts[4], 1, 12, true)
    let dayOfWeek = parseCronPart(parts[5], 0, 7, true) // 0 和 7 都代表周日

    let year = null;
    if (parts.length > 6) {
        year = parseCronPart(parts[6], 1970, 9999)
    }

    return {
        second,
        minute,
        hour,
        dayOfMonth,
        month,
        dayOfWeek,
        year
    };
}
/**
 * 处理Cron的位置部分是否符合指定范围
 * @param {String} part 位置部分(Cron分开来解析后的顺序)
 * @param {Number} min 最小值
 * @param {Number} max 最大值
 * @param {Boolean} allowNames 是否启用标识符
 * @returns {Array} 数组
 */
function parseCronPart(part, min, max, allowNames = false) {
    let values = [];

    if (part === '*') {
        for (let i = min; i <= max; i++) {
            values.push(i)
        }
    } else if (part.includes('/')) {
        let [rangeStart, step] = part.split('/')
        let stepNum = parseInt(step, 10)
        for (let i = parseInt(rangeStart, 10) || min; i <= max; i += stepNum) {
            values.push(i)
        }
    } else if (part.includes('-')) {
        let [start, end] = part.split('-').map(Number)
        for (let i = start; i <= end; i++) {
            values.push(i)
        }
    } else if (part.includes(',')) {
        values.push(...part.split(',').map(Number))
    } else if (!isNaN(part)) {
        let num = parseInt(part, 10)
        if (num >= min && num <= max) {
            values.push(num)
        }
    } else if (allowNames && ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(part.toLowerCase())) {
        values.push(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(part.toLowerCase()))
    } else {
        throw new Error(`Invalid cron field: ${part}`)
    }

    return values;
}
/**
 * Cron检查并运行
 * @param {JSON} parsed Cron表达式(解析后)
 * @param {Function} callback 回调函数
 * @returns {Array} 秒，分，时，日期，月份，星期
/**
 * 纯时间匹配检测——只判断当前时间是否命中 cron，不执行任何副作用
 * @param {Object} parsed 解析后的 cron 表达式
 * @returns {boolean} 是否命中
 */
function cronMatchesNow(parsed) {
    let now = new Date()
    let currentSecond = now.getSeconds()
    let currentMinute = now.getMinutes()
    let currentHour = now.getHours()
    let currentDayOfMonth = now.getDate()
    let currentMonth = now.getMonth() + 1
    let currentDayOfWeek = now.getDay()

    if (!parsed.second.includes(currentSecond))   return false
    if (!parsed.minute.includes(currentMinute))   return false
    if (!parsed.hour.includes(currentHour))       return false
    if (!parsed.dayOfMonth.includes(currentDayOfMonth)) return false
    if (!parsed.month.includes(currentMonth))     return false
    if (!parsed.dayOfWeek.includes(currentDayOfWeek)) return false

    return true
}

/**
 * Cron 命中时触发——带防重守卫
 * 使用秒级时间戳 + is_backing_up 双重保护，彻底杜绝重复备份
 */
function onCronTrigger() {
    let now = new Date()
    let triggerKey = Math.floor(now.getTime() / 1000)  // 秒级时间戳

    // 守卫1：同秒内只触发一次
    if (triggerKey === lastCronTriggerSecond) {
        if (Debug_Morelogs_Cron) {
            pluginPrint(tr("cron.skip_duplicate", triggerKey), "DEBUG")
        }
        return
    }

    // 守卫2：上次备份还没结束，跳过
    if (is_backing_up) {
        if (Debug_Morelogs_Cron) {
            pluginPrint(tr("cron.skip_running"), "DEBUG")
        }
        return
    }

    // 标记本轮触发
    lastCronTriggerSecond = triggerKey

    if (Debug_Morelogs_Cron) {
        pluginPrint(`Current time: ${now.toDateString()} ${now.toTimeString()}`, "DEBUG")
    }

    pluginPrint(tr("cron.auto_backup_starting"), "INFO")
    Start()
}

/**
 * 启动 cron 调度器——用 setInterval 每秒检测，替代 onTick 轮询
 */
function startCronScheduler() {
    if (cronTimerHandle) return  // 已经在运行

    if (Debug_Morelogs_Cron) {
        pluginPrint(tr("cron.started"), "DEBUG")
    }

    cronTimerHandle = setInterval(() => {
        if (!scheduled_tasks_status) return
        if (!cronMatchesNow(parsed)) return
        onCronTrigger()
    }, 1000)
}

/**
 * 停止 cron 调度器
 */
function stopCronScheduler() {
    if (cronTimerHandle) {
        clearInterval(cronTimerHandle)
        cronTimerHandle = null
        if (Debug_Morelogs_Cron) {
            pluginPrint(tr("cron.stopped"), "DEBUG")
        }
    }
}

/**
 * 重启 cron 调度器（配置重载后调用）
 */
function restartCronScheduler() {
    stopCronScheduler()
    lastCronTriggerSecond = -1  // 重置触发记录
    if (scheduled_tasks_status) {
        startCronScheduler()
    }
}
// #endregion

// TAG: 清理冗余备份文件模块
// #region 清理冗余备份文件模块

// NOTE: (有日志输出)删除指定文件夹内超过最大备份量的文件
// #region 删除指定文件夹内超过最大备份量的文件
/**
 * 删除指定文件夹内超过最大备份量的文件
 * @param {String} backupDir 备份文件夹路径
 * @param {Number} maxBackups 最大保留数量
 */
function deleteOldBackups(backupDir, maxBackups) {
    let goingto_delete_backups = []
    let ending = []
    let err_out
    // 列出指定文件夹下的所有文件
    let filesList = File.getFilesList(backupDir)

    // 按照文件名中的日期时间部分进行排序
    filesList.sort((a, b) => {
        let dateA = new Date(a.split('=')[0].replace(/_/g, '-'))
        let dateB = new Date(b.split('=')[0].replace(/_/g, '-'))
        return dateA - dateB
    })

    // 调试信息(在配置文件中Debug_MoreLogs开启)
    if (Debug_Morelogs) {
        pluginPrint(tr("cleanup.files_in_world"), "DEBUG")
    }
    // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
    if (Debug_Morelogs_Player) {
        // 提醒使用该指令玩家
        if (yes_no_console == 0) {
            pl.tell('[Debug] 存档文件夹内的文件: ')
        }
    }

    // 当备份文件夹文件大于用户设置最大保留值时
    if (filesList.length > maxBackups) {
        for (let file of filesList) {
            // 添加至数组

            // 调试信息(在配置文件中Debug_MoreLogs开启)
            if (Debug_Morelogs) {
                pluginPrint(`${file}`, "DEBUG")
            }
            // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
            if (Debug_Morelogs_Player) {
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(`[Debug] ${file}`)
                }
            }

            goingto_delete_backups.push(file)
        }
        // 计算差值
        let a = filesList.length - maxBackups

        // 调试信息(在配置文件中Debug_MoreLogs开启)
        if (Debug_Morelogs) {
            pluginPrint(tr("cleanup.files_to_delete"), "DEBUG")
        }
        // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
        if (Debug_Morelogs_Player) {
            // 提醒使用该指令玩家
            if (yes_no_console == 0) {
                pl.tell('[Debug] 需要删除的存档: ')
            }
        }

        for (let i = 0; i < a; i++) {
            // 获取删除的文件名保存在数组内
            ending.push(goingto_delete_backups[i])
            err_out = File.delete(pluginConfig.get('BackupFolderPath') + '/' + goingto_delete_backups[i])

            // 调试信息(在配置文件中Debug_MoreLogs开启)
            if (Debug_Morelogs) {
                pluginPrint(`${goingto_delete_backups[i]}`, "DEBUG")
            }
            // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
            if (Debug_Morelogs_Player) {
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(`[Debug] ${goingto_delete_backups[i]}`)
                }
            }
        }
        // 对返回值进行判断是否成功运行
        if (err_out) {
            for (let i = 0; i < ending.length; i++) {
                pluginPrint(tr("cleanup.success", ending[i]), "INFO")
            }
        } else {
            // 当备份文件夹文件小于等于用户设置最大保留值时
            pluginPrint(tr("cleanup.failed"), "ERROR")
        }
    } else {
        pluginPrint(tr("cleanup.nothing"), "INFO")
    }
}
// #endregion

// NOTE: (有日志输出)清理多余备份文件
// #region 清理多余备份文件
/**
 * 清理多余备份文件
 */
function Clean_Backup_Files() {
    // 获取配置文件中Auto_Clean配置内容
    auto_cleaup = pluginConfig.get('Auto_Clean')
    // 读取"Use_Number_Detection"
    use_number_detection = auto_cleaup['Use_Number_Detection']


    // 读取"Use_Number_Detection"中的Status和Max_Clean_Number
    use_number_detection_status = use_number_detection['Status']
    use_number_detection_max_number = use_number_detection['Max_Number']

    // 判断选择方式
    if (use_number_detection_status) {
        // 调用函数，例如删除除了最新的5个文件外的所有文件
        pluginPrint(tr("cleanup.starting"), "WARNING")
        deleteOldBackups(pluginConfig.get('BackupFolderPath'), use_number_detection_max_number)
    }
}
// #endregion
// #endregion

// TAG: 通知模块(包含开始运行)
// #region 通知模块(包含开始运行)

// #region 通知功能(类似于成就获得提示，位于上方,通知全体玩家)
/**
 * 通知功能(类似于成就获得提示，位于上方,通知全体玩家)
 * @param {String} broadcast_title 标题
 * @param {String} broadcast_message 内容
 */
function Notice_Upper(broadcast_title, broadcast_message) {
    let pl1
    let players = mc.getOnlinePlayers()
    for (let i = 0; i < players.length; i++) {
        pl1 = mc.getPlayer(players[i].realName)
        // 通知全体玩家(类似于成就获得提示)
        pl1.sendToast(broadcast_title, broadcast_message)
    }
}
// #endregion

// NOTE: 开始运行
// #region 开始运行
/**
 * 开始运行
 * @param {CommandOrigin} origin 传入的origin对象(在注册指令处)
 */
function Start(origin) {
    // 当没有传参时默认为BDS调用
    if (typeof origin === 'undefined') {
        yes_no_console = 1
    } else {
        // 判断指令主体是什么(重中之重)
        if (origin.typeName == 'Player') {
            // 设置玩家对象
            pl = mc.getPlayer(origin.player.realName)
            yes_no_console = 0
        } else if (origin.typeName == 'DedicatedServer') {
            yes_no_console = 1
        }
    }

    // 获取配置文件中Broadcast配置内容
    let broadcast = pluginConfig.get('Broadcast')
    // 读取"Status"
    let broadcast_status = broadcast['Status']
    // 读取"Time"(延迟时间)
    let broadcast_time_ms = broadcast['Time_ms']
    // 读取"Title"(通知标题)
    let broadcast_title = broadcast['Title']
    // 读取"Message"(通知内容)
    let broadcast_message = broadcast['Message']
    // 读取"Title"(通知标题)
    let broadcast_server_title = broadcast['Server_Title']
    // 读取"Message"(通知内容)
    let broadcast_server_message = broadcast['Server_Message']

    // 延时后并开始备份
    if (yes_no_console == 0) {
        setTimeout(() => {
            Backup(pl)
        }, broadcast_time_ms)
    } else {
        Backup()
    }

    if (yes_no_console == 0) {
        if (broadcast_status) {
            Notice_Upper(broadcast_title, broadcast_message)
        }
    } else if (yes_no_console == 1) {
        Notice_Upper(broadcast_server_title, broadcast_server_message)
    }
}
// #endregion
// #endregion

// TAG: 辅助备份模块
// NOTE: (调试信息)递归复制子目录辅助函数
// #region 递归复制子目录辅助函数
/**
 * 多线程复制单个文件
 * @param {String} src_path 源文件路径
 * @param {String} dst_path 目标文件路径
 * @returns {Promise} 返回Promise对象
 */
function copyFile(src_path, dst_path) {
    return new Promise((resolve, reject) => {
        try {
            if (Debug_Morelogs) {
                pluginPrint(tr("backup.copying_file", src_path, dst_path), "DEBUG")
            }
            // 如果是文件，则复制文件
            File.copy(src_path, dst_path)
            resolve(true)
        } catch (e) {
            pluginPrint(tr("backup.copy_error", src_path, String(e)), "ERROR")
            reject(e)
        }
    })
}

/**
 * 收集所有需要复制的文件
 * @param {String} src 源文件夹
 * @param {String} dest 目标文件夹
 * @returns {Array} 需要复制的文件列表
 */
function collectFiles(src, dest) {
    let files_to_copy = []
    let files = File.getFilesList(src)

    for (let file of files) {
        let srcPath = src + '/' + file
        let destPath = dest + '/' + file

        // 检查是否为目录
        if (File.checkIsDir(srcPath)) {
            // 创建目标目录
            File.mkdir(destPath)
            // 递归收集子目录中的文件
            files_to_copy = files_to_copy.concat(collectFiles(srcPath, destPath))
        } else {
            // 添加文件到复制列表
            files_to_copy.push({ src: srcPath, dst: destPath })
        }
    }

    return files_to_copy
}

/**
 * 使用多线程复制目录
 * @param {String} src 源文件夹
 * @param {String} dest 目标文件夹
 * @returns {Promise} 返回Promise对象
 */
function copyDirectoryMultithread(src, dest) {
    return new Promise((resolve, reject) => {
        try {
            // 收集所有需要复制的文件
            const files_to_copy = collectFiles(src, dest)

            // 获取最大线程数
            const max_workers = pluginConfig.get("Max_Workers") || 4

            // 分批处理文件复制
            let index = 0

            function processBatch() {
                const batch = files_to_copy.slice(index, index + max_workers)
                index += max_workers

                if (batch.length === 0) {
                    resolve(true)
                    return
                }

                // 创建Promise数组
                const promises = batch.map(item => copyFile(item.src, item.dst))

                // 等待当前批次完成
                Promise.all(promises)
                    .then(() => {
                        // 处理下一批
                        setTimeout(processBatch, 0)
                    })
                    .catch(e => {
                        pluginPrint(tr("backup.copy_error", "", String(e)), "ERROR")
                        reject(e)
                    })
            }

            // 开始处理第一批
            processBatch()
        } catch (e) {
            pluginPrint(tr("backup.copy_error", "", String(e)), "ERROR")
            reject(e)
        }
    })
}

/**
 * 递归复制子目录辅助函数（保留原函数作为备用）
 * @param {String} src 源文件夹
 * @param {String} dest 目标文件夹
 * @param {Player} pl 玩家对象
 * @returns {Boolean}真(但是貌似没必要返回，具体详见Backup()中的复制文件部分)
 */
function copyDirectory(src, dest, pl) {
    // 获取源目录下的所有文件和目录
    let files = File.getFilesList(src)
    for (let file of files) {
        let srcPath = src + '/' + file
        let destPath = dest + '/' + file

        // 检查是否为目录
        if (File.checkIsDir(srcPath)) {
            // 创建目标目录
            let backupSubDirPath = dest + '/' + file
            File.mkdir(backupSubDirPath)
            // 递归复制子目录
            copyDirectory(srcPath, backupSubDirPath, pl)
        } else {
            // 调试信息(在配置文件中Debug_MoreLogs开启)
            if (Debug_Morelogs) {
                pluginPrint(tr("backup.copying_file", srcPath, destPath), "DEBUG")
            }
            // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
            if (Debug_Morelogs_Player) {
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(`[Debug]${srcPath} ==> ${destPath}`)
                }
            }

            // 如果是文件，则复制文件
            File.copy(srcPath, dest)
        }
    }
    return true
}
// #endregion

// TAG: 备份模块
// NOTE: (调试信息)备份功能
// #region 备份功能
/**
 * 备份功能
 * @param {Player} pl 传入玩家对象
 */
function Backup(pl, callback) {
    // 设置备份状态为正在备份
    is_backing_up = true

    // 获取配置文件中Broadcast配置内容
    let broadcast = pluginConfig.get('Broadcast')
    // 读取"Status"
    let broadcast_status = broadcast['Status']
    // 读取"Backup_success_Title"(通知标题)
    let broadcast_Backup_success_Title = broadcast['Backup_success_Title']
    // 读取"Backup_success_Message"(通知内容)
    let broadcast_Backup_success_Message = broadcast['Backup_success_Message']
    // 读取"Backup_wrong_Title"(通知标题)
    let broadcast_Backup_wrong_Title = broadcast['Backup_wrong_Title']
    // 读取"Backup_wrong_Message"(通知内容)
    let broadcast_Backup_wrong_Message = broadcast['Backup_wrong_Message']
    // 局部变量
    let world_folder_list = File.getFilesList(world_folder_path)
    let copy_return, compress_return

    // 如果开启广播功能则进行广播
    if (broadcast_status) {
        // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
        mc.broadcast(tr("backup.broadcast_start"), 0)
        mc.broadcast(tr("backup.broadcast_start"), 5)
    }

    // NOTE: 暂停存档写入
    mc.runcmd("save hold")
    pluginPrint(tr("backup.copying"), "INFO") // 提示信息
    // 提醒使用该指令玩家
    if (yes_no_console == 0) {
        pl.tell(tr("backup.copying"))
    }

    // TAG: save query模块
    // NOTE: save query模块
    // #region save query模块
    /**
     * save query模块
     * @returns {Boolean} 真(成功+附带输出结果)假(失败)
     */
    function save_query() {
        let return_value = mc.runcmdEx('save query')
        let messages = return_value.output
        let ready = return_value.success

        if (!ready) {
            pluginPrint(tr("backup.server_not_ready"), "ERROR")
            mc.runcmd("save resume")
            return false
        }

        // NOTE: 创建备份文件夹
        if (!File.exists(pluginConfig.get("BackupFolderPath"))) {
            File.mkdir(pluginConfig.get("BackupFolderPath"))
        }
        // NOTE: 检测tmp文件夹是否存在，清空tmp文件夹
        if (File.exists(backup_tmp_path)) {
            File.delete(backup_tmp_path)
            File.mkdir(backup_tmp_path)
        } else {
            File.mkdir(backup_tmp_path)
        }

        // NOTE: 复制文件(备份存档)
        // #region 复制文件(备份存档)
        for (let i = 0; i < world_folder_list.length; i++) {
            let currentPath = world_folder_path + world_folder_list[i]

            // 调试信息(在配置文件中Debug_MoreLogs开启)
            if (Debug_Morelogs) {
                // logger.log('[Debug] ' + "操作中：" + `${world_folder_list[i]} --> ${currentPath}`)
                pluginPrint(tr("backup.copying_file", world_folder_list[i], currentPath), "DEBUG")
            }
            // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
            if (Debug_Morelogs_Player) {
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell('[Debug] ' + "操作中：" + `${world_folder_list[i]} --> ${currentPath}`)
                }
            }

            // 检查是否为目录
            if (File.checkIsDir(currentPath)) {
                // 创建备份目录
                let backupDirPath = backup_tmp_path + world_folder_list[i]
                File.mkdir(backupDirPath)

                // 递归复制子目录
                copy_return = copyDirectory(currentPath, backupDirPath, pl)
            } else {
                // 如果是文件，直接复制
                File.copy(currentPath, backup_tmp_path)
                copy_return = true
            }
        }
        // #endregion

        // NOTE: 截取文件
        // #region 截取文件
        let messageLines = messages.split("\n")
        let filePaths = messageLines[1].split(", ") // 去掉多余的日志之后的内容
        // fastLog(filePaths)

        new JsonConfigFile(
            "./file_paths_tmp.json",
            JSON.stringify(filePaths)
        )

        // NOTE: 创建日志文件夹
        if (!File.exists("./logs/EasyBackuper/")) {
            File.mkdir("./logs/EasyBackuper/")
        }

        // 调用 mhlove-truncate.exe 截取文件
        system.newProcess(`cmd /c ${pluginConfig.get("exe_mhlove_truncate_path")} "./file_paths_tmp.json" "${backup_tmp_path}"`, (exitcode, output) => {
            if (exitcode === 0) {
                pluginPrint(`\n${output}`, "DEBUG")
                pluginPrint(tr("backup.truncate_success"), "SUCCESS")
                File.delete("./file_paths_tmp.json")
            } else {
                pluginPrint(`\n${output}`, "DEBUG")
                pluginPrint(tr("backup.truncate_failed"), "ERROR")
                File.delete("./file_paths_tmp.json")
            }
        })
        // return true

        // #endregion

        // NOTE: 获取当前时间
        function padZero(num) {
            return num.toString().padStart(2, '0');
        }

        let timeObj = system.getTimeObj();
        // 获取压缩格式配置
        const compression = pluginConfig.get("Compression")
        const method = compression.method || "7z"
        const format = compression.formats[method] || compression.formats["7z"]
        const extension = format.extension || ".7z"
        const compress_args = format.compress_args || ["a", "-t7z", "-mx=5"]

        let archive_name = timeObj.Y + '_' +
            padZero(timeObj.M) + '_' +
            padZero(timeObj.D) + '=' +
            padZero(timeObj.h) + '-' +
            padZero(timeObj.m) + '-' +
            padZero(timeObj.s) + `[${world_level_name}]${extension}`;

        // NOTE: 压缩存档(tmp文件夹)
        // #region 压缩存档(tmp文件夹)
        setTimeout(() => {
            // 移除路径末尾的斜杠，避免双斜杠
            let backup_folder = pluginConfig.get("BackupFolderPath")
            if (backup_folder.endsWith("/") || backup_folder.endsWith("\\")) {
                backup_folder = backup_folder.slice(0, -1)
            }
            let backup_tmp = backup_tmp_path
            if (backup_tmp.endsWith("/") || backup_tmp.endsWith("\\")) {
                backup_tmp = backup_tmp.slice(0, -1)
            }
            system.newProcess(pluginConfig.get("exe_7z_path") + ' a -tzip ' + '"' + backup_folder + `/${archive_name}` + '"' + ` ${backup_tmp}/*`, (exit, out) => {
                pluginPrint(tr("backup.compressing"), "INFO") // 提示信息

                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(tr("backup.compressing"))
                }

                // 将7za的输出写入日志文件
                pluginPrint(tr("backup.compressing_7za_exit", exit), "INFO")
                if (out && out.trim()) {
                    pluginPrint(`7za output:\n${out}`, "INFO")
                }
                // 调试信息(在配置文件中Debug_MoreLogs_Player开启)
                if (Debug_Morelogs_Player) {
                    // 提醒使用该指令玩家
                    if (yes_no_console == 0) {
                        pl.tell(`[Debug] 7za exit code: ${exit}`)
                        if (out && out.trim()) {
                            pl.tell(`[Debug] 7za output:\n${out}`)
                        }
                    }
                }

                compress_return = exit
            })
        }, 2000)
        // #endregion

        // NOTE: 检查是否拷贝成功
        // #region 检查是否拷贝成功
        let check_copy = setInterval(() => {
            if (copy_return) { // 感觉没必要判断复制成功或失败，一般情况都是可以复制成功的
                pluginPrint(tr("backup.copy_success"), "SUCCESS")

                // 全体广播备份情况
                // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
                if (broadcast_status) {
                    mc.broadcast(tr("backup.copy_success_broadcast"), 0)
                    mc.broadcast(tr("backup.copy_success_broadcast"), 5)
                }
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(tr("backup.copy_success"))
                }

                mc.runcmd("save resume") // 恢复存档写入
                clearInterval(check_copy) // 退出循环函数
            } else {
                pluginPrint(tr("backup.copy_failed"), "ERROR")

                // 全体广播备份情况
                // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
                if (broadcast_status) {
                    mc.broadcast(tr("backup.copy_failed_broadcast"), 0)
                    mc.broadcast(tr("backup.copy_failed_broadcast"), 5)
                }
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(tr("backup.copy_failed"))
                }

                mc.runcmd("save resume") // 恢复存档写入
                is_backing_up = false
                File.delete(backup_tmp_path)
                clearInterval(check_copy) // 退出循环函数
            }
        }, 200)
        // #endregion

        // NOTE: 检查是否压缩成功
        let check_compress = setInterval(() => {
            if (compress_return == 0) {
                let backup_folder = pluginConfig.get("BackupFolderPath")
                // 移除路径末尾的斜杠，避免双斜杠
                if (backup_folder.endsWith("/") || backup_folder.endsWith("\\")) {
                    backup_folder = backup_folder.slice(0, -1)
                }
                let archivePath = backup_folder + `/${archive_name}`

                // 使用 File 获取压缩包大小
                try {
                    const file_obj = new File(archivePath, File.ReadMode)
                    let archiveSize = file_obj.size || 0 // 获取压缩包大小
                    file_obj.close()
                    let archiveSizeMB = (archiveSize / (1024 * 1024)).toFixed(2) // 转换为MB并保留两位小数

                    pluginPrint(tr("backup.success", archivePath, archiveSizeMB), "SUCCESS")

                    // 全体广播备份情况
                    // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
                    if (broadcast_status) {
                        mc.broadcast(tr("backup.success_broadcast") + archive_name + " (" + archiveSizeMB + " MB)", 0)
                        mc.broadcast(tr("backup.success_broadcast") + archive_name + " (" + archiveSizeMB + " MB)", 5)

                        // 通知全体玩家(类似于成就获得提示)
                        Notice_Upper(broadcast_Backup_success_Title, broadcast_Backup_success_Message)
                    }
                    // 提醒使用该指令玩家
                    if (yes_no_console == 0) {
                        pl.tell(tr("backup.success", archivePath, archiveSizeMB))
                    }
                    File.delete(backup_tmp_path)

                    // 重置备份状态，允许下次 cron 触发
                    is_backing_up = false

                    // 开始清除冗余备份
                    auto_cleaup = pluginConfig.get('Auto_Clean')
                    use_number_detection = auto_cleaup['Use_Number_Detection']
                    use_number_detection_mode = use_number_detection['Mode']
                    switch (use_number_detection_mode) {
                        case 1: // 在备份后清理
                            Clean_Backup_Files()
                            break;

                        case 2: // 在开服时，备份时清理
                            Clean_Backup_Files()
                            break;
                        default:
                            break;
                    }

                    clearInterval(check_compress) // 退出循环函数

                    // 调用回调函数
                    if (callback && typeof callback === "function") {
                        callback(true, archivePath)
                    }
                } catch (e) {
                    pluginPrint(tr("backup.get_size_failed", String(e)), "ERROR")
                    pluginPrint(tr("backup.compress_error"), "ERROR")

                    // 全体广播备份情况
                    // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
                    if (broadcast_status) {
                        mc.broadcast(tr("backup.failed_broadcast"), 0)
                        mc.broadcast(tr("backup.failed_broadcast"), 5)

                        // 通知全体玩家(类似于成就获得提示)
                        Notice_Upper(broadcast_Backup_wrong_Title, broadcast_Backup_wrong_Message)
                    }
                    // 提醒使用该指令玩家
                    if (yes_no_console == 0) {
                        pl.tell(tr("backup.compress_error"))
                    }

                    File.delete(backup_tmp_path)
                    is_backing_up = false
                    clearInterval(check_compress) // 退出循环函数

                    // 调用回调函数
                    if (callback && typeof callback === "function") {
                        callback(false, null)
                    }
                }
            } else if (compress_return == 1) {
                pluginPrint(tr("backup.compress_error"), "ERROR")

                // 全体广播备份情况
                // type可选数字: 0-普通消息(Raw), 1-聊天消息(Chat) 5-物品栏上方的消息(Tip)
                if (broadcast_status) {
                    mc.broadcast(tr("backup.failed_broadcast"), 0)
                    mc.broadcast(tr("backup.failed_broadcast"), 5)

                    // 通知全体玩家(类似于成就获得提示)
                    Notice_Upper(broadcast_Backup_wrong_Title, broadcast_Backup_wrong_Message)
                }
                // 提醒使用该指令玩家
                if (yes_no_console == 0) {
                    pl.tell(tr("backup.compress_error"))
                }

                File.delete(backup_tmp_path)
                is_backing_up = false
                clearInterval(check_compress) // 退出循环函数

                // 调用回调函数
                if (callback && typeof callback === "function") {
                    callback(false, null)
                }
            }
        }, 200)
        // #endregion

        return false
    }
    // #endregion
    setTimeout(() => {
        save_query()
    }, 1000);
}
// #endregion

// TAG: 回档模块
// #region 回档模块
/**
 * 列出可用的备份文件
 * @param {CommandOrigin} origin 命令发送者
 * @param {Number} limit 显示的备份数量限制
 */
function listBackups(origin, limit = 10) {
    try {
        const backup_folder = pluginConfig.get("BackupFolderPath")
        if (!File.exists(backup_folder)) {
            const msg = `§c[EasyBackuper] §f` + tr("restore.no_backups")
            pluginPrint(tr("restore.no_backups"), "WARNING")
            if (origin.typeName == "Player") {
                pl = mc.getPlayer(origin.player.realName)
                pl.tell(msg)
            }
            return
        }

        // 获取所有备份文件（支持多种压缩格式）
        let backup_files = []
        const supported_extensions = [".zip", ".7z", ".tar.gz", ".tgz"]

        for (const ext of supported_extensions) {
            const files = File.getFilesList(backup_folder)
            for (const file of files) {
                if (file.endsWith(ext)) {
                    const file_path = `${backup_folder}/${file}`
                    try {
                        const file_obj = new File(file_path, File.ReadMode)
                        let mtime = 0
                        let size = 0

                        // 尝试从文件对象获取修改时间和大小
                        if (file_obj.lastModified) {
                            mtime = file_obj.lastModified.getTime()
                        }
                        if (file_obj.size) {
                            size = file_obj.size
                        }

                        // 如果无法从文件对象获取时间，尝试从文件名中解析
                        if (mtime === 0) {
                            // 文件名格式: 2026_02_03=22-26-44[Bedrock level].zip
                            const match = file.match(/(\d{4})_(\d{2})_(\d{2})=(\d{2})-(\d{2})-(\d{2})/)
                            if (match) {
                                const [, year, month, day, hour, minute, second] = match
                                mtime = new Date(year, month - 1, day, hour, minute, second).getTime()
                            }
                        }

                        backup_files.push({
                            name: file,
                            mtime: mtime,
                            size: size
                        })
                        file_obj.close()
                    } catch (e) {
                        pluginPrint(`无法获取文件信息: ${file_path}, 错误: ${e}`, "WARNING")
                    }
                }
            }
        }

        // 按修改时间倒序排序（最新的在前）
        backup_files.sort((a, b) => b.mtime - a.mtime)

        // 限制显示数量
        backup_files = backup_files.slice(0, limit)

        if (backup_files.length === 0) {
            const msg = `§c[EasyBackuper] §f` + tr("restore.no_backups")
            pluginPrint(tr("restore.no_backups"), "WARNING")
            if (origin.typeName == "Player") {
                pl = mc.getPlayer(origin.player.realName)
                pl.tell(msg)
            }
            return
        }

        // 发送备份列表
        const header = `§a[EasyBackuper] §f` + tr("restore.list_header")
        if (origin.typeName == "Player") {
            pl = mc.getPlayer(origin.player.realName)
            pl.tell(header)
            for (let i = 0; i < backup_files.length; i++) {
                const file = backup_files[i]
                const file_size = formatFileSize(file.size)
                const item = `§a[EasyBackuper] §f` + tr("restore.list_item", String(i + 1), file.name, file_size)
                pl.tell(item)
            }
            pl.tell(`§a[EasyBackuper] §f=====================`)
        } else {
            pluginPrint(tr("restore.list_header"), "INFO")
            for (let i = 0; i < backup_files.length; i++) {
                const file = backup_files[i]
                const file_size = formatFileSize(file.size)
                const item = tr("restore.list_item", String(i + 1), file.name, file_size)
                pluginPrint(item, "INFO")
            }
            pluginPrint("=====================", "INFO")
        }
    } catch (e) {
        pluginPrint(tr("restore.list_error", String(e)), "ERROR")
        pluginPrint(`错误堆栈: ${e.stack}`, "ERROR")
        const msg = `§c[EasyBackuper] §f${tr("restore.failed", String(e))}`
        if (origin.typeName == "Player") {
            pl = mc.getPlayer(origin.player.realName)
            pl.tell(msg)
        }
        pluginPrint(tr("restore.failed", String(e)), "ERROR")
    }
}

/**
 * 开始回档操作
 * @param {CommandOrigin} origin 命令发送者
 * @param {Number} restore_index 备份索引（从1开始）
 */
function startRestore(origin, restore_index) {
    pluginPrint(tr("restore.start_with_index", String(restore_index)), "INFO")

    // 保存玩家名称，避免在回调中访问origin.player
    let player_name = null;
    if (origin && origin.typeName == "Player" && origin.player) {
        player_name = origin.player.realName;
    }

    // 检查origin对象是否存在
    if (typeof origin === 'undefined' || origin === null) {
        yes_no_console = 1
    } else {
        // 判断指令主体是什么
        if (origin.typeName == "Player") {
            yes_no_console = 0
        } else {
            yes_no_console = 1
        }
    }

    // 检查是否正在备份
    if (is_backing_up) {
        pluginPrint(tr("restore.rejected_backup_running"), "WARNING")
        pluginPrint(tr("restore.wait_backup"), "WARNING")
        const msg = `§c[EasyBackuper] §f` + tr("restore.wait_backup")
        if (yes_no_console == 0) {
            pl = mc.getPlayer(origin.player.realName)
            pl.tell(msg)
        }
        return
    }

    // 检查是否正在回档
    if (is_restoring) {
        pluginPrint(tr("restore.rejected_restore_running"), "WARNING")
        pluginPrint(tr("restore.wait_restore"), "WARNING")
        const msg = `§c[EasyBackuper] §f` + tr("restore.wait_restore")
        if (yes_no_console == 0) {
            pl = mc.getPlayer(origin.player.realName)
            pl.tell(msg)
        }
        return
    }

    try {
        pluginPrint(tr("restore.processing"), "INFO")

        let backup_folder = pluginConfig.get("BackupFolderPath")
        // 移除路径末尾的斜杠
        if (backup_folder.endsWith("/") || backup_folder.endsWith("\\")) {
            backup_folder = backup_folder.slice(0, -1)
        }

        if (!File.exists(backup_folder)) {
            pluginPrint(tr("restore.world_not_found", backup_folder), "ERROR")
            const msg = `§c[EasyBackuper] §f` + tr("restore.world_not_found", backup_folder)
            if (yes_no_console == 0) {
                pl = mc.getPlayer(origin.player.realName)
                pl.tell(msg)
            }
            return
        }

        // 获取所有备份文件（支持多种压缩格式）
        pluginPrint(tr("restore.scanning", backup_folder), "INFO")
        let backup_files = []
        const supported_extensions = [".zip", ".7z", ".tar.gz", ".tgz"]

        for (const ext of supported_extensions) {
            const files = File.getFilesList(backup_folder)
            for (const file of files) {
                if (file.endsWith(ext)) {
                    const file_path = `${backup_folder}/${file}`
                    try {
                        const file_obj = new File(file_path, File.ReadMode)
                        let mtime = 0

                        // 尝试从文件对象获取修改时间
                        if (file_obj.lastModified) {
                            mtime = file_obj.lastModified.getTime()
                        }

                        // 如果无法从文件对象获取时间，尝试从文件名中解析
                        if (mtime === 0) {
                            // 文件名格式: 2026_02_03=22-26-44[Bedrock level].zip
                            const match = file.match(/(\d{4})_(\d{2})_(\d{2})=(\d{2})-(\d{2})-(\d{2})/)
                            if (match) {
                                const [, year, month, day, hour, minute, second] = match
                                mtime = new Date(year, month - 1, day, hour, minute, second).getTime()
                            }
                        }

                        backup_files.push({
                            name: file,
                            path: file_path,
                            mtime: mtime
                        })
                        file_obj.close()
                    } catch (e) {
                        pluginPrint(`无法获取文件信息: ${file_path}, 错误: ${e}`, "WARNING")
                    }
                }
            }
        }

        pluginPrint(tr("restore.found_count", String(backup_files.length)), "INFO")

        // 按修改时间倒序排序（最新的在前）
        backup_files.sort((a, b) => b.mtime - a.mtime)

        // 检查索引是否有效
        if (restore_index < 1 || restore_index > backup_files.length) {
            pluginPrint(tr("restore.invalid_index_range", String(restore_index), String(backup_files.length)), "ERROR")
            const msg = `§c[EasyBackuper] §f` + tr("restore.invalid_index", String(restore_index))
            if (yes_no_console == 0) {
                pl = mc.getPlayer(origin.player.realName)
                pl.tell(msg)
            }
            return
        }

        // 检查是否需要在回档前备份当前的世界
        const restore_config = pluginConfig.get("Restore")
        const backup_old_world = restore_config.backup_old_world_before_restore
        if (backup_old_world) {
            pluginPrint(tr("restore.backup_current"), "INFO")

            // 使用回调函数来等待备份完成
            // 保存玩家对象，避免在回调中访问origin.player
            let restore_player = null;
            if (origin && origin.typeName == "Player" && origin.player) {
                restore_player = origin.player;
            }

            Backup(restore_player, (success, archivePath) => {
                if (success) {
                    pluginPrint(tr("restore.backup_done", archivePath), "SUCCESS")
                    // 继续回档流程，传递玩家名称而不是origin对象
                    let player_name = null;
                    if (restore_player) {
                        player_name = restore_player.realName;
                    }
                    continueRestore(player_name, restore_index, backup_files)
                } else {
                    pluginPrint(tr("restore.backup_failed_cancel"), "ERROR")
                    const msg = `§c[EasyBackuper] §f` + tr("restore.backup_failed_cancel")
                    let player_name = null;
                    if (restore_player) {
                        player_name = restore_player.realName;
                    }
                    if (yes_no_console == 0 && player_name) {
                        pl = mc.getPlayer(player_name)
                        if (pl) {
                            pl.tell(msg)
                        }
                    }
                    return
                }
            })

            // 在这里返回，等待回调函数继续执行
            return
        } else {
            // 不需要备份，直接继续回档流程
            continueRestore(origin, restore_index, backup_files)
        }
    } catch (e) {
        pluginPrint(tr("restore.failed", String(e)), "ERROR")
        const msg = `§c[EasyBackuper] §f` + tr("restore.failed", String(e))
        if (yes_no_console == 0 && player_name) {
            pl = mc.getPlayer(player_name)
            if (pl) {
                pl.tell(msg)
            }
        }
    }
}
// #endregion

/**
 * 继续回档操作（在备份完成后调用）
 * @param {String} player_name 玩家名称
 * @param {Number} restore_index 备份索引（从1开始）
 * @param {Array} backup_files 备份文件列表
 */
function continueRestore(player_name, restore_index, backup_files) {
    // 使用传入的玩家名称

    try {
        pluginPrint(tr("restore.processing"), "INFO")

        // 获取选中的备份文件
        const selected_backup = backup_files[restore_index - 1]

        // 格式化时间
        const time_str = new Date(selected_backup.mtime).toLocaleString()

        pluginPrint(tr("restore.selected_file", selected_backup.name, time_str), "INFO")
        pluginPrint(tr("restore.selected_path", selected_backup.path), "INFO")

        // 开始解压备份文件
        pluginPrint(tr("restore.extracting"), "INFO")

        // 创建临时解压目录
        const temp_restore_dir = "./temp_restore/"
        if (!File.exists(temp_restore_dir)) {
            File.mkdir(temp_restore_dir)
        }

        // 使用 7za 解压备份文件
        let exe_7z_path = pluginConfig.get("exe_7z_path")
        // 移除路径末尾的斜杠
        if (exe_7z_path.endsWith("/") || exe_7z_path.endsWith("\\")) {
            exe_7z_path = exe_7z_path.slice(0, -1)
        }
        // 将路径转换为正斜杠格式
        exe_7z_path = exe_7z_path.replace(/\\/g, "/")

        // 修复备份文件路径中的双斜杠
        let backup_path = selected_backup.path.replace(/\\/g, "/").replace(/\\/g, "/")

        // 构建解压命令，避免引号问题
        // 构建解压命令参数
        const extract_args = [
            "x",
            `"${backup_path}"`,
            `-o"${temp_restore_dir}"`,
            "-y"
        ]

        pluginPrint(tr("restore.extract_cmd", exe_7z_path, extract_args.join(" ")), "INFO")
        pluginPrint(`7za路径: ${exe_7z_path}`, "INFO")
        pluginPrint(`备份路径: ${backup_path}`, "INFO")
        pluginPrint(`解压目录: ${temp_restore_dir}`, "INFO")

        system.newProcess(`${exe_7z_path} ${extract_args.join(" ")}`, (exitcode, output) => {
            if (exitcode === 0) {
                pluginPrint(tr("restore.extract_success"), "SUCCESS")

                // 创建回档标记文件
                const restore_marker_file = "./temp_restore/restore_marker.json"
                const marker_content = JSON.stringify({
                    backup_file: selected_backup.name,
                    backup_path: selected_backup.path,
                    backup_time: selected_backup.mtime,
                    world_name: world_level_name,
                    world_path: world_folder_path
                })

                File.writeTo(restore_marker_file, marker_content)
                pluginPrint(tr("restore.marker_created"), "SUCCESS")

                // 通知用户
                const msg = `§a[EasyBackuper] §f` + tr("restore.complete_msg", selected_backup.name)
                if (yes_no_console == 0 && player_name) {
                    pl = mc.getPlayer(player_name)
                    if (pl) {
                        pl.tell(msg)
                    }
                }

                pluginPrint(tr("restore.close_server"), "INFO")
            } else {
                pluginPrint(tr("restore.extract_failed", exitcode), "ERROR")
                pluginPrint(tr("restore.extract_output", output), "ERROR")
                const msg = `§c[EasyBackuper] §f` + tr("restore.extract_failed", exitcode)
                if (yes_no_console == 0 && player_name) {
                    pl = mc.getPlayer(player_name)
                    if (pl) {
                        pl.tell(msg)
                    }
                }
            }
        })
    } catch (e) {
        pluginPrint(tr("restore.continue_error", String(e)), "ERROR")
        pluginPrint(`错误堆栈: ${e.stack}`, "ERROR")
        const msg = `§c[EasyBackuper] §f` + tr("restore.failed", String(e))
        if (yes_no_console == 0 && player_name) {
            pl = mc.getPlayer(player_name)
            if (pl) {
                pl.tell(msg)
            }
        }
        pluginPrint(formatString("回档失败: %s", String(e)), "ERROR")
    }
}
// #endregion

// TAG: 重载插件模块
// #region 重载配置文件
/**
 * 重载配置文件
 * @returns {Array} (数组)配置文件重载状态[0]
 */
function ReloadPlugin() {
    pluginConfig.reload() // 配置文件重载
    migrateConfig();      // 合并新版本新增的配置项
    initI18n();
    // Debug相关
    Debug_Morelogs = pluginConfig.get("Debug_MoreLogs")
    Debug_Morelogs_Player = pluginConfig.get("Debug_MoreLogs_Player")
    Debug_Morelogs_Cron = pluginConfig.get("Debug_MoreLogs_Cron")
    // Cron配置重载
    scheduled_tasks = pluginConfig.get('Scheduled_Tasks')
    scheduled_tasks_status = scheduled_tasks['Status']
    scheduled_tasks_cron = scheduled_tasks['Cron']
    cronExpr = scheduled_tasks_cron
    parsed = parseCronExpression(cronExpr)
    // 重启 Cron 调度器（应用新的 cron 表达式和开关状态）
    restartCronScheduler()
    // Auto_Clean重载
    auto_cleaup = pluginConfig.get('Auto_Clean')
    use_number_detection = auto_cleaup['Use_Number_Detection']
    use_number_detection_status = use_number_detection['Status']
    use_number_detection_max_number = use_number_detection['Max_Number']
    use_number_detection_mode = use_number_detection['Mode']
    return true
}
// #endregion


// TAG: 初始化配置文件模块
// #region 初始化配置文件模块
function InitPluginConfig() {
    // 检测配置文件是否存在
    if (File.exists(plugin_path + `/config/${plugin_name}.json`)) {
        File.delete(plugin_path + `/config/${plugin_name}.json`)
    }

    // 重新创建配置文件
    new JsonConfigFile(
        plugin_path + `/config/${plugin_name}.json`,
        JSON.stringify(pluginConfigFile)
    )
}
// #endregion

// TAG: 注册指令模块
// #region 注册指令
/**
 * 注册指令
 */
function RegisterCmd() {
    const backup_cmd = mc.newCommand("backup", tr("cmd.backup_desc"), PermType.GameMasters)
    backup_cmd.setAlias("easybackup") // 设置别名

    backup_cmd.setEnum("ReloadAction", ["reload"]) // 添加枚举选项
    backup_cmd.setEnum("InitConfig", ["init"]) // 同上

    backup_cmd.mandatory("action", ParamType.Enum, "ReloadAction", 1) // 赋予指令选项属性(展开枚举选项,必选参数)
    backup_cmd.mandatory("action", ParamType.Enum, "InitConfig", 1) // 同上

    // backup_cmd.optional("name", ParamType.RawText) // 同上
    // backup_cmd.optional("abcd", ParamType.RawText) // 同上(可选)

    backup_cmd.overload([])
    // backup_cmd.overload(["ReloadAction", "name", "abcd"]) // 指令重载(必须有的且我不理解的东西)
    backup_cmd.overload(["ReloadAction"]) // 指令重载(必须有的且我不理解的东西)
    backup_cmd.overload(["InitConfig"]) // 同上

    // NOTE: 指令回调处理
    // #region 指令回调处理
    backup_cmd.setCallback((_backup_cmd, origin, output, results) => {
        // 如果有选项就进行判断
        switch (results.action) {
            case "reload": // 重载插件配置
                ReloadPlugin()
                let x = tr("cmd.reloading") + '\n' + tr("cmd.config_reloaded") + '\n' + '\n'
                let y = tr("cmd.auto_backup_status") + scheduled_tasks_status + '\n' + tr("cmd.auto_clean_status") + use_number_detection_status + '\n'
                let z = tr("cmd.debug_console") + pluginConfig.get('Debug_MoreLogs') + '\n' + tr("cmd.debug_player") + pluginConfig.get('Debug_MoreLogs_Player') + '\n' + tr("cmd.debug_cron") + pluginConfig.get('Debug_MoreLogs_Cron')
                return output.success(x + y + z)

            case "init": // 初始化配置文件
                InitPluginConfig()
                ReloadPlugin()
                let e = tr("cmd.reloading") + '\n' + tr("cmd.config_reloaded") + '\n' + '\n'
                let f = tr("cmd.auto_backup_status") + scheduled_tasks_status + '\n' + tr("cmd.auto_clean_status") + use_number_detection_status + '\n'
                let g = tr("cmd.debug_console") + pluginConfig.get('Debug_MoreLogs') + '\n' + tr("cmd.debug_player") + pluginConfig.get('Debug_MoreLogs_Player') + '\n' + tr("cmd.debug_cron") + pluginConfig.get('Debug_MoreLogs_Cron')
                return output.success(tr("cmd.init_success") + '\n' + e + f + g)
        }

        // 默认/backup指令后执行的代码
        // 当玩家执行时检测并传参
        Start(origin)

    })
    // #endregion
    backup_cmd.setup() // 指令初始化(必须)

    // 注册restore指令
    const restore_cmd = mc.newCommand("restore", tr("cmd.restore_desc"), PermType.GameMasters)
    restore_cmd.setEnum("RestoreAction", ["list"])

    restore_cmd.mandatory("action", ParamType.Enum, "RestoreAction", 1)
    restore_cmd.optional("index", ParamType.Int)
    restore_cmd.optional("count", ParamType.Int)

    restore_cmd.overload([])
    restore_cmd.overload(["RestoreAction", "count"])
    restore_cmd.overload(["index"])

    // restore指令回调处理
    restore_cmd.setCallback((_cmd, origin, output, results) => {
        // 检查权限
        if (origin.typeName == "Player") {
            pl = mc.getPlayer(origin.player.realName)
            if (!pl.isOP()) {
                pl.tell(tr("cmd.permission_denied"))
                return output.success()
            }
        }

        // 处理restore命令
        if (results.action === "list") {
            // 列出备份
            let limit = 10
            if (results.count !== undefined) {
                limit = results.count
            }
            listBackups(origin, limit)
        } else if (results.index !== undefined) {
            // 执行回档
            startRestore(origin, results.index)
        } else {
            // 显示帮助信息
            if (origin.typeName == "Player") {
                pl = mc.getPlayer(origin.player.realName)
                pl.tell(tr("cmd.restore_help"))
            } else {
                logger.log(tr("cmd.restore_help"))
            }
        }

        return output.success()
    })

    restore_cmd.setup()
}
// #endregion


// TAG: 加载插件模块
// #region 加载插件
/**
 * 加载插件
 */
function Loadplugin() {
    migrateConfig();
    initI18n();
    // NOTE: 输出插件LOGO
    logger.setTitle(`\x1b[32m${plugin_name}\x1b[0m`) // 设置日志头
    pluginPrint(`
███████╗ █████╗ ███████╗██╗   ██╗██████╗  █████╗  ██████╗██╗  ██╗██╗   ██╗██████╗ ███████╗██████╗             
██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝██╔══██╗██╔══██╗██╔════╝██║ ██╔╝██║   ██║██╔══██╗██╔════╝██╔══██╗                
█████╗  ███████║███████╗ ╚████╔╝ ██████╔╝███████║██║     █████╔╝ ██║   ██║██████╔╝█████╗  ██████╔╝
██╔══╝  ██╔══██║╚════██║  ╚██╔╝  ██╔══██╗██╔══██║██║     ██╔═██╗ ██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗
███████╗██║  ██║███████║   ██║   ██████╔╝██║  ██║╚██████╗██║  ██╗╚██████╔╝██║     ███████╗██║  ██║ 
╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝   `)
    pluginPrint(tr("plugin.author_version", plugin_version))
    pluginPrint("================================================================================")
    pluginPrint(`${plugin_name} - ${plugin_description}`)
    pluginPrint(tr("plugin.thanks"))
    pluginPrint(tr("plugin.license_info", plugin_license))
    pluginPrint(tr("plugin.github", plugin_github_link))
    pluginPrint(tr("plugin.minebbs", plugin_minebbs_link))
    pluginPrint(tr("plugin.qq_group"))
    pluginPrint(tr("plugin.author_version", plugin_version))
    pluginPrint("================================================================================")

    let a = tr("cmd.auto_backup_status") + (scheduled_tasks_status ? tr("status.enabled") : tr("status.disabled"))
    let b = tr("cmd.auto_clean_status") + (use_number_detection_status ? tr("status.enabled") : tr("status.disabled"))
    let c = tr("cmd.debug_console") + (pluginConfig.get('Debug_MoreLogs') ? tr("status.enabled") : tr("status.disabled"))
    let d = tr("cmd.debug_player") + (pluginConfig.get('Debug_MoreLogs_Player') ? tr("status.enabled") : tr("status.disabled"))
    let e = tr("cmd.debug_cron") + (pluginConfig.get('Debug_MoreLogs_Cron') ? tr("status.enabled") : tr("status.disabled"))
    let bstatsConf = pluginConfig.get("Bstats") || {};
    let f = tr("plugin.bstats_status") + (bstatsConf.EnableModule ? tr("status.enabled") : tr("status.disabled"))
    pluginPrint(a)
    pluginPrint(b)
    pluginPrint(c)
    pluginPrint(d)
    pluginPrint(e)
    pluginPrint(f)
    pluginPrint("================================================================================")

    // 初始化BStats
    try {
        bstatsInstance = new BStatsImpl(29845);
        bstatsInstance.start();
    } catch (e) {
        pluginPrint(tr("plugin.bstats_init_failed", String(e)), "ERROR");
    }

    // 检查是否有回档标记文件
    const restore_marker_file = "./temp_restore/restore_marker.json"
    if (File.exists(restore_marker_file)) {
        pluginPrint(tr("restore.marker_detected"), "INFO")

        try {
            // 读取标记文件
            const marker_content = File.readFrom(restore_marker_file)
            const marker_data = JSON.parse(marker_content)

            // 立即删除标记文件
            File.delete(restore_marker_file)
            pluginPrint(tr("restore.marker_deleted"), "INFO")

            pluginPrint(`回档信息:`, "INFO")
            pluginPrint(`  备份文件: ${marker_data.backup_file}`, "INFO")
            pluginPrint(`  世界名称: ${marker_data.world_name}`, "INFO")
            pluginPrint(`  世界路径: ${marker_data.world_path}`, "INFO")

            // 检查解压的文件是否存在
            const temp_restore_dir = "./temp_restore/"
            // 备份时世界文件夹直接在backup_tmp目录下
            const extracted_world_dir = `${temp_restore_dir}`

            // 列出temp_restore目录下的所有文件和文件夹
            pluginPrint(`检查目录: ${temp_restore_dir}`, "DEBUG")
            try {
                const files = File.getFilesList(temp_restore_dir)
                pluginPrint(`找到 ${files.length} 个文件/文件夹:`, "DEBUG")
                for (const file of files) {
                    pluginPrint(`  - ${file}`, "DEBUG")
                }

                // 列出backup_tmp目录下的所有文件和文件夹
                const backup_tmp_dir = `${temp_restore_dir}`
                pluginPrint(`检查目录: ${backup_tmp_dir}`, "DEBUG")
                const backup_tmp_files = File.getFilesList(backup_tmp_dir)
                pluginPrint(`找到 ${backup_tmp_files.length} 个文件/文件夹:`, "DEBUG")
                for (const file of backup_tmp_files) {
                    pluginPrint(`  - ${file}`, "DEBUG")
                }
            } catch (e) {
                pluginPrint(`列出目录失败: ${e}`, "ERROR")
            }

            if (!File.exists(extracted_world_dir)) {
                pluginPrint(`错误: 解压的世界目录不存在: ${extracted_world_dir}`, "ERROR")
                File.delete(restore_marker_file)
                return
            }

            // 删除原来的世界文件夹
            if (File.exists(marker_data.world_path)) {
                pluginPrint(tr("restore.deleting_world", marker_data.world_path), "INFO")
                File.delete(marker_data.world_path)
                pluginPrint(tr("restore.world_deleted"), "SUCCESS")
            }

            // 移动解压的世界文件夹到目标位置
            pluginPrint(tr("restore.moving_world", extracted_world_dir, marker_data.world_path), "INFO")
            copyDirectory(extracted_world_dir, marker_data.world_path)
            pluginPrint(tr("restore.world_moved"), "SUCCESS")

            // 删除解压的临时文件夹
            pluginPrint(`正在删除临时文件夹: ${temp_restore_dir}`, "INFO")
            File.delete(temp_restore_dir)
            pluginPrint(tr("restore.temp_deleted"), "SUCCESS")

            pluginPrint(tr("restore.done"), "SUCCESS")
        } catch (e) {
            pluginPrint(`回档操作失败: ${e}`, "ERROR")
            pluginPrint(`错误堆栈: ${e.stack}`, "ERROR")
        }
    }

    // NOTE: "onServerStarted"
    mc.listen("onServerStarted", () => {
        // 清理冗余备份压缩包
        // 获取配置文件中Auto_Clean配置内容
        auto_cleaup = pluginConfig.get('Auto_Clean')
        // 读取"Use_Number_Detection"
        use_number_detection = auto_cleaup['Use_Number_Detection']

        // 读取"Use_Number_Detection"中的Mode模式
        use_number_detection_mode = use_number_detection['Mode']
        switch (use_number_detection_mode) {
            case 0: // 在开服后清理
                Clean_Backup_Files()
                break;

            case 2: // 在开服时，备份时清理
                Clean_Backup_Files()
                break;
            default:
                break;
        }
        // 注册指令
        RegisterCmd()

        // TAG: 适配 EasyCheckUpdate
        // #region 适配 EasyCheckUpdate
        function CheckUpdate() {
            return {
                update_url: plugin_update_url,
                plugin_version: plugin_version
            }
        }
        if (!ll.hasExported("ecu", "EasyCheckUpdate")) {
            pluginPrint(tr("plugin.update_hint"), "WARNING")
        } else {
            ll.exports(CheckUpdate, "ecu", `${plugin_name}`)
        }
        // #endregion
    })
    // 启动 Cron 定时调度器（setInterval 每秒检测，替代 onTick 轮询）
    if (scheduled_tasks_status) {
        startCronScheduler()
    }

}

// NOTE: "onUnload"
ll.onUnload(() => {
    stopCronScheduler()
    pluginPrint(tr("plugin.unloading"), "INFO")
    pluginPrint(tr("plugin.unloaded"), "INFO")
})
// #endregion

// 加载插件
Loadplugin()