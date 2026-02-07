"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

interface Alert {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  entityId: string;
  entityType: string;
}

export default function FraudDetectionPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetch("/api/analytics/fraud").then((r) => r.json()).then(setAlerts);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fraud Detection</h1>
        <p className="text-sm text-muted-foreground">Bid pattern analysis and anomaly detection</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Alerts ({alerts.length})</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="py-8 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No suspicious patterns detected</p></div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={alert.severity === "high" ? "destructive" : alert.severity === "medium" ? "warning" : "secondary"} className="mt-0.5">{alert.severity}</Badge>
                  <div>
                    <p className="text-sm font-medium">{alert.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{alert.entityType}: {alert.entityId.slice(0, 8)}...</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
