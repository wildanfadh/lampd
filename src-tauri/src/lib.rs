mod commands;
mod distro;
mod install;
mod managed_services;
mod stream;
mod systemd;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::list_managed_services,
            commands::start_managed_service,
            commands::stop_managed_service,
            commands::restart_managed_service,
            commands::enable_managed_service,
            commands::disable_managed_service,
            commands::get_service_logs,
            commands::stream_service_logs,
            commands::get_install_plan,
            commands::run_install_plan,
            commands::list_php_versions,
            commands::switch_php_version,
            commands::list_installable_php_versions,
            commands::get_php_version_install_plan,
            commands::run_php_version_install,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
