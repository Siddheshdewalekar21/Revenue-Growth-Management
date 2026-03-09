import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  LineChart as LineChartIcon, Target, TrendingUp, TrendingDown,
  BarChart3, DollarSign, RefreshCw, Loader2, AlertCircle, Zap,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// Accuracy gauge component
function AccuracyGauge({ mape }: { mape: number }) {
  const accuracy = Math.max(0, Math.min(100, 100 - mape));
  const color =
    accuracy >= 90 ? "#10b981"
      : accuracy >= 75 ? "#3b82f6"
        : accuracy >= 60 ? "#f59e0b"
          : "#ef4444";

  const r = 45;
  const circ = 2 * Math.PI * r;
  const dashLen = (accuracy / 100) * circ * 0.75;
  const gapLen = circ - dashLen;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="120" height="80" viewBox="0 0 120 80">
        {/* Background arc */}
        <circle
          cx="60" cy="65" r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
          transform="rotate(0)"
        />
        {/* Accuracy arc */}
        <circle
          cx="60" cy="65" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${dashLen} ${gapLen + circ * 0.25}`}
          strokeDashoffset={circ * 0.375}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="60" y="62" textAnchor="middle" className="text-lg font-bold" style={{ fill: color, fontSize: "16px", fontWeight: "bold" }}>
          {accuracy.toFixed(0)}%
        </text>
        <text x="60" y="75" textAnchor="middle" style={{ fill: "hsl(var(--muted-foreground))", fontSize: "9px" }}>
          accuracy
        </text>
      </svg>
    </div>
  );
}

const Forecasting = () => {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [lastUsedMl, setLastUsedMl] = useState<boolean | null>(null);
  const [recalculateError, setRecalculateError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: health } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      if (!res.ok) return { mlAvailable: false };
      const data = await res.json().catch(() => ({}));
      return { ...data, mlAvailable: data?.mlAvailable === true };
    },
    refetchInterval: 30000,
  });
  const mlAvailable = health?.mlAvailable === true;

  const { data: products } = useQuery({
    queryKey: ["products-forecast"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  useEffect(() => {
    if (!selectedProduct && products && products.length > 0) {
      setSelectedProduct(products[0]._id || products[0].id);
    }
  }, [products, selectedProduct]);

  const { data: forecasts, isLoading: forecastsLoading } = useQuery({
    queryKey: ["forecasts", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const params = new URLSearchParams({ productId: String(selectedProduct) });
      const res = await fetch(`${API_BASE_URL}/api/forecasts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch forecasts");
      return res.json();
    },
    enabled: !!selectedProduct,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["forecasts", selectedProduct] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: "Forecasts refreshed" });
  };

  const handleRecalculate = async () => {
    if (!selectedProduct || !mlAvailable) return;
    setRecalculateError(null);
    setIsRecalculating(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/forecasts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct, useMl: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRecalculateError(data.detail || data.error || "Failed to generate ML forecast");
        return;
      }
      setLastUsedMl(data.usedMl === true);
      if (data.usedMl !== true) {
        setRecalculateError("ML-only mode is enabled, but backend did not use ML.");
      } else {
        toast({ title: "ML Forecast generated", description: "Forecast updated with latest ML model." });
      }
      await queryClient.invalidateQueries({ queryKey: ["forecasts", selectedProduct] });
    } finally {
      setIsRecalculating(false);
    }
  };

  const historical = forecasts?.filter((f) => !f.is_forecast) || [];
  const forecast = forecasts?.filter((f) => f.is_forecast) || [];
  const projectedRevenue = forecast.reduce((s, f) => s + Number(f.predicted_revenue || 0), 0);
  const projectedProfit = forecast.reduce((s, f) => s + Number(f.predicted_profit || 0), 0);
  const projectedLoss = forecast.reduce((s, f) => s + Number(f.predicted_loss || f.loss_amount || 0), 0);

  // MAPE
  const mapeRaw = historical.length
    ? (historical.reduce((s, f) => {
      if (f.actual_demand && f.predicted_demand) {
        return s + Math.abs(f.actual_demand - f.predicted_demand) / f.actual_demand;
      }
      return s;
    }, 0) / historical.length * 100)
    : 0;
  const mape = mapeRaw.toFixed(1);

  // RMSE
  const rmse = historical.length
    ? Math.sqrt(
      historical.reduce((s, f) => {
        if (f.actual_demand && f.predicted_demand) {
          return s + Math.pow(f.actual_demand - f.predicted_demand, 2);
        }
        return s;
      }, 0) / historical.length
    ).toFixed(0)
    : "0";

  const demandChartData = forecasts?.map((f) => ({
    date: format(parseISO(f.forecast_date), "MMM yy"),
    actual: f.actual_demand,
    predicted: f.predicted_demand,
    isForecast: f.is_forecast,
  })) || [];

  // Find the split point for the reference line
  const splitIndex = forecasts?.findIndex((f) => f.is_forecast);
  const splitDate = splitIndex != null && splitIndex > 0 && demandChartData[splitIndex]
    ? demandChartData[splitIndex]?.date
    : null;

  const seasonalityData = forecasts?.map((f) => ({
    date: format(parseISO(f.forecast_date), "MMM yy"),
    index: Number(f.seasonality_index || 0),
    trend: Number(f.trend_component || 0),
  })) || [];

  const chartConfig = {
    actual: { label: "Actual Demand", color: "hsl(var(--chart-1))" },
    predicted: { label: "Predicted", color: "hsl(var(--chart-2))" },
    index: { label: "Seasonality", color: "hsl(var(--chart-3))" },
    trend: { label: "Trend", color: "hsl(var(--chart-1))" },
  };

  const selectedProductName = products?.find(
    (p: any) => (p._id || p.id) === selectedProduct
  )?.name || "";

  const accuracyPct = Math.max(0, 100 - Number(mape));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demand Forecasting</h1>
          <p className="text-muted-foreground">ML-only demand forecasting and trend analysis</p>
          {selectedProductName && (
            <p className="text-xs text-primary/70 font-medium mt-0.5">
              Analyzing: {selectedProductName}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* ML Status */}
            <div className={`flex items-center gap-1.5 text-xs rounded-full px-2.5 py-1 font-medium ${mlAvailable
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              }`}>
              <Zap className="h-3 w-3" />
              {mlAvailable ? "ML Ready" : "ML Unavailable"}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products?.map((p: any) => (
                <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={mlAvailable ? "default" : "outline"}
            size="sm"
            onClick={handleRecalculate}
            disabled={!selectedProduct || !mlAvailable || isRecalculating}
            className="w-full gap-1.5"
          >
            {isRecalculating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            ) : (
              <><Zap className="h-3.5 w-3.5" /> Recalculate Forecast</>
            )}
          </Button>
          {recalculateError && (
            <div className="flex items-start gap-1.5 max-w-[280px] rounded-md bg-destructive/10 border border-destructive/20 px-2 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{recalculateError}</p>
            </div>
          )}
          {lastUsedMl === true && (
            <Badge className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200">
              ✓ Last run used ML model
            </Badge>
          )}
        </div>
      </div>

      {/* KPIs + Accuracy Gauge */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card col-span-full sm:col-span-1 flex items-center justify-center p-4">
          <div className="text-center">
            <AccuracyGauge mape={Number(mape)} />
            <p className="text-xs font-medium text-muted-foreground mt-1">Forecast Accuracy</p>
            <p className="text-xs text-muted-foreground">MAPE: {mape}%</p>
          </div>
        </Card>
        <KPICard title="RMSE" value={rmse} change="Root mean square error" changeType="neutral" icon={Target} />
        <KPICard
          title="Forecast Horizon"
          value={`${forecast.length} months`}
          change="Forward-looking"
          changeType="neutral"
          icon={LineChartIcon}
        />
        <KPICard
          title="Data Points"
          value={String(historical.length)}
          change={lastUsedMl === true ? "Last: ML model" : "Model: ML only"}
          changeType="neutral"
          icon={BarChart3}
        />
        <KPICard
          title="Forecast Revenue"
          value={`$${(projectedRevenue / 1000000).toFixed(1)}M`}
          change="Projected total"
          changeType="positive"
          icon={DollarSign}
        />
        <KPICard
          title="Forecast Profit"
          value={`$${(projectedProfit / 1000000).toFixed(1)}M`}
          change="Projected net"
          changeType="positive"
          icon={TrendingUp}
        />
        <KPICard
          title="Forecast Loss"
          value={`$${(projectedLoss / 1000).toFixed(0)}K`}
          change="Projected downside"
          changeType="negative"
          icon={TrendingDown}
        />
      </div>

      {/* Demand chart */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Demand: Actual vs Forecast</CardTitle>
              <CardDescription>Historical demand with ML predictions (dashed = forecast).</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 rounded bg-primary" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-6 rounded border-t-2 border-dashed border-chart-2" style={{ borderColor: "hsl(var(--chart-2))" }} />
                <span>Forecast</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {forecastsLoading ? (
            <div className="flex h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : demandChartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <LineChart data={demandChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {splitDate && (
                  <ReferenceLine
                    x={splitDate}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    label={{ value: "Forecast →", position: "insideTopRight", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-muted-foreground">
              <LineChartIcon className="h-8 w-8 opacity-30" />
              <p className="text-sm">No forecast data. Select a product and recalculate.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seasonality + Trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Seasonality Index</CardTitle>
            <CardDescription>Seasonal patterns affecting demand</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <AreaChart data={seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="index"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Trend Component</CardTitle>
            <CardDescription>Long-term trend decomposition</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <LineChart data={seasonalityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="hsl(var(--chart-1))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Forecast detail table */}
      {forecast.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Forecast Detail</CardTitle>
            <CardDescription>{forecast.length} months of ML projections</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Predicted Demand</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Revenue</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Profit</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Loss</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Seasonality</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f, i) => (
                    <tr
                      key={i}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {format(parseISO(f.forecast_date), "MMM yyyy")}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {Number(f.predicted_demand || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${(Number(f.predicted_revenue || 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-blue-600 dark:text-blue-400">
                        ${(Number(f.predicted_profit || 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-red-500">
                        ${(Number(f.predicted_loss || f.loss_amount || 0) / 1000).toFixed(1)}K
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono">
                        {Number(f.seasonality_index || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Forecasting;
