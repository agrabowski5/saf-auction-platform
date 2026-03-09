"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Factory, Plane, Shield } from "lucide-react";

const PERSONAS = [
  {
    role: "consumer",
    label: "Company / Emitter",
    description: "Delta Air Lines - Track emissions, purchase abatements, manage reduction targets",
    icon: Plane,
    color: "text-blue-400",
  },
  {
    role: "producer",
    label: "Abatement Provider",
    description: "Neste Oil - List abatements, manage facilities, track transactions",
    icon: Factory,
    color: "text-green-400",
  },
  {
    role: "admin",
    label: "Market Administrator",
    description: "Platform Admin - Manage auctions, oversee transactions, platform analytics",
    icon: Shield,
    color: "text-purple-400",
  },
];

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enterDemo(role: string) {
    setLoading(role);
    setError(null);

    try {
      // Seed demo data
      const seedRes = await fetch("/api/demo/seed", { method: "POST" });
      if (!seedRes.ok) {
        setError("Failed to initialize demo data. Please try again.");
        setLoading(null);
        return;
      }

      // Login as demo user
      const result = await signIn("credentials", {
        email: `demo-${role}@saf-auction.com`,
        password: "demo-password-123",
        redirect: false,
      });

      if (result?.error) {
        setError(`Login failed: ${result.error}. Please try again.`);
        setLoading(null);
        return;
      }

      router.push(`/${role}`);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Demo Mode</CardTitle>
          <CardDescription>
            Select a persona to explore the platform. You can switch between roles at any time using the demo banner.
          </CardDescription>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {PERSONAS.map((persona) => {
        const Icon = persona.icon;
        return (
          <Card
            key={persona.role}
            className="cursor-pointer transition-colors hover:bg-accent/50"
            onClick={() => enterDemo(persona.role)}
          >
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`rounded-lg bg-secondary p-3 ${persona.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{persona.label}</h3>
                <p className="text-sm text-muted-foreground">{persona.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={loading !== null}
              >
                {loading === persona.role ? "Loading..." : "Enter"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
