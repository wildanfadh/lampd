use serde::{Deserialize, Serialize};
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::distro;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallPlan {
    #[serde(rename = "serviceId")]
    pub service_id: String,
    #[serde(rename = "serviceLabel")]
    pub service_label: String,
    #[serde(rename = "distroFamily")]
    pub distro_family: String,
    #[serde(rename = "distroName")]
    pub distro_name: String,
    #[serde(rename = "packageManager")]
    pub package_manager: String,
    pub packages: Vec<String>,
    #[serde(rename = "commandPreview")]
    pub command_preview: String,
    pub supported: bool,
    #[serde(rename = "canRunDirectly")]
    pub can_run_directly: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallLogEntry {
    #[serde(rename = "serviceId")]
    pub service_id: String,
    pub line: String,
    pub stream: String,
    pub timestamp: String,
}

struct PackageMap {
    debian: &'static str,
    fedora: &'static str,
    arch: &'static str,
}

fn package_for(service_id: &str) -> Option<PackageMap> {
    match service_id {
        "apache" => Some(PackageMap {
            debian: "apache2",
            fedora: "httpd",
            arch: "apache",
        }),
        "nginx" => Some(PackageMap {
            debian: "nginx",
            fedora: "nginx",
            arch: "nginx",
        }),
        "mysql" => Some(PackageMap {
            debian: "mysql-server",
            fedora: "mariadb-server",
            arch: "mariadb",
        }),
        "php-fpm" => Some(PackageMap {
            debian: "php-fpm",
            fedora: "php-fpm",
            arch: "php-fpm",
        }),
        "postgresql" => Some(PackageMap {
            debian: "postgresql",
            fedora: "postgresql-server",
            arch: "postgresql",
        }),
        "docker" => Some(PackageMap {
            debian: "docker.io",
            fedora: "docker",
            arch: "docker",
        }),
        "podman" => Some(PackageMap {
            debian: "podman",
            fedora: "podman",
            arch: "podman",
        }),
        _ => None,
    }
}

pub fn build_plan(service_id: &str, service_label: &str) -> InstallPlan {
    let distro = distro::detect();

    let pm = PackageMap {
        debian: "",
        fedora: "",
        arch: "",
    };

    let pkg_map = package_for(service_id).unwrap_or(pm);

    let family = distro.family.clone();
    let package = match family.as_str() {
        "debian" => pkg_map.debian,
        "fedora" => pkg_map.fedora,
        "arch" => pkg_map.arch,
        _ => "",
    };

    let supported = family != "unknown" && !package.is_empty();
    let packages = if supported {
        vec![package.to_string()]
    } else {
        vec![]
    };

    let command_preview = if supported {
        match family.as_str() {
            "debian" => format!("sudo apt install -y {}", package),
            "fedora" => format!("sudo dnf install -y {}", package),
            "arch" => format!("sudo pacman -S --noconfirm {}", package),
            _ => String::new(),
        }
    } else {
        String::new()
    };

    let can_run_directly = supported && pkexec_available();

    let mut notes: Vec<String> = Vec::new();
    if !can_run_directly && supported {
        notes.push("Direct install unavailable — pkexec not found. Use Copy Command and run manually.".into());
    }
    if let Some(extra) = service_notes(service_id) {
        notes.push(extra);
    }

    InstallPlan {
        service_id: service_id.to_string(),
        service_label: service_label.to_string(),
        distro_family: family,
        distro_name: distro.pretty_name,
        package_manager: distro.package_manager,
        packages,
        command_preview,
        supported,
        can_run_directly,
        notes,
    }
}

fn service_notes(id: &str) -> Option<String> {
    match id {
        "postgresql" => Some("PostgreSQL may require additional init steps after installation.".into()),
        "docker" => Some("On Ubuntu/Debian, consider installing Docker from the official Docker repository instead of docker.io for the latest version.".into()),
        _ => None,
    }
}

pub async fn run_install(
    app_handle: tauri::AppHandle,
    service_id: &str,
    service_label: &str,
) -> Result<(), String> {
    let plan = build_plan(service_id, service_label);

    if !plan.supported {
        return Err("Install not supported on this distribution".into());
    }

    if !plan.can_run_directly {
        return Err("Direct install unavailable. Use Copy Command to run in terminal.".into());
    }

    let (program, args) = build_install_command(&plan);

    let mut child = tokio::process::Command::new(&program)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start install: {}", e))?;

    let sid = service_id.to_string();

    if let Some(stdout) = child.stdout.take() {
        let app = app_handle.clone();
        let id = sid.clone();
        tokio::spawn(async move {
            stream_output(app, id, "stdout".to_string(), stdout).await;
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let app = app_handle.clone();
        let id = sid.clone();
        tokio::spawn(async move {
            stream_output(app, id, "stderr".to_string(), stderr).await;
        });
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Install process error: {}", e))?;

    if !status.success() {
        return Err("Install command failed. See output for details.".into());
    }

    Ok(())
}

fn build_install_command(plan: &InstallPlan) -> (String, Vec<String>) {
    let package = plan.packages.first().cloned().unwrap_or_default();
    match plan.distro_family.as_str() {
        "debian" => ("pkexec".into(), vec!["apt".into(), "install".into(), "-y".into(), package]),
        "fedora" => ("pkexec".into(), vec!["dnf".into(), "install".into(), "-y".into(), package]),
        "arch" => ("pkexec".into(), vec!["pacman".into(), "-S".into(), "--noconfirm".into(), package]),
        _ => ("echo".into(), vec!["unsupported".into()]),
    }
}

fn pkexec_available() -> bool {
    std::process::Command::new("which")
        .arg("pkexec")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

async fn stream_output(
    app_handle: tauri::AppHandle,
    service_id: String,
    stream_name: String,
    reader: impl tokio::io::AsyncRead + Unpin + Send + 'static,
) {
    let lines = BufReader::new(reader).lines();
    tokio::pin!(lines);
    while let Ok(Some(line)) = lines.next_line().await {
        let entry = InstallLogEntry {
            service_id: service_id.clone(),
            stream: stream_name.clone(),
            line,
            timestamp: chrono_now(),
        };
        let _ = app_handle.emit("lampd://install-log", entry);
    }
}

fn chrono_now() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let nanos = now.subsec_nanos();
    let total = secs % 86400;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    format!("{:02}:{:02}:{:02}.{:03}", h, m, s, nanos / 1_000_000)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallablePhpVersion {
    #[serde(rename = "versionLabel")]
    pub version_label: String,
    #[serde(rename = "packageName")]
    pub package_name: String,
    #[serde(rename = "supportLevel")]
    pub support_level: String,
    pub supported: bool,
    pub notes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhpVersionInstallPlan {
    #[serde(rename = "versionLabel")]
    pub version_label: String,
    #[serde(rename = "distroFamily")]
    pub distro_family: String,
    #[serde(rename = "distroName")]
    pub distro_name: String,
    #[serde(rename = "packageManager")]
    pub package_manager: String,
    #[serde(rename = "packageName")]
    pub package_name: String,
    #[serde(rename = "commandPreview")]
    pub command_preview: String,
    #[serde(rename = "supportLevel")]
    pub support_level: String,
    pub supported: bool,
    #[serde(rename = "canRunDirectly")]
    pub can_run_directly: bool,
    pub notes: Vec<String>,
}

pub fn list_installable_php_versions() -> Vec<InstallablePhpVersion> {
    let distro = distro::detect();
    let family = distro.family.clone();

    let labels = vec![
        "5.6", "7.0", "7.1", "7.2", "7.3", "7.4",
        "8.0", "8.1", "8.2", "8.3", "8.4", "8.5",
    ];

    labels
        .into_iter()
        .map(|label| {
            let (support_level, supported, notes) = classify_php_version(&family, label);
            let package_name = php_package_name(&family, label);
            InstallablePhpVersion {
                version_label: label.to_string(),
                package_name,
                support_level,
                supported,
                notes,
            }
        })
        .collect()
}

fn classify_php_version(family: &str, label: &str) -> (String, bool, Vec<String>) {
    match family {
        "debian" => {
            let parts: Vec<u32> = label.split('.').filter_map(|s| s.parse().ok()).collect();
            if parts.len() >= 2 {
                let major = parts[0];
                let _minor = parts[1];
                if major >= 8 { ("native".into(), true, vec![]) }
                else if major == 7 { ("repo_required".into(), true, vec!["May require additional repository (e.g. ppa:ondrej/php).".into()]) }
                else { ("legacy_risk".into(), true, vec!["Legacy version. May need external repository and may fail to install.".into()]) }
            } else {
                ("legacy_risk".into(), false, vec![])
            }
        },
        "fedora" => {
            let parts: Vec<u32> = label.split('.').filter_map(|s| s.parse().ok()).collect();
            if parts.len() >= 2 {
                let major = parts[0];
                if major >= 8 { ("repo_required".into(), true, vec!["Parallel PHP versions may need Remi or other third-party repos.".into()]) }
                else if major == 7 { ("repo_required".into(), true, vec!["Parallel PHP versions may need Remi or other third-party repos.".into()]) }
                else { ("legacy_risk".into(), true, vec!["Legacy version. Unlikely available in standard repos.".into()]) }
            } else {
                ("legacy_risk".into(), false, vec![])
            }
        },
        "arch" => {
            let parts: Vec<u32> = label.split('.').filter_map(|s| s.parse().ok()).collect();
            if parts.len() >= 2 {
                let major = parts[0];
                if major >= 8 { ("native".into(), true, vec!["Only the latest PHP version is typically available from community repo. Parallel versions may not be available.".into()]) }
                else { ("legacy_risk".into(), true, vec!["Legacy version. Unlikely available in standard repos.".into()]) }
            } else {
                ("legacy_risk".into(), false, vec![])
            }
        },
        _ => ("unsupported".into(), false, vec!["Distribution not supported for PHP version-specific install.".into()]),
    }
}

fn php_package_name(family: &str, label: &str) -> String {
    match family {
        "debian" => format!("php{}-fpm", label),
        "fedora" => format!("php{}-php-fpm", label),
        "arch" => format!("php{}-fpm", label),
        _ => format!("php{}-fpm", label),
    }
}

pub fn build_php_version_install_plan(version_label: &str) -> PhpVersionInstallPlan {
    let distro = distro::detect();
    let family = distro.family.clone();
    let (support_level, supported, notes) = classify_php_version(&family, version_label);
    let package_name = php_package_name(&family, version_label);
    let can_run_directly = supported && pkexec_available();

    let command_preview = if supported {
        match family.as_str() {
            "debian" => format!("sudo apt install -y {}", package_name),
            "fedora" => format!("sudo dnf install -y {}", package_name),
            "arch" => format!("sudo pacman -S --noconfirm {}", package_name),
            _ => String::new(),
        }
    } else {
        String::new()
    };

    PhpVersionInstallPlan {
        version_label: version_label.to_string(),
        distro_family: family,
        distro_name: distro.pretty_name,
        package_manager: distro.package_manager,
        package_name,
        command_preview,
        support_level,
        supported,
        can_run_directly,
        notes,
    }
}

pub async fn run_php_version_install(
    app_handle: tauri::AppHandle,
    version_label: &str,
) -> Result<(), String> {
    let plan = build_php_version_install_plan(version_label);

    if !plan.supported {
        return Err("Install not supported on this distribution".into());
    }

    if !plan.can_run_directly {
        return Err("Direct install unavailable. Use Copy Command to run in terminal.".into());
    }

    let (program, args) = build_php_install_command(&plan);

    let mut child = tokio::process::Command::new(&program)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::null())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start install: {}", e))?;

    let sid = format!("php-install-{}", version_label);

    if let Some(stdout) = child.stdout.take() {
        let app = app_handle.clone();
        let id = sid.clone();
        tokio::spawn(async move {
            stream_output(app, id, "stdout".to_string(), stdout).await;
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let app = app_handle.clone();
        let id = sid.clone();
        tokio::spawn(async move {
            stream_output(app, id, "stderr".to_string(), stderr).await;
        });
    }

    let status = child
        .wait()
        .await
        .map_err(|e| format!("Install process error: {}", e))?;

    if !status.success() {
        return Err("Install command failed. See output for details.".into());
    }

    Ok(())
}

fn build_php_install_command(plan: &PhpVersionInstallPlan) -> (String, Vec<String>) {
    let package = plan.package_name.clone();
    match plan.distro_family.as_str() {
        "debian" => ("pkexec".into(), vec!["apt".into(), "install".into(), "-y".into(), package]),
        "fedora" => ("pkexec".into(), vec!["dnf".into(), "install".into(), "-y".into(), package]),
        "arch" => ("pkexec".into(), vec!["pacman".into(), "-S".into(), "--noconfirm".into(), package]),
        _ => ("echo".into(), vec!["unsupported".into()]),
    }
}
