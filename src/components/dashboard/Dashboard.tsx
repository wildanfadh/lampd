import { useEffect, useState } from "react";
import { Activity, Square, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServiceCard } from "./ServiceCard";
import { LogViewer } from "@/components/logs/LogViewer";
import { InstallModal } from "@/components/install/InstallModal";
import { PhpInstallVersionModal } from "@/components/install/PhpInstallVersionModal";
import { useServiceStore } from "@/store/useServiceStore";
import { useLogStore } from "@/store/useLogStore";
import { usePhpVersionStore } from "@/store/usePhpVersionStore";
import * as api from "@/lib/tauri";

export function Dashboard() {
  const {
    services,
    isLoading,
    error,
    loadServices,
    startService,
    stopService,
    restartService,
    enableService,
    disableService,
  } = useServiceStore();
  const { subscribe } = useLogStore();
  const { loadVersions } = usePhpVersionStore();

  const [installOpen, setInstallOpen] = useState(false);
  const [installServiceId, setInstallServiceId] = useState("");
  const [installServiceLabel, setInstallServiceLabel] = useState("");
  const [phpInstallOpen, setPhpInstallOpen] = useState(false);

  useEffect(() => {
    loadServices();
    loadVersions();
    const unsub = subscribe();
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = {
    running: services.filter((s) => s.active_state === "active").length,
    stopped: services.filter((s) => s.available && s.active_state !== "active").length,
    unavailable: services.filter((s) => !s.available).length,
    total: services.length,
  };

  const handleStreamLogs = async (id: string) => {
    try {
      await api.streamServiceLogs(id);
    } catch {
      // log stream setup; errors surface in the log panel
    }
  };

  const handleInstall = (id: string) => {
    const svc = services.find((s) => s.id === id);
    setInstallServiceId(id);
    setInstallServiceLabel(svc?.label ?? id);
    setInstallOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Lampd</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Linux Dev Services</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadServices}
          disabled={isLoading}
          className="gap-1.5"
        >
          <RefreshCw className={isLoading ? "animate-spin h-4 w-4" : "h-4 w-4"} />
          Refresh
        </Button>
      </header>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-4 gap-4 px-6 py-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="rounded-full bg-success/15 p-2">
              <Activity className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.running}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="rounded-full bg-secondary p-2">
              <Square className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.stopped}</p>
              <p className="text-xs text-muted-foreground">Stopped</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="rounded-full bg-warning/15 p-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.unavailable}</p>
              <p className="text-xs text-muted-foreground">Unavailable</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <div className="rounded-full bg-accent/15 p-2">
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex-1 flex min-h-0 px-6 pb-4 gap-4 overflow-hidden">
          <div className="flex-1 overflow-auto">
            {isLoading && services.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                Detecting services...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                {services.map((svc) => (
                  <ServiceCard
                    key={svc.id}
                    service={svc}
                    onStart={startService}
                    onStop={stopService}
                    onRestart={restartService}
                    onEnable={enableService}
                    onDisable={disableService}
                    onViewLogs={(id) => {
                      useLogStore.getState().setActiveService(id);
                    }}
                    onStreamLogs={handleStreamLogs}
                    onInstall={handleInstall}
                    onInstallPhpVersion={svc.id === "php-fpm" ? () => setPhpInstallOpen(true) : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-[450px] flex-shrink-0 hidden lg:flex">
            <LogViewer />
          </div>
        </div>
      </div>

      <InstallModal
        open={installOpen}
        serviceId={installServiceId}
        serviceLabel={installServiceLabel}
        onClose={() => setInstallOpen(false)}
        onInstalled={() => {
          loadServices();
        }}
      />

      <PhpInstallVersionModal
        open={phpInstallOpen}
        onClose={() => setPhpInstallOpen(false)}
        onInstalled={() => {
          loadServices();
          loadVersions();
        }}
      />
    </div>
  );
}
