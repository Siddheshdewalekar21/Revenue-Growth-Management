import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, LineChart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const Index = () => {
  const { data: products } = useQuery({
    queryKey: ["products-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: assortment } = useQuery({
    queryKey: ["assortment-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assortment_data").select("*, products(name)");
      if (error) throw error;
      return data;
    },
  });

  const avgPrice = products?.length
    ? (products.reduce((s, p) => s + Number(p.current_price), 0) / products.length).toFixed(2)
    : "0.00";

  const avgMargin = products?.length
    ? (products.reduce((s, p) => s + Number(p.margin_pct || 0), 0) / products.length).toFixed(1)
    : "0.0";

  const totalRevenue = assortment?.length
    ? assortment.reduce((s, a) => s + Number(a.revenue), 0)
    : 0;

  const avgGrowth = assortment?.length
    ? (assortment.reduce((s, a) => s + Number(a.revenue_growth_pct || 0), 0) / assortment.length).toFixed(1)
    : "0.0";

  const revenueByCategory = products?.reduce((acc, p) => {
    const rev = assortment?.find((a) => a.product_id === p.id);
    if (rev) {
      acc[p.category] = (acc[p.category] || 0) + Number(rev.revenue);
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(revenueByCategory || {}).map(([cat, rev]) => ({
    category: cat,
    revenue: rev,
  }));

  const modules = [
    { title: "Pricing", desc: "AI insight, elasticity, and competitive intelligence", icon: DollarSign, to: "/pricing", color: "bg-primary/10 text-primary" },
    { title: "Promotions", desc: "AI recommendation, scenarios, and upcoming events", icon: TrendingUp, to: "/promotions", color: "bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))]" },
    { title: "Assortment", desc: "AI-driven SKU and channel recommendations", icon: Package, to: "/assortment", color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]" },
    { title: "Forecasting", desc: "ML demand predictions (optional Use ML model)", icon: LineChart, to: "/forecasting", color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" },
  ];

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Overview</h1>
        <p className="text-muted-foreground">AI-driven RGM: optimize pricing, promotions, assortment, and revenue strategy with ML</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Avg Price" value={`$${avgPrice}`} change="+2.3% vs last quarter" changeType="positive" icon={DollarSign} />
        <KPICard title="Avg Margin" value={`${avgMargin}%`} change="+1.1pp" changeType="positive" icon={TrendingUp} />
        <KPICard title="Total Revenue" value={`$${(totalRevenue / 1000000).toFixed(1)}M`} change="+12.4% YoY" changeType="positive" icon={Package} />
        <KPICard title="Avg Growth" value={`${avgGrowth}%`} change="Across all categories" changeType="neutral" icon={LineChart} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Category</CardTitle>
            <CardDescription>Total revenue distribution across product categories</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 && (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Quick Access</CardTitle>
            <CardDescription>Navigate to your analytics modules</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {modules.map((m) => (
              <Link
                key={m.title}
                to={m.to}
                className="flex items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${m.color}`}>
                  <m.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
