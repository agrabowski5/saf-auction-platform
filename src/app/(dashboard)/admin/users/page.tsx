import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-sm text-muted-foreground">All registered users on the platform</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead><tr className="border-b text-xs text-muted-foreground"><th className="p-3 text-left font-medium">Name</th><th className="p-3 text-left font-medium">Email</th><th className="p-3 text-left font-medium">Role</th><th className="p-3 text-left font-medium">Company</th><th className="p-3 text-left font-medium">Joined</th><th className="p-3 text-left font-medium">Status</th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-accent/30">
                <td className="p-3 text-sm font-medium">{user.name} {user.isDemo && <Badge variant="warning" className="text-[10px] ml-1">DEMO</Badge>}</td>
                <td className="p-3 text-sm text-muted-foreground">{user.email}</td>
                <td className="p-3"><Badge variant={user.role === "admin" ? "default" : user.role === "producer" ? "success" : "info"} className="text-[10px]">{user.role}</Badge></td>
                <td className="p-3 text-sm">{user.company ?? "-"}</td>
                <td className="p-3 text-xs text-muted-foreground">{format(new Date(user.createdAt), "MMM d, yyyy")}</td>
                <td className="p-3"><Badge variant={user.verified ? "success" : "secondary"} className="text-[10px]">{user.verified ? "verified" : "unverified"}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
