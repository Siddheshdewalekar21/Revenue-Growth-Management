import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Package, LineChart, ArrowRight, Loader2, ServerCrash, DatabaseZap } from "lucide-react";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const Index = () => {
  const {
    data: products,
    isLoading: productsLoading,
    error: productsError,
  } = useQuery({
    queryKey: ["products-overview"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      return res.json();
    },
  });

  const {
    data: assortment,
    isLoading: assortmentLoading,
    error: assortmentError,
  } = useQuery({
    queryKey: ["assortment-overview"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/assortment`);
      if (!res.ok) throw new Error(`Assortment fetch failed: ${res.status}`);
      return res.json();
    },
  });

  const isLoading = productsLoading || assortmentLoading;
  const hasError = productsError || assortmentError;
  const hasData = (products?.length ?? 0) > 0 || ((assortment?.items ?? assortment)?.length ?? 0) > 0;

  // Assortment can return { items: [...] } or just an array
  const assortmentItems: any[] = Array.isArray(assortment)
    ? assortment
    : Array.isArray(assortment?.items)
      ? assortment.items
      : [];

  const avgPrice = products?.length
    ? (products.reduce((s: number, p: any) => s + Number(p.current_price), 0) / products.length).toFixed(2)
    : "0.00";

  const avgMargin = products?.length
    ? (products.reduce((s: number, p: any) => s + Number(p.margin_pct || 0), 0) / products.length).toFixed(1)
    : "0.0";

  const totalRevenue = assortmentItems.length
    ? assortmentItems.reduce((s: number, a: any) => s + Number(a.revenue || 0), 0)
    : 0;

  const avgGrowth = assortmentItems.length
    ? (
      assortmentItems.reduce((s: number, a: any) => s + Number(a.revenue_growth_pct || 0), 0) /
      assortmentItems.length
    ).toFixed(1)
    : "0.0";

  // Build revenue by category: join products → assortment on product_id / _id
  const productMap = new Map(
    (products || []).map((p: any) => [String(p._id || p.id), p])
  );

  const revenueByCategory: Record<string, number> = {};
  assortmentItems.forEach((a: any) => {
    const prod = productMap.get(String(a.product_id));
    const cat = prod?.category ?? a.category ?? "Other";
    revenueByCategory[cat] = (revenueByCategory[cat] || 0) + Number(a.revenue || 0);
  });

  const chartData = Object.entries(revenueByCategory).map(([category, revenue]) => ({
    category,
    revenue,
  }));

  const modules = [
    {
      title: "Pricing",
      desc: "AI insight, elasticity, and competitive intelligence",
      icon: DollarSign,
      to: "/pricing",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Promotions",
      desc: "AI recommendation, scenarios, and upcoming events",
      icon: TrendingUp,
      to: "/promotions",
      color: "bg-[hsl(var(--secondary))]/10 text-[hsl(var(--secondary))]",
    },
    {
      title: "Assortment",
      desc: "AI-driven SKU and channel recommendations",
      icon: Package,
      to: "/assortment",
      color: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
    },
    {
      title: "Forecasting",
      desc: "ML demand predictions (optional Use ML model)",
      icon: LineChart,
      to: "/forecasting",
      color: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
    },
  ];

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Executive Overview</h1>
        <p className="text-muted-foreground">
          AI-driven RGM: optimize pricing, promotions, assortment, and revenue strategy with ML
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading dashboard data from MongoDB…</span>
        </div>
      )}

      {/* Backend connection error */}
      {hasError && !isLoading && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <ServerCrash className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-semibold text-destructive">Cannot reach the backend</p>
            <p className="text-muted-foreground">
              Make sure the FastAPI server is running on{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">{API_BASE_URL}</code>.
              Run <code className="rounded bg-muted px-1 py-0.5 text-xs">start.bat</code> or{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                uvicorn main:app --port 4000
              </code>{" "}
              in the <code className="rounded bg-muted px-1 py-0.5 text-xs">python-backend</code>{" "}
              folder, then refresh.
            </p>
          </div>
        </div>
      )}

      {/* Empty DB nudge */}
      {!isLoading && !hasError && !hasData && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-4">
          <DatabaseZap className="mt-0.5 h-5 w-5 text-amber-500" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-300">
              MongoDB collections are empty
            </p>
            <p className="text-muted-foreground">
              Run <code className="rounded bg-muted px-1 py-0.5 text-xs">start.bat</code> with the
              seed option, or open the MongoDB playground files to insert sample data.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Avg Price"
          value={`$${avgPrice}`}
          change="+2.3% vs last quarter"
          changeType="positive"
          icon={DollarSign}
        />
        <KPICard
          title="Avg Margin"
          value={`${avgMargin}%`}
          change="+1.1pp"
          changeType="positive"
          icon={TrendingUp}
        />
        <KPICard
          title="Total Revenue"
          value={`$${(totalRevenue / 1_000_000).toFixed(1)}M`}
          change="+12.4% YoY"
          changeType="positive"
          icon={Package}
        />
        <KPICard
          title="Avg Growth"
          value={`${avgGrowth}%`}
          change="Across all categories"
          changeType="neutral"
          icon={LineChart}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by category chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Category</CardTitle>
            <CardDescription>Total revenue distribution across product categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[260px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="category" className="text-xs" />
                  <YAxis
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `$${(v / 1_000_000).toFixed(1)}M`
                        : `$${(v / 1_000).toFixed(0)}k`
                    }
                    className="text-xs"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <Package className="h-8 w-8 opacity-30" />
                <p className="text-sm">No category data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick access */}
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
