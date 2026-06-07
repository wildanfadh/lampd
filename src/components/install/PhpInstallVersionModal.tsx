import { useState, useEffect, useRef } from "react";
import { X, Copy, Play, Check, Loader2, Terminal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InstallablePhpVersion, PhpVersionInstallPlan, ServiceLogEntry } from "@/lib/types";
import * as api from "@/lib/tauri";

interface PhpInstallVersionModalProps {
  open: boolean;
  onClose: () => void;
  onInstalled: () => void;
}

type ModalState = "loading" | "idle" | "installing" | "success" | "error";

const supportBadge: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  native: { label: "Ready", variant: "success" },
  repo_required: { label: "Needs Repo", variant: "warning" },
  legacy_risk: { label: "Legacy", variant: "destructive" },
};

export function PhpInstallVersionModal({ open, onClose, onInstalled }: PhpInstallVersionModalProps) {
  if (!open) return null;

  return (
    <PhpInstallVersionModalInner
      key="php-install"
      onClose={onClose}
      onInstalled={onInstalled}
    />
  );
}

function PhpInstallVersionModalInner({
  onClose,
  onInstalled,
}: {
  onClose: () => void;
  onInstalled: () => void;
}) {
  const [state, setState] = useState<ModalState>("loading");
  const [versions, setVersions] = useState<InstallablePhpVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [plan, setPlan] = useState<PhpVersionInstallPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const didInit = useRef(false);

  const loadVersions = async () => {
    setState("loading");
    try {
      const v = await api.listInstallablePhpVersions();
      const supported = v.filter((x) => x.supported);
      setVersions(v);
      if (supported.length > 0) {
        setSelectedVersion(supported[supported.length - 1].versionLabel);
      }
      setState("idle");
    } catch (e) {
      setError(String(e));
      setState("error");
    }
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    loadVersions();
  }, []);

  useEffect(() => {
    if (!selectedVersion) return;
    api
      .getPhpVersionInstallPlan(selectedVersion)
      .then(setPlan)
      .catch((e) => setError(String(e)));
  }, [selectedVersion]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    if (state !== "installing") return;
    const unsub = api.onInstallLog((entry: ServiceLogEntry) => {
      if (entry.serviceId.startsWith("php-install-")) {
        setLogs((prev) => [...prev, entry.line]);
      }
    });
    return () => { unsub(); };
  }, [state]);

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
      await api.runPhpVersionInstall(selectedVersion);
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

  const selected = versions.find((v) => v.versionLabel === selectedVersion);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[85vh] overflow-hidden mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">Install PHP Version</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {state === "loading" && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Loading available versions...
            </div>
          )}

          {state === "error" && !plan && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {error || "Failed to load"}
            </div>
          )}

          {versions.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Version</label>
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {versions.map((v) => (
                    <option key={v.versionLabel} value={v.versionLabel}>
                      PHP {v.versionLabel}
                    </option>
                  ))}
                </select>
                {selected && (
                  <Badge variant={supportBadge[selected.supportLevel]?.variant ?? "secondary"} className="text-[10px]">
                    {supportBadge[selected.supportLevel]?.label ?? selected.supportLevel}
                  </Badge>
                )}
              </div>

              {selected && selected.notes.length > 0 && (
                <ul className="space-y-1">
                  {selected.notes.map((note, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" />
                      {note}
                    </li>
                  ))}
                </ul>
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
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Package</p>
                    <span className="inline-flex items-center rounded-md bg-accent/10 border border-accent/20 px-2.5 py-1 text-xs font-mono text-accent">
                      {plan.packageName}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Command</p>
                    <div className="rounded-md bg-secondary/50 border border-border px-3 py-2.5 font-mono text-xs text-foreground break-all select-all">
                      {plan.commandPreview}
                    </div>
                  </div>

                  {plan.notes.length > 0 && (
                    <ul className="space-y-1">
                      {plan.notes.map((note, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-warning flex-shrink-0 mt-0.5" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  )}

                  {error && (
                    <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  {state === "success" && (
                    <div className="rounded-md bg-success/10 border border-success/30 px-3 py-2 text-sm text-success">
                      Installation completed. Refreshing...
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {logs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Output</p>
              </div>
              <div ref={logRef} className="rounded-md bg-black/30 border border-border p-3 font-mono text-[11px] leading-relaxed max-h-48 overflow-auto">
                {logs.map((line, i) => (
                  <div key={i} className="text-muted-foreground whitespace-pre-wrap break-all">{line}</div>
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
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <><Check className="h-4 w-4 text-success" /> Copied</> : <><Copy className="h-4 w-4" /> Copy Command</>}
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
