import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  total: number;
  code_sent: number;
  remaining: number;
  limit: number;
  rows: Array<{
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    created_at: string;
    code_sent: boolean;
    code_sent_at: string | null;
  }>;
}

export default function AdminWaitlist() {
  const { toast } = useToast();
  const [key, setKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-waitlist-stats', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (error) throw error;
      setStats(data as Stats);
    } catch (e: any) {
      toast({ title: "Auth failed or server error", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="booking-card">
          <CardHeader>
            <CardTitle>Admin - Waitlist Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 max-sm:flex-col">
              <Input type="password" placeholder="Admin key" value={key} onChange={(e) => setKey(e.target.value)} />
              <Button onClick={fetchStats} disabled={!key || loading}>{loading ? 'Loading...' : 'Load stats'}</Button>
            </div>
            {stats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total</div><div className="text-xl font-semibold">{stats.total}</div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Codes sent</div><div className="text-xl font-semibold">{stats.code_sent}</div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Remaining</div><div className="text-xl font-semibold">{stats.remaining}</div></CardContent></Card>
                  <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Limit</div><div className="text-xl font-semibold">{stats.limit}</div></CardContent></Card>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b">
                        <th className="py-2 pr-2">Email</th>
                        <th className="py-2 pr-2">Name</th>
                        <th className="py-2 pr-2">Signed up</th>
                        <th className="py-2 pr-2">Code sent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rows.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 pr-2">{r.email}</td>
                          <td className="py-2 pr-2">{[r.first_name, r.last_name].filter(Boolean).join(' ')}</td>
                          <td className="py-2 pr-2">{new Date(r.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-2">{r.code_sent ? `Yes (${r.code_sent_at ? new Date(r.code_sent_at).toLocaleString() : ''})` : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
