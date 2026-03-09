import { Globe } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Globe className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold">Carbon Abatement</h1>
          <p className="text-sm text-muted-foreground">
            Emissions Tracking & Abatement Marketplace
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
