import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { InstallablePhpVersion, InstallPlan, ManagedServiceStatus, PhpVersionInfo, PhpVersionInstallPlan, ServiceLogEntry } from "./types";

export const listManagedServices = () =>
  invoke<ManagedServiceStatus[]>("list_managed_services");

export const startManagedService = (serviceId: string) =>
  invoke<ManagedServiceStatus>("start_managed_service", { serviceId });

export const stopManagedService = (serviceId: string) =>
  invoke<ManagedServiceStatus>("stop_managed_service", { serviceId });

export const restartManagedService = (serviceId: string) =>
  invoke<ManagedServiceStatus>("restart_managed_service", { serviceId });

export const enableManagedService = (serviceId: string) =>
  invoke<ManagedServiceStatus>("enable_managed_service", { serviceId });

export const disableManagedService = (serviceId: string) =>
  invoke<ManagedServiceStatus>("disable_managed_service", { serviceId });

export const getServiceLogs = (serviceId: string) =>
  invoke<string>("get_service_logs", { serviceId });

export const streamServiceLogs = (serviceId: string) =>
  invoke<void>("stream_service_logs", { serviceId });

export const getInstallPlan = (serviceId: string) =>
  invoke<InstallPlan>("get_install_plan", { serviceId });

export const runInstallPlan = (serviceId: string) =>
  invoke<void>("run_install_plan", { serviceId });

export const healthCheck = () => invoke<string>("health_check");

export const onServiceLog = (callback: (entry: ServiceLogEntry) => void) => {
  const promise = listen<ServiceLogEntry>("lampd://service-log", (event) => {
    callback(event.payload);
  });
  return () => {
    promise.then((unlisten) => unlisten());
  };
};

export const onInstallLog = (callback: (entry: ServiceLogEntry) => void) => {
  const promise = listen<ServiceLogEntry>("lampd://install-log", (event) => {
    callback(event.payload);
  });
  return () => {
    promise.then((unlisten) => unlisten());
  };
};

export const listPhpVersions = () =>
  invoke<PhpVersionInfo[]>("list_php_versions");

export const switchPhpVersion = (unitName: string) =>
  invoke<ManagedServiceStatus>("switch_php_version", { unitName });

export const listInstallablePhpVersions = () =>
  invoke<InstallablePhpVersion[]>("list_installable_php_versions");

export const getPhpVersionInstallPlan = (versionLabel: string) =>
  invoke<PhpVersionInstallPlan>("get_php_version_install_plan", { versionLabel });

export const runPhpVersionInstall = (versionLabel: string) =>
  invoke<void>("run_php_version_install", { versionLabel });
