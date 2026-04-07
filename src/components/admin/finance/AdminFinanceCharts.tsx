import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";
import { BarChart3 } from "lucide-react";

const AdminFinanceCharts = () => {
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      // Last 14 days
      const days: any[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();

        days.push({
          label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          dayStart,
          dayEnd,
        });
      }

      // Batch: get all completed courses in last 14 days
      const start14 = days[0].dayStart;
      const [coursesRes, feesRes, driversRes] = await Promise.all([
        supabase.from("courses").select("updated_at, final_payment_amount").eq("status", "completed").gte("updated_at", start14),
        supabase.from("solo_admin_ledger").select("created_at, fee_amount").gte("created_at", start14),
        supabase.from("drivers").select("created_at").eq("is_demo_account", false).gte("created_at", start14),
      ]);

      const courses = coursesRes.data || [];
      const fees = feesRes.data || [];
      const drivers = driversRes.data || [];

      const chartData = days.map((day) => {
        const dayCourses = courses.filter(c => c.updated_at >= day.dayStart && c.updated_at < day.dayEnd);
        const dayFees = fees.filter(f => f.created_at >= day.dayStart && f.created_at < day.dayEnd);
        const dayDrivers = drivers.filter(d => d.created_at >= day.dayStart && d.created_at < day.dayEnd);

        return {
          name: day.label,
          ca: dayCourses.reduce((s, c) => s + Number(c.final_payment_amount || 0), 0),
          fees: dayFees.reduce((s, f) => s + Number(f.fee_amount || 0), 0),
          courses: dayCourses.length,
          newDrivers: dayDrivers.length,
        };
      });

      setDailyData(chartData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center text-muted-foreground">Chargement graphiques...</div>;

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            CA & Frais SoloCab (14 jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => `${v.toFixed(2)}€`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="ca" name="CA" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fees" name="Frais SoloCab" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Courses & Nouveaux chauffeurs (14 jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="courses" name="Courses" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="newDrivers" name="Nvx chauffeurs" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinanceCharts;
