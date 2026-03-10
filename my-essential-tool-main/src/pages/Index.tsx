import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  DollarSign, TrendingUp, Package, Percent, BarChart3,
  RefreshCw, ArrowRight, Zap, ShoppingCart, Tag, Activity,
  Database, AlertCircle, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const formatMs = (ms: number) =>
  ms < 2000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSeedingDB, setIsSeedingDB] = useState(false);
  const [apiLatency, setApiLatency] = useState<number | null>(null);

  // ─── Single summary endpoint (new) ──────────────────────────────────────────
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const t0 = performance.now();
      const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
      setApiLatency(Math.round(performance.now() - t0));
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // ─── Health endpoint ─────────────────────────────────────────────────────────
  const { data: health } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) return { status: "error" };
      return res.json();
    },
    refetchInterval: 30_000,
  });

  // ─── DB stats ────────────────────────────────────────────────────────────────
  const { data: dbStats } = useQuery({
    queryKey: ["db-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/stats`);
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const isBackendOnline = health?.status === "ok" || health?.status === "degraded";
  const isDbConnected = health?.db?.connected !== false;
  const mlCap = summary?.ml_capabilities || health?.mlCapabilities || {};

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setLastRefreshed(new Date());
    setTimeout(() => setIsRefreshing(false), 700);
    toast({ title: "Dashboard refreshed" });
  };

  const handleSeedDB = async () => {
    setIsSeedingDB(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/seed`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Seed failed");
      await queryClient.invalidateQueries();
      setLastRefreshed(new Date());
      toast({
        title: "Database seeded!",
        description: `${data.log?.length || 0} steps completed.`,
      });
    } catch (e: any) {
      toast({ title: "Seed failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSeedingDB(false);
    }
  };

  // Sparkline data (derived from category revenue breakdown)
  const categoryRevenue = summary?.category_revenue || [];

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  };

  const modules = [
    {
      label: "Pricing",
      desc: "AI-driven price recommendations",
      icon: Tag,
      path: "/pricing",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      stat: summary ? `$${Number(summary.avg_price).toFixed(2)} avg` : null,
      badge: mlCap.pricing ? "ML" : undefined,
    },
    {
      label: "Promotions",
      desc: "Simulate and optimize campaigns",
      icon: TrendingUp,
      path: "/promotions",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      stat: summary ? `${summary.active_promos} active` : null,
      badge: mlCap.promotions ? "ML" : undefined,
    },
    {
      label: "Assortment",
      desc: "SKU add/keep/delist analysis",
      icon: ShoppingCart,
      path: "/assortment",
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      stat: summary ? `${summary.assortment_add} add recs` : null,
      badge: mlCap.assortment ? "ML" : undefined,
    },
    {
      label: "Forecasting",
      desc: "ML demand prediction",
      icon: BarChart3,
      path: "/forecasting",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      stat: summary ? `${summary.product_count} products` : null,
      badge: mlCap.forecasting ? "ML" : undefined,
    },
  ];

  const revenueMillions = summary ? (Number(summary.total_revenue) / 1_000_000).toFixed(1) : "—";
  const netProfitMillions = summary ? (Number(summary.total_net_profit) / 1_000_000).toFixed(1) : "—";
  const lossK = summary ? (Number(summary.total_loss) / 1_000).toFixed(0) : "—";

  // Dynamic change labels computed from real H1 vs H2 data
  const fmtChange = (pct: number, suffix = "H1→H2") =>
    pct === 0 ? `—` : `${pct > 0 ? "+" : ""}${pct}% ${suffix}`;
  const revenueChangeLabel = summary ? fmtChange(summary.revenue_change_pct) : "Loading…";
  const profitChangeLabel = summary ? fmtChange(summary.profit_change_pct) : "Loading…";
  const lossChangeLabel = summary ? fmtChange(summary.loss_change_pct) : "Loading…";

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground">Revenue Growth Management · Real-time overview</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {/* Backend status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={`inline-block h-2 w-2 rounded-full ${isBackendOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
              />
              {isBackendOnline ? (
                <span>Backend <strong className="text-foreground">Online</strong></span>
              ) : (
                <span className="text-red-500">Backend Offline</span>
              )}
            </div>
            {/* DB status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className={`h-3 w-3 ${isDbConnected ? "text-emerald-500" : "text-red-500"}`} />
              <span>DB {isDbConnected ? "Connected" : "Disconnected"}</span>
            </div>
            {/* Latency */}
            {apiLatency !== null && (
              <span className="text-xs text-muted-foreground">API: {formatMs(apiLatency)}</span>
            )}
            {/* Last refreshed */}
            <span className="text-xs text-muted-foreground">
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ML Badges */}
          {Object.entries(mlCap).map(([key, enabled]) => (
            <Badge
              key={key}
              variant="outline"
              className={`text-[10px] gap-1 ${enabled
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground/50 border-border/40"
                }`}
            >
              <Zap className="h-2.5 w-2.5" />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Badge>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSeedDB}
            disabled={isSeedingDB}
            className="gap-1.5 border-amber-300/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <Database className={`h-3.5 w-3.5 ${isSeedingDB ? "animate-pulse" : ""}`} />
            {isSeedingDB ? "Seeding…" : "Seed DB"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Error Banner ─── */}
      {summaryError && !summaryLoading && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Backend not reachable</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              Make sure the Python backend is running on port 4000.
              Start with: <code className="font-mono">uvicorn main:app --port 4000 --reload</code>
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh} className="shrink-0">Retry</Button>
        </div>
      )}

      {/* ─── KPI Cards ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <KPICard
          title="Total Revenue"
          value={summaryLoading ? "…" : `$${revenueMillions}M`}
          change={summaryLoading ? "Loading…" : revenueChangeLabel}
          changeType={summary?.revenue_change_pct >= 0 ? "positive" : "negative"}
          icon={DollarSign}
        />
        <KPICard
          title="Net Profit"
          value={summaryLoading ? "…" : `$${netProfitMillions}M`}
          change={summaryLoading ? "Loading…" : profitChangeLabel}
          changeType={summary?.profit_change_pct >= 0 ? "positive" : "negative"}
          icon={TrendingUp}
        />
        <KPICard
          title="Total Loss"
          value={summaryLoading ? "…" : `$${lossK}K`}
          change={summaryLoading ? "Loading…" : lossChangeLabel}
          changeType={summary?.loss_change_pct <= 0 ? "positive" : "negative"}
          icon={Percent}
        />
        <KPICard
          title="Products"
          value={summaryLoading ? "…" : String(summary?.product_count ?? "—")}
          change={summary ? `${summary.avg_margin}% avg margin` : "Loading…"}
          changeType="neutral"
          icon={Package}
          badge={summary?.product_count > 0 ? String(summary.product_count) : undefined}
        />
        <KPICard
          title="Active Promos"
          value={summaryLoading ? "…" : String(summary?.active_promos ?? "—")}
          change={summary ? `ROI avg ${summary.avg_roi}x` : "Loading…"}
          changeType="positive"
          icon={Tag}
          badge={summary?.active_promos > 0 ? "Live" : undefined}
        />
        <KPICard
          title="Avg Rev Lift"
          value={summaryLoading ? "…" : `${summary?.avg_lift ?? 0}%`}
          change="Across promotions"
          changeType="positive"
          icon={Activity}
        />
      </div>

      {/* ─── DB Stats Row ─── */}
      {dbStats && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-sm">Database Collections</CardTitle>
              <Badge variant="outline" className="text-[10px]">{dbStats.db}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(dbStats.collections as Record<string, number>).map(([col, count]) => (
                <div key={col} className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground capitalize">{col.replace(/_/g, " ")}:</span>
                  <span className="font-bold text-primary">{count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Revenue by Category ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Category</CardTitle>
            <CardDescription>
              Total revenue across {categoryRevenue.length} product categories (from pricing records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryRevenue.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[240px] w-full">
                <BarChart data={categoryRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
                  />
                  <YAxis type="category" dataKey="category" width={90} className="text-xs" />
                  <ChartTooltip
                    content={<ChartTooltipContent formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`} />}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[240px] items-center justify-center text-muted-foreground">
                <p className="text-sm">No data. Seed the database or start the backend.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Assortment Summary ─── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Assortment Recommendations</CardTitle>
            <CardDescription>AI recommendation breakdown across all SKUs</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <div className="space-y-4">
                {[
                  { label: "Add", count: summary.assortment_add, color: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", desc: "Expand these SKUs" },
                  { label: "Keep", count: summary.assortment_keep, color: "bg-blue-500", text: "text-blue-700 dark:text-blue-400", desc: "Maintain current listing" },
                  { label: "Delist", count: summary.assortment_delist, color: "bg-red-500", text: "text-red-700 dark:text-red-400", desc: "Remove from assortment" },
                  { label: "Review", count: (dbStats?.collections?.assortment_data ?? 0) - summary.assortment_add - summary.assortment_keep - summary.assortment_delist, color: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", desc: "Needs investigation" },
                ].map(({ label, count, color, text, desc }) => {
                  const total = dbStats?.collections?.assortment_data || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
                          <span className="font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">{desc}</span>
                        </div>
                        <span className={`font-bold ${text}`}>{Math.max(0, count)}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${color} transition-all duration-700`}
                          style={{ width: `${Math.max(0, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                <p className="text-sm">{summaryLoading ? "Loading…" : "No assortment data"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Module Quick Access ─── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Navigation</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card
                key={mod.label}
                className="glass-card cursor-pointer group hover:border-primary/30 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
                onClick={() => navigate(mod.path)}
              >
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className={`h-10 w-10 rounded-xl ${mod.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <Icon className={`h-5 w-5 ${mod.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-all group-hover:translate-x-0.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{mod.label}</h3>
                      {mod.badge && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          <Zap className="h-2.5 w-2.5 mr-0.5" />{mod.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{mod.desc}</p>
                  </div>
                  {mod.stat && (
                    <p className={`text-sm font-bold ${mod.color}`}>{mod.stat}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
