use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DistroFamily {
    Debian,
    Fedora,
    Arch,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedDistro {
    pub family: String,
    pub id: String,
    pub name: String,
    pub pretty_name: String,
    pub package_manager: String,
}

pub fn detect() -> DetectedDistro {
    let content = std::fs::read_to_string("/etc/os-release").unwrap_or_default();
    let fields: HashMap<String, String> = content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let mut parts = line.splitn(2, '=');
            let key = parts.next()?.to_lowercase();
            let value = parts.next().unwrap_or("").trim_matches('"').to_string();
            Some((key, value))
        })
        .collect();

    let id = fields.get("id").cloned().unwrap_or_default();
    let id_like = fields.get("id_like").cloned().unwrap_or_default();
    let name_raw = fields
        .get("name")
        .cloned()
        .unwrap_or_else(|| "Unknown".into());
    let pretty_name = fields
        .get("pretty_name")
        .cloned()
        .unwrap_or_else(|| name_raw.clone());

    let (family, package_manager) = classify(&id, &id_like);

    DetectedDistro {
        family: family_name(&family),
        id,
        name: name_raw,
        pretty_name,
        package_manager,
    }
}

fn classify(id: &str, id_like: &str) -> (DistroFamily, String) {
    let combined = format!("{} {}", id, id_like).to_lowercase();

    if combined.contains("debian") || combined.contains("ubuntu") {
        return (DistroFamily::Debian, "apt".to_string());
    }
    if combined.contains("fedora") || combined.contains("rhel") || combined.contains("centos") {
        return (DistroFamily::Fedora, "dnf".to_string());
    }
    if combined.contains("arch") {
        return (DistroFamily::Arch, "pacman".to_string());
    }

    (DistroFamily::Unknown, "unknown".to_string())
}

fn family_name(family: &DistroFamily) -> String {
    match family {
        DistroFamily::Debian => "debian".into(),
        DistroFamily::Fedora => "fedora".into(),
        DistroFamily::Arch => "arch".into(),
        DistroFamily::Unknown => "unknown".into(),
    }
}
