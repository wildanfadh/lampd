import { Play, Square, RefreshCw, Power, PowerOff, FileText, Download, PackagePlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import { PhpVersionSwitcher } from "./PhpVersionSwitcher";
import type { ManagedServiceStatus } from "@/lib/types";

interface ServiceCardProps {
  service: ManagedServiceStatus;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onRestart: (id: string) => void;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onViewLogs: (id: string) => void;
  onStreamLogs: (id: string) => void;
  onInstall: (id: string) => void;
  onInstallPhpVersion?: () => void;
}

export function ServiceCard({
  service,
  onStart,
  onStop,
  onRestart,
  onEnable,
  onDisable,
  onViewLogs,
  onStreamLogs,
  onInstall,
  onInstallPhpVersion,
}: ServiceCardProps) {
  const isRunning = service.active_state === "active";
  const isEnabled = service.enabled_state === "enabled";
  const isAvailable = service.available;

  return (
    <Card className="group transition-colors hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <CardTitle>{service.label}</CardTitle>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {service.category}
              </Badge>
              <ServiceStatusBadge status={service.status_label} />
              {isAvailable && (
                <Badge variant={isEnabled ? "success" : "secondary"} className="text-[10px]">
                  {isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {isAvailable && service.resolved_unit && (
          <p className="text-[10px] text-muted-foreground mb-3 font-mono">
            {service.resolved_unit}
          </p>
        )}
        {!isAvailable && (
          <p className="text-xs text-muted-foreground mb-3">Service not installed on this system</p>
        )}

        {service.id === "php-fpm" && isAvailable && <PhpVersionSwitcher />}

        <div className="flex items-center gap-2 flex-wrap">
          {service.id === "php-fpm" && isAvailable && onInstallPhpVersion && (
            <Button size="sm" variant="outline" onClick={onInstallPhpVersion} className="gap-1.5">
              <PackagePlus className="h-3.5 w-3.5" />
              Install Version
            </Button>
          )}
          {!isAvailable && (
            <Button size="sm" onClick={() => onInstall(service.id)} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90">
              <Download className="h-3.5 w-3.5" />
              Install
            </Button>
          )}
          {isAvailable && isRunning && (
            <>
              <Button size="sm" variant="destructive" onClick={() => onStop(service.id)} className="gap-1.5">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRestart(service.id)} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Restart
              </Button>
            </>
          )}
          {isAvailable && !isRunning && (
            <Button size="sm" onClick={() => onStart(service.id)} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
          {isAvailable && isEnabled && (
            <Button size="sm" variant="outline" onClick={() => onDisable(service.id)} className="gap-1.5">
              <PowerOff className="h-3.5 w-3.5" />
              Disable
            </Button>
          )}
          {isAvailable && !isEnabled && (
            <Button size="sm" variant="outline" onClick={() => onEnable(service.id)} className="gap-1.5">
              <Power className="h-3.5 w-3.5" />
              Enable
            </Button>
          )}
          {isAvailable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onStreamLogs(service.id);
                onViewLogs(service.id);
              }}
              className="gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Logs
            </Button>
          )}
        </div>

        {service.last_error && (
          <p className="mt-2 text-xs text-destructive truncate">{service.last_error}</p>
        )}
      </CardContent>
    </Card>
  );
}
