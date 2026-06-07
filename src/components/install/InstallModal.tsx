import { useState, useEffect, useRef } from "react";
import { X, Copy, Play, Check, Loader2, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InstallPlan, ServiceLogEntry } from "@/lib/types";
import * as api from "@/lib/tauri";

interface InstallModalProps {
  open: boolean;
  serviceId: string;
  serviceLabel: string;
  onClose: () => void;
  onInstalled: () => void;
}

type ModalState = "idle" | "loading" | "installing" | "success" | "error";

export function InstallModal({ open, serviceId, serviceLabel, onClose, onInstalled }: InstallModalProps) {
  if (!open) return null;

  return (
    <InstallModalInner
      key={serviceId}
      serviceId={serviceId}
      serviceLabel={serviceLabel}
      onClose={onClose}
      onInstalled={onInstalled}
    />
  );
}

function InstallModalInner({
  serviceId,
  serviceLabel,
  onClose,
  onInstalled,
}: {
  serviceId: string;
  serviceLabel: string;
  onClose: () => void;
  onInstalled: () => void;
}) {
  const [state, setState] = useState<ModalState>("loading");
  const [plan, setPlan] = useState<InstallPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    api
      .getInstallPlan(serviceId)
      .then((p) => {
        setPlan(p);
        setState("idle");
      })
      .catch((e) => {
        setError(String(e));
        setState("error");
      });
  }, [serviceId]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (state !== "installing") return;
    const unsub = api.onInstallLog((entry: ServiceLogEntry) => {
      if (entry.serviceId === serviceId) {
        setLogs((prev) => [...prev, entry.line]);
      }
    });
    return () => {
      unsub();
    };
  }, [state, serviceId]);

  const handleCopy = () => {
    if (!plan?.commandPreview) return;
    navigator.clipboard.writeText(plan.commandPreview).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRun = async () => {
    setState("installing");
    setError(null);
    setLogs([]);
    try {
      await api.runInstallPlan(serviceId);
      setState("success");
      setTimeout(() => {
        onInstalled();
        onClose();
      }, 1500);
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Install {serviceLabel}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {state === "loading" && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Loading install plan...
            </div>
          )}

          {state === "error" && !plan && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error || "Failed to load install plan"}
            </div>
          )}

          {plan && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-secondary/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Distribution</p>
                  <p className="text-sm font-medium">{plan.distroName}</p>
                </div>
                <div className="rounded-md bg-secondary/50 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Package Manager</p>
                  <p className="text-sm font-medium">{plan.packageManager}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Packages</p>
                <div className="flex gap-1.5 flex-wrap">
                  {plan.packages.map((pkg) => (
                    <span
                      key={pkg}
                      className="inline-flex items-center rounded-md bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs font-mono text-accent"
                    >
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Command</p>
                <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all select-all">
                  {plan.commandPreview}
                </div>
              </div>

              {plan.notes.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Notes</p>
                  <ul className="space-y-1">
                    {plan.notes.map((note, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-warning mt-0.5">!</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {state === "success" && (
                <div className="rounded-md bg-success/10 border border-success/30 px-3 py-2 text-sm text-success">
                  Installation completed successfully. Refreshing...
                </div>
              )}
            </>
          )}

          {logs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Output</p>
              </div>
              <div
                ref={logRef}
                className="rounded-md bg-black/30 border border-border p-3 font-mono text-[11px] leading-relaxed max-h-48 overflow-auto"
              >
                {logs.map((line, i) => (
                  <div key={i} className="text-muted-foreground whitespace-pre-wrap break-all">
                    {line}
                  </div>
                ))}
                {state === "installing" && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Loader2 className="animate-spin h-3 w-3" />
                    Installing...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {plan && (state === "idle" || state === "error") && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Command
                </>
              )}
            </Button>
            {plan.canRunDirectly && (
              <Button size="sm" onClick={handleRun} className="gap-1.5">
                <Play className="h-4 w-4" />
                Run Install
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
