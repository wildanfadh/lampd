import { Badge } from "@/components/ui/badge";

const statusConfig: Record<string, { variant: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  Running: { variant: "success" },
  Stopped: { variant: "secondary" },
  Error: { variant: "destructive" },
  "Not Installed": { variant: "outline" },
  Unknown: { variant: "warning" },
};

interface ServiceStatusBadgeProps {
  status: string;
}

export function ServiceStatusBadge({ status }: ServiceStatusBadgeProps) {
  const config = statusConfig[status] ?? { variant: "warning" as const };
  return <Badge variant={config.variant}>{status}</Badge>;
}
