import { useEffect } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePhpVersionStore } from "@/store/usePhpVersionStore";

export function PhpVersionSwitcher() {
  const {
    versions,
    isSwitching,
    isLoading,
    selectedUnit,
    loadVersions,
    setSelectedUnit,
    switchVersion,
  } = usePhpVersionStore();

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = versions.find((v) => v.active);
  const available = versions.filter((v) => v.available);

  if (isLoading && available.length === 0) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="animate-spin h-3 w-3" />
        Detecting PHP versions...
      </div>
    );
  }

  if (available.length === 0) {
    return null;
  }

  if (available.length === 1) {
    return (
      <div className="mt-2 flex items-center gap-1.5">
        <Badge variant="outline" className="text-[10px] font-mono">
          PHP {active?.versionLabel ?? available[0].versionLabel}
        </Badge>
        <span className="text-[10px] text-muted-foreground">(only version installed)</span>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
        PHP Version
      </p>
      <div className="flex items-center gap-2">
        <select
          value={selectedUnit ?? ""}
          onChange={(e) => setSelectedUnit(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {available.map((v) => (
            <option key={v.unitName} value={v.unitName}>
              {v.versionLabel} {v.active ? "(active)" : ""}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="outline"
          disabled={isSwitching || !selectedUnit || selectedUnit === active?.unitName}
          onClick={() => selectedUnit && switchVersion(selectedUnit)}
          className="gap-1.5 h-8 text-xs"
        >
          {isSwitching ? (
            <>
              <Loader2 className="animate-spin h-3 w-3" />
              Switching...
            </>
          ) : (
            <>
              <ArrowRightLeft className="h-3 w-3" />
              Switch
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
