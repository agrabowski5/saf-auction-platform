import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck } from "lucide-react";

export default async function ConsumerCertificatesPage() {
  const session = await auth();
  const certs = await db.certificate.findMany({
    where: { holderId: session?.user?.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Awarded Certificates</h1>
        <p className="text-sm text-muted-foreground">Environmental attribute certificates from won auctions</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3 text-left font-medium">Certificate #</th><th className="p-3 text-left font-medium">Type</th><th className="p-3 text-left font-medium">Category</th><th className="p-3 text-right font-medium">Quantity</th><th className="p-3 text-right font-medium">CI Score</th><th className="p-3 text-left font-medium">Status</th></tr></thead>
            <tbody>{certs.map((cert) => (
              <tr key={cert.id} className="border-b hover:bg-accent/30">
                <td className="p-3 text-sm font-mono">{cert.certNumber}</td>
                <td className="p-3"><Badge variant="outline" className="text-[10px]">{cert.certType}</Badge></td>
                <td className="p-3"><Badge variant="outline" className="text-[10px]">{cert.safCategory}</Badge></td>
                <td className="p-3 text-right text-sm tabular-nums">{cert.quantity.toLocaleString()}</td>
                <td className="p-3 text-right text-sm tabular-nums">{cert.ciScore ?? "-"}</td>
                <td className="p-3"><Badge variant={cert.verificationStatus === "verified" ? "success" : "warning"}>{cert.verificationStatus}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
          {certs.length === 0 && <div className="py-12 text-center"><FileCheck className="mx-auto h-8 w-8 text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">No certificates awarded yet.</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
