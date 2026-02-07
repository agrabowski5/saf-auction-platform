"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SAF_CATEGORY_LIST } from "@/lib/constants/saf-categories";
import { toast } from "sonner";

export default function CreateAuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    auctionType: "vickrey",
    categories: [] as string[],
    startTime: "",
    endTime: "",
    reservePricePerGal: "",
    aggregateReserve: "",
    minBidQuantity: "0",
    maxBidQuantity: "",
  });

  function toggleCategory(code: string) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(code)
        ? f.categories.filter((c) => c !== code)
        : [...f.categories, code],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      reservePricePerGal: form.reservePricePerGal ? parseFloat(form.reservePricePerGal) : undefined,
      aggregateReserve: form.aggregateReserve ? parseFloat(form.aggregateReserve) : undefined,
      minBidQuantity: parseFloat(form.minBidQuantity) || 0,
      maxBidQuantity: form.maxBidQuantity ? parseFloat(form.maxBidQuantity) : undefined,
    };

    const res = await fetch("/api/auctions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Auction created successfully");
      router.push(`/admin/auctions/${data.id}`);
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to create auction");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Auction</h1>
        <p className="text-sm text-muted-foreground">Configure auction parameters and SAF categories</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Q1 2026 HEFA Forward Auction" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the auction terms and delivery requirements..." />
            </div>

            <div className="space-y-2">
              <Label>Auction Type</Label>
              <Select value={form.auctionType} onValueChange={(v) => setForm({ ...form, auctionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vickrey">Vickrey (Second Price) - Single Category</SelectItem>
                  <SelectItem value="vcg">VCG (Multi-Category) - Substitution Allowed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>SAF Categories</Label>
              <div className="grid grid-cols-3 gap-2">
                {SAF_CATEGORY_LIST.map((cat) => (
                  <button
                    key={cat.code}
                    type="button"
                    onClick={() => toggleCategory(cat.code)}
                    className={`rounded-md border p-2 text-left text-xs transition-colors ${
                      form.categories.includes(cat.code) ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <p className="font-semibold">{cat.shortName}</p>
                    <p className="text-muted-foreground text-[10px]">{cat.maturityLevel}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="datetime-local" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reserve Price ($/gal)</Label>
                <Input type="number" step="0.01" value={form.reservePricePerGal} onChange={(e) => setForm({ ...form, reservePricePerGal: e.target.value })} placeholder="Optional" />
              </div>
              <div className="space-y-2">
                <Label>Aggregate Reserve ($)</Label>
                <Input type="number" step="0.01" value={form.aggregateReserve} onChange={(e) => setForm({ ...form, aggregateReserve: e.target.value })} placeholder="Optional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Bid Quantity (gal)</Label>
                <Input type="number" value={form.minBidQuantity} onChange={(e) => setForm({ ...form, minBidQuantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max Bid Quantity (gal)</Label>
                <Input type="number" value={form.maxBidQuantity} onChange={(e) => setForm({ ...form, maxBidQuantity: e.target.value })} placeholder="Unlimited" />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || form.categories.length === 0}>
              {loading ? "Creating..." : "Create Auction"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
