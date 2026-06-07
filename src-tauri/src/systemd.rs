use crate::managed_services;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedServiceStatus {
    pub id: String,
    pub label: String,
    pub category: String,
    pub resolved_unit: Option<String>,
    pub available: bool,
    pub active_state: String,
    pub enabled_state: String,
    pub status_label: String,
    pub can_start: bool,
    pub can_stop: bool,
    pub can_restart: bool,
    pub can_enable: bool,
    pub can_disable: bool,
    pub last_error: Option<String>,
}

pub async fn resolve_all() -> Vec<ManagedServiceStatus> {
    let defs = managed_services::fixed_catalog();
    let mut results = Vec::new();

    for def in &defs {
        let status = resolve_one(def).await;
        results.push(status);
    }

    results
}

async fn resolve_one(def: &managed_services::ManagedServiceDef) -> ManagedServiceStatus {
    let mut resolved_unit: Option<String> = None;

    for candidate in &def.candidate_units {
        let unit = format!("{}.service", candidate);
        if unit_exists(&unit).await {
            resolved_unit = Some(unit);
            break;
        }
    }

    let available = resolved_unit.is_some();
    let unit_name = resolved_unit.clone().unwrap_or_default();

    let (active_state, can_start, can_stop, can_restart) = if available {
        let active = query_active(&unit_name).await;
        let (start, stop, restart) = match active.as_str() {
            "active" => (false, true, true),
            "inactive" | "failed" => (true, false, true),
            _ => (false, false, false),
        };
        (active, start, stop, restart)
    } else {
        ("unavailable".to_string(), false, false, false)
    };

    let (enabled_state, can_enable, can_disable) = if available {
        let enabled = query_enabled(&unit_name).await;
        let (ce, cd) = match enabled.as_str() {
            "enabled" => (false, true),
            "disabled" => (true, false),
            _ => (true, false),
        };
        (enabled, ce, cd)
    } else {
        ("unknown".to_string(), false, false)
    };

    let status_label = if !available {
        "Not Installed"
    } else {
        match active_state.as_str() {
            "active" => "Running",
            "inactive" => "Stopped",
            "failed" => "Error",
            _ => "Unknown",
        }
    };

    ManagedServiceStatus {
        id: def.id.clone(),
        label: def.label.clone(),
        category: def.category.clone(),
        resolved_unit,
        available,
        active_state,
        enabled_state,
        status_label: status_label.to_string(),
        can_start,
        can_stop,
        can_restart,
        can_enable,
        can_disable,
        last_error: None,
    }
}

async fn unit_exists(unit: &str) -> bool {
    let output = tokio::process::Command::new("systemctl")
        .args(["list-unit-files", unit])
        .output()
        .await;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            stdout.contains(unit)
        }
        Err(_) => false,
    }
}

async fn query_active(unit: &str) -> String {
    let output = tokio::process::Command::new("systemctl")
        .args(["is-active", unit])
        .output()
        .await;

    match output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).trim().to_string(),
        Err(_) => "unknown".to_string(),
    }
}

async fn query_enabled(unit: &str) -> String {
    let output = tokio::process::Command::new("systemctl")
        .args(["is-enabled", unit])
        .output()
        .await;

    match output {
        Ok(out) => String::from_utf8_lossy(&out.stdout).trim().to_string(),
        Err(_) => "unknown".to_string(),
    }
}

pub async fn start_service(unit: &str) -> Result<String, String> {
    run_systemctl("start", unit).await
}

pub async fn stop_service(unit: &str) -> Result<String, String> {
    run_systemctl("stop", unit).await
}

pub async fn restart_service(unit: &str) -> Result<String, String> {
    run_systemctl("restart", unit).await
}

pub async fn enable_service(unit: &str) -> Result<String, String> {
    run_systemctl("enable", unit).await
}

pub async fn disable_service(unit: &str) -> Result<String, String> {
    run_systemctl("disable", unit).await
}

async fn run_systemctl(action: &str, unit: &str) -> Result<String, String> {
    let output = tokio::process::Command::new("systemctl")
        .args([action, unit])
        .output()
        .await
        .map_err(|e| format!("Failed to execute systemctl: {}", e))?;

    if output.status.success() {
        Ok(format!("{} {} succeeded", action, unit))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if stderr.trim().is_empty() { stdout } else { stderr };
        Err(format!("systemctl {} failed: {}", action, msg.trim()))
    }
}

pub async fn get_logs_tail(unit: &str, lines: u32) -> Result<String, String> {
    let output = tokio::process::Command::new("journalctl")
        .args(["-u", unit, "-n", &lines.to_string(), "--no-pager"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute journalctl: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpVersionInfo {
    #[serde(rename = "versionLabel")]
    pub version_label: String,
    #[serde(rename = "unitName")]
    pub unit_name: String,
    pub available: bool,
    pub active: bool,
    pub enabled: bool,
}

const PHP_CANDIDATES: &[&str] = &[
    "php8.4-fpm",
    "php8.3-fpm",
    "php8.2-fpm",
    "php8.1-fpm",
    "php8.0-fpm",
    "php-fpm",
];

pub async fn list_php_versions() -> Vec<PhpVersionInfo> {
    let mut versions = Vec::new();

    for candidate in PHP_CANDIDATES {
        let unit = format!("{}.service", candidate);
        let available = unit_exists(&unit).await;

        let active = if available {
            query_active(&unit).await == "active"
        } else {
            false
        };

        let enabled = if available {
            query_enabled(&unit).await == "enabled"
        } else {
            false
        };

        let label = parse_php_version_label(candidate);

        versions.push(PhpVersionInfo {
            version_label: label,
            unit_name: unit,
            available,
            active,
            enabled,
        });
    }

    versions
}

pub async fn switch_php_version(target_unit: &str) -> Result<(), String> {
    let versions = list_php_versions().await;

    let target = versions
        .iter()
        .find(|v| v.unit_name == target_unit && v.available)
        .ok_or("Target PHP version is not installed")?;

    for version in &versions {
        if version.unit_name != target_unit && version.available && version.active {
            stop_service(&version.unit_name).await?;
        }
    }

    if !target.active {
        start_service(&target.unit_name).await?;
    }

    Ok(())
}

fn parse_php_version_label(candidate: &str) -> String {
    if let Some(ver) = candidate
        .strip_prefix("php")
        .and_then(|s| s.strip_suffix("-fpm"))
    {
        if ver.is_empty() {
            "default".to_string()
        } else {
            ver.to_string()
        }
    } else {
        candidate.to_string()
    }
}
