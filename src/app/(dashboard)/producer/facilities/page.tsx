import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseJsonArray } from "@/lib/utils";
import { SAF_CATEGORIES, type SAFCategoryCode } from "@/lib/constants/saf-categories";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Factory } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function FacilitiesPage() {
  const session = await auth();
  const facilities = await db.productionFacility.findMany({
    where: { producerId: session?.user?.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production Facilities</h1>
          <p className="text-sm text-muted-foreground">Manage your SAF production facilities</p>
        </div>
      </div>

      {facilities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Factory className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No facilities registered yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {facilities.map((facility) => {
            const catInfo = SAF_CATEGORIES[facility.safCategory as SAFCategoryCode];
            const certs = parseJsonArray(facility.certifications);

            return (
              <Card key={facility.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{facility.name}</CardTitle>
                    <Badge
                      variant={facility.status === "active" ? "success" : "secondary"}
                    >
                      {facility.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{facility.location}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Pathway</p>
                      <Badge variant="outline" style={{ borderColor: catInfo?.color }}>
                        {catInfo?.shortName ?? facility.safCategory}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Carbon Intensity</p>
                      <p className="font-medium tabular-nums">{facility.ciScore} gCO2e/MJ</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Annual Capacity</p>
                      <p className="font-medium tabular-nums">{facility.annualCapacity.toLocaleString()} MT</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Feedstock</p>
                      <p className="font-medium">{facility.feedstock}</p>
                    </div>
                  </div>
                  {certs.length > 0 && (
                    <div className="flex gap-1">
                      {certs.map((cert) => (
                        <Badge key={cert} variant="info" className="text-[10px]">{cert}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
