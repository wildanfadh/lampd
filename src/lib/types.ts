export interface ManagedServiceStatus {
  id: string;
  label: string;
  category: string;
  resolved_unit?: string;
  available: boolean;
  active_state: string;
  enabled_state: string;
  status_label: string;
  can_start: boolean;
  can_stop: boolean;
  can_restart: boolean;
  can_enable: boolean;
  can_disable: boolean;
  last_error?: string;
}

export interface ServiceLogEntry {
  serviceId: string;
  stream: "stdout" | "stderr";
  line: string;
  timestamp: string;
}

export interface InstallPlan {
  serviceId: string;
  serviceLabel: string;
  distroFamily: string;
  distroName: string;
  packageManager: string;
  packages: string[];
  commandPreview: string;
  supported: boolean;
  canRunDirectly: boolean;
  notes: string[];
}

export interface PhpVersionInfo {
  versionLabel: string;
  unitName: string;
  available: boolean;
  active: boolean;
  enabled: boolean;
}

export interface InstallablePhpVersion {
  versionLabel: string;
  packageName: string;
  supportLevel: string;
  supported: boolean;
  notes: string[];
}

export interface PhpVersionInstallPlan {
  versionLabel: string;
  distroFamily: string;
  distroName: string;
  packageManager: string;
  packageName: string;
  commandPreview: string;
  supportLevel: string;
  supported: boolean;
  canRunDirectly: boolean;
  notes: string[];
}
