use tauri::AppHandle;
use crate::install::{InstallPlan, InstallablePhpVersion, PhpVersionInstallPlan};
use crate::managed_services;
use crate::systemd;
use crate::systemd::{ManagedServiceStatus, PhpVersionInfo};

#[tauri::command]
pub async fn health_check() -> Result<String, String> {
    Ok("lampd backend is running".into())
}

#[tauri::command]
pub async fn list_managed_services() -> Result<Vec<ManagedServiceStatus>, String> {
    Ok(systemd::resolve_all().await)
}

#[tauri::command]
pub async fn start_managed_service(service_id: String) -> Result<ManagedServiceStatus, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::start_service(unit).await?;
    let refreshed = systemd::resolve_all().await;
    refreshed
        .into_iter()
        .find(|s| s.id == service_id)
        .ok_or_else(|| "Failed to refresh status".into())
}

#[tauri::command]
pub async fn stop_managed_service(service_id: String) -> Result<ManagedServiceStatus, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::stop_service(unit).await?;
    let refreshed = systemd::resolve_all().await;
    refreshed
        .into_iter()
        .find(|s| s.id == service_id)
        .ok_or_else(|| "Failed to refresh status".into())
}

#[tauri::command]
pub async fn restart_managed_service(service_id: String) -> Result<ManagedServiceStatus, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::restart_service(unit).await?;
    let refreshed = systemd::resolve_all().await;
    refreshed
        .into_iter()
        .find(|s| s.id == service_id)
        .ok_or_else(|| "Failed to refresh status".into())
}

#[tauri::command]
pub async fn enable_managed_service(service_id: String) -> Result<ManagedServiceStatus, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::enable_service(unit).await?;
    let refreshed = systemd::resolve_all().await;
    refreshed
        .into_iter()
        .find(|s| s.id == service_id)
        .ok_or_else(|| "Failed to refresh status".into())
}

#[tauri::command]
pub async fn disable_managed_service(service_id: String) -> Result<ManagedServiceStatus, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::disable_service(unit).await?;
    let refreshed = systemd::resolve_all().await;
    refreshed
        .into_iter()
        .find(|s| s.id == service_id)
        .ok_or_else(|| "Failed to refresh status".into())
}

#[tauri::command]
pub async fn get_service_logs(service_id: String) -> Result<String, String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?;

    systemd::get_logs_tail(unit, 200).await
}

#[tauri::command]
pub async fn stream_service_logs(
    app: AppHandle,
    service_id: String,
) -> Result<(), String> {
    let all = systemd::resolve_all().await;
    let def = all
        .iter()
        .find(|s| s.id == service_id)
        .ok_or("Service not found")?;

    let unit = def
        .resolved_unit
        .as_ref()
        .ok_or("Service not installed")?
        .clone();

    crate::stream::spawn_journal_stream(app, service_id, unit);
    Ok(())
}

#[tauri::command]
pub async fn get_install_plan(service_id: String) -> Result<InstallPlan, String> {
    let defs = managed_services::fixed_catalog();
    let def = defs
        .iter()
        .find(|d| d.id == service_id)
        .ok_or("Service not found")?;

    let plan = crate::install::build_plan(&def.id, &def.label);

    if !plan.supported {
        return Err("This service is not supported for installation on your distribution.".into());
    }

    Ok(plan)
}

#[tauri::command]
pub async fn run_install_plan(
    app: AppHandle,
    service_id: String,
) -> Result<(), String> {
    let defs = managed_services::fixed_catalog();
    let def = defs
        .iter()
        .find(|d| d.id == service_id)
        .ok_or("Service not found")?;

    crate::install::run_install(app, &def.id, &def.label).await
}

#[tauri::command]
pub async fn list_php_versions() -> Result<Vec<PhpVersionInfo>, String> {
    Ok(systemd::list_php_versions().await)
}

#[tauri::command]
pub async fn switch_php_version(
    app: AppHandle,
    unit_name: String,
) -> Result<ManagedServiceStatus, String> {
    systemd::switch_php_version(&unit_name).await?;

    let refreshed = systemd::resolve_all().await;
    let php_status = refreshed
        .into_iter()
        .find(|s| s.id == "php-fpm")
        .ok_or("Failed to refresh PHP status")?;

    if let Some(active_unit) = &php_status.resolved_unit {
        crate::stream::spawn_journal_stream(app, "php-fpm".into(), active_unit.clone());
    }

    Ok(php_status)
}

#[tauri::command]
pub async fn list_installable_php_versions() -> Result<Vec<InstallablePhpVersion>, String> {
    Ok(crate::install::list_installable_php_versions())
}

#[tauri::command]
pub async fn get_php_version_install_plan(
    version_label: String,
) -> Result<PhpVersionInstallPlan, String> {
    let plan = crate::install::build_php_version_install_plan(&version_label);
    if !plan.supported {
        return Err("This PHP version is not supported for installation on your distribution.".into());
    }
    Ok(plan)
}

#[tauri::command]
pub async fn run_php_version_install(
    app: AppHandle,
    version_label: String,
) -> Result<(), String> {
    crate::install::run_php_version_install(app, &version_label).await
}
