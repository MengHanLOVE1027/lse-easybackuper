use rayon::prelude::*;
use std::fs;
use std::path::Path;
use std::process;

// ── 语言环境检测 ──────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq)]
enum Lang {
    Zh,
    En,
}

/// 检测系统语言环境，返回 Lang::Zh 或 Lang::En
fn detect_lang() -> Lang {
    // 1. CLI --lang= 参数覆盖
    for arg in std::env::args().skip(1) {
        if arg == "--lang=zh" || arg == "--lang=zh_CN" || arg == "--lang=zh-CN" {
            return Lang::Zh;
        }
        if arg == "--lang=en" || arg == "--lang=en_US" || arg == "--lang=en-US" {
            return Lang::En;
        }
    }

    // 2. 环境变量检查
    for var in &["LANG", "LC_ALL", "LC_MESSAGES"] {
        if let Ok(val) = std::env::var(var) {
            let lower = val.to_lowercase();
            if lower.contains("zh") {
                return Lang::Zh;
            }
            if lower.contains("en") {
                return Lang::En;
            }
        }
    }

    // 3. Windows: GetUserDefaultUILanguage
    #[cfg(windows)]
    {
        let lang_id = unsafe { windows_sys::Win32::Globalization::GetUserDefaultUILanguage() };
        // 主语言 ID 掩码
        let primary = lang_id & 0x3FF;
        // LANG_CHINESE = 0x04
        if primary == 0x04 {
            return Lang::Zh;
        }
    }

    // 4. 兜底英文
    Lang::En
}

// ── 消息模板 ──────────────────────────────────────────────────────

struct Messages {
    detect_zh: &'static str,
    detect_en: &'static str,
    truncate_ok: &'static str,      // 接受: path, original_size, position
}

const MSG_ZH: Messages = Messages {
    detect_zh:  "[INFO] 检测到中文系统，使用中文输出",
    detect_en:  "[INFO] English locale detected, using English output",
    truncate_ok:   "[OK] {path} 截取到 {pos} 字节 (原 {orig} 字节)",
};

const MSG_EN: Messages = Messages {
    detect_zh:  "[INFO] 检测到中文系统，使用中文输出",
    detect_en:  "[INFO] English locale detected, using English output",
    truncate_ok:   "[OK] {path} truncated to {pos} bytes (was {orig} bytes)",
};

// ── 主逻辑 ────────────────────────────────────────────────────────

fn main() {
    // 收集非 --lang 的普通参数
    let args: Vec<String> = std::env::args()
        .skip(1)
        .filter(|a| !a.starts_with("--lang="))
        .collect();

    if args.len() < 2 {
        eprintln!("Usage: mhlove-truncate.exe <json_file> <backup_tmp_path> [--lang=zh|en]");
        process::exit(1);
    }

    let json_file = &args[0];
    let backup_tmp_path = Path::new(&args[1]);

    let lang = detect_lang();
    let msg = match lang {
        Lang::Zh => &MSG_ZH,
        Lang::En => &MSG_EN,
    };

    // 打印语言检测结果
    let detect_line = match lang {
        Lang::Zh => msg.detect_zh,
        Lang::En => msg.detect_en,
    };
    // 输出到 stderr，避免干扰主输出流（与 Python 版一致）
    eprintln!("{detect_line}");

    // 读取 JSON 文件
    let json_content = match fs::read_to_string(json_file) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[FAIL] Failed to read JSON file '{json_file}': {e}");
            process::exit(1);
        }
    };

    let paths: Vec<String> = match serde_json::from_str(&json_content) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("[FAIL] Failed to parse JSON: {e}");
            process::exit(1);
        }
    };

    // 并行截取，统计失败数
    let fail_count: usize = paths
        .par_iter()
        .map(|entry| {
            match truncate_one(entry, backup_tmp_path, lang) {
                Ok(()) => 0,
                Err(_) => 1,
            }
        })
        .sum();

    if fail_count > 0 {
        process::exit(1);
    }
}

// ── 单个文件截取 ──────────────────────────────────────────────────

fn truncate_one(entry: &str, backup_tmp_path: &Path, lang: Lang) -> Result<(), ()> {
    // 解析 "path:position"
    let colon_pos = entry.rfind(':').ok_or_else(|| {
        eprintln!("[FAIL] Invalid entry format (missing colon): {entry}");
    })?;

    let raw_path = &entry[..colon_pos];
    let position: u64 = entry[colon_pos + 1..].parse().map_err(|_| {
        eprintln!("[FAIL] Invalid position in entry: {entry}");
    })?;

    // 去掉路径第一个 "/" 及其前面的内容
    let cleaned = match raw_path.find('/') {
        Some(idx) => &raw_path[idx + 1..],
        None => raw_path,
    };

    let real_path = backup_tmp_path.join(cleaned);
    let msg = match lang {
        Lang::Zh => &MSG_ZH,
        Lang::En => &MSG_EN,
    };

    // 打开文件，获取原始大小
    let file = match fs::File::open(&real_path) {
        Ok(f) => f,
        Err(e) => {
            eprintln!(
                "[FAIL] {}: {}",
                real_path.display(),
                e
            );
            return Err(());
        }
    };

    let original_size = match file.metadata() {
        Ok(m) => m.len(),
        Err(e) => {
            eprintln!(
                "[FAIL] {}: {}",
                real_path.display(),
                e
            );
            return Err(());
        }
    };

    // 截取文件
    if let Err(e) = file.set_len(position) {
        eprintln!(
            "[FAIL] {}: {}",
            real_path.display(),
            e
        );
        return Err(());
    }

    // 避免 print! 多线程交错，用锁保护 stdout
    let line = msg
        .truncate_ok
        .replace("{path}", &real_path.display().to_string())
        .replace("{orig}", &original_size.to_string())
        .replace("{pos}", &position.to_string());

    static STDOUT_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    {
        let _guard = STDOUT_LOCK.lock().unwrap();
        println!("{line}");
    }

    Ok(())
}
