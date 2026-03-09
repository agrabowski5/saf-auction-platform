import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Complete record of all platform actions</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3 text-left font-medium">Timestamp</th><th className="p-3 text-left font-medium">Actor</th><th className="p-3 text-left font-medium">Action</th><th className="p-3 text-left font-medium">Entity</th><th className="p-3 text-left font-medium">Details</th></tr></thead>
            <tbody>{logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-accent/30">
                <td className="p-3 text-xs text-muted-foreground tabular-nums">{format(new Date(log.createdAt), "MMM d HH:mm:ss")}</td>
                <td className="p-3 text-sm">{log.actor?.name ?? "System"}</td>
                <td className="p-3"><Badge variant="outline" className="text-[10px]">{log.action}</Badge></td>
                <td className="p-3 text-sm">{log.entityType}:{log.entityId.slice(0, 8)}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{log.details}</td>
              </tr>
            ))}</tbody>
          </table>
          {logs.length === 0 && <div className="py-12 text-center"><ScrollText className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No audit events yet</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
