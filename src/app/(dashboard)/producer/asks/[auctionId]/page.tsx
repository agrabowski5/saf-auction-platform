"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAF_CATEGORY_LIST } from "@/lib/constants/saf-categories";
import { toast } from "sonner";
import { use } from "react";

interface Facility {
  id: string;
  name: string;
  safCategory: string;
  ciScore: number;
}

export default function SubmitAskPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { auctionId } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [auction, setAuction] = useState<{ title: string; categories: string } | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [form, setForm] = useState({
    safCategory: "",
    quantity: "",
    minPrice: "",
    facilityId: "",
  });

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}`).then((r) => r.json()).then(setAuction);
    fetch("/api/facilities").then((r) => r.json()).then(setFacilities);
  }, [auctionId]);

  const categories = auction ? JSON.parse(auction.categories) as string[] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/auctions/${auctionId}/asks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        safCategory: form.safCategory,
        quantity: parseFloat(form.quantity),
        minPrice: parseFloat(form.minPrice),
        facilityId: form.facilityId || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Ask submitted successfully");
      router.push("/producer/asks");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to submit ask");
    }
    setLoading(false);
  }

  if (!auction) return <div className="text-muted-foreground">Loading auction...</div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Ask</h1>
        <p className="text-sm text-muted-foreground">{auction.title}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ask Details</CardTitle>
            <CardDescription>Specify the SAF you can supply and your minimum acceptable price.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>SAF Category</Label>
              <Select value={form.safCategory} onValueChange={(v) => setForm({ ...form, safCategory: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((code: string) => {
                    const cat = SAF_CATEGORY_LIST.find((c) => c.code === code);
                    return (
                      <SelectItem key={code} value={code}>
                        {cat?.shortName ?? code} - {cat?.name ?? code}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Production Facility</Label>
              <Select value={form.facilityId} onValueChange={(v) => setForm({ ...form, facilityId: v })}>
                <SelectTrigger><SelectValue placeholder="Select facility (optional)" /></SelectTrigger>
                <SelectContent>
                  {facilities.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name} ({f.safCategory}, CI: {f.ciScore})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity Available (gallons)</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="e.g., 100000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Minimum Price ($/gallon)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.minPrice}
                onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                placeholder="e.g., 4.80"
                required
              />
            </div>

            {form.quantity && form.minPrice && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Minimum total revenue</p>
                <p className="text-lg font-bold tabular-nums">
                  ${(parseFloat(form.quantity) * parseFloat(form.minPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !form.safCategory}>
              {loading ? "Submitting..." : "Submit Sealed Ask"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
