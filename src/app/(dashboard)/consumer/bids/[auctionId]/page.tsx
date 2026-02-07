"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export default function SubmitBidPage({ params }: { params: Promise<{ auctionId: string }> }) {
  const { auctionId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [auction, setAuction] = useState<{ title: string; categories: string; auctionType: string } | null>(null);
  const [form, setForm] = useState({
    safCategory: "",
    quantity: "",
    maxPrice: "",
    allowSubstitution: false,
  });

  useEffect(() => {
    fetch(`/api/auctions/${auctionId}`)
      .then((r) => r.json())
      .then(setAuction);
  }, [auctionId]);

  const categories = auction ? JSON.parse(auction.categories) as string[] : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch(`/api/auctions/${auctionId}/bids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        safCategory: form.safCategory,
        quantity: parseFloat(form.quantity),
        maxPrice: parseFloat(form.maxPrice),
        allowSubstitution: form.allowSubstitution,
      }),
    });

    if (res.ok) {
      toast.success("Bid submitted successfully");
      router.push("/consumer/bids");
      router.refresh();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to submit bid");
    }
    setLoading(false);
  }

  if (!auction) return <div className="text-muted-foreground">Loading auction...</div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Submit Bid</h1>
        <p className="text-sm text-muted-foreground">{auction.title}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bid Details</CardTitle>
            <CardDescription>Your bid is sealed - other participants cannot see it until the auction clears.</CardDescription>
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
              <Label>Quantity (gallons)</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="e.g., 50000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Maximum Price ($/gallon)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.maxPrice}
                onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                placeholder="e.g., 5.50"
                required
              />
              <p className="text-xs text-muted-foreground">
                Vickrey pricing: you will pay the second-highest price, not your bid.
              </p>
            </div>

            {auction.auctionType === "vcg" && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>Allow Category Substitution</Label>
                  <p className="text-xs text-muted-foreground">
                    Accept alternative SAF categories per the auction substitution matrix
                  </p>
                </div>
                <Switch
                  checked={form.allowSubstitution}
                  onCheckedChange={(v: boolean) => setForm({ ...form, allowSubstitution: v })}
                />
              </div>
            )}

            {form.quantity && form.maxPrice && (
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">Maximum total cost</p>
                <p className="text-lg font-bold tabular-nums">
                  ${(parseFloat(form.quantity) * parseFloat(form.maxPrice)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !form.safCategory}>
              {loading ? "Submitting..." : "Submit Sealed Bid"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
