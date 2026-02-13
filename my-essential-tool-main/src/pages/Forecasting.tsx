import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from "recharts";
import { LineChart as LineChartIcon, Target, TrendingUp, BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const Forecasting = () => {
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const queryClient = useQueryClient();

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

  const { data: forecasts } = useQuery({
    queryKey: ["forecasts", selectedProduct],
    queryFn: async () => {
      if (!selectedProduct) return [];
      const params = new URLSearchParams({ productId: String(selectedProduct) });
      const res = await fetch(`${API_BASE_URL}/api/forecasts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch forecasts");
      return res.json();
    },
  });

  const handleRecalculate = async () => {
    if (!selectedProduct) return;

    await fetch(`${API_BASE_URL}/api/forecasts/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ productId: selectedProduct }),
    });

    await queryClient.invalidateQueries({ queryKey: ["forecasts", selectedProduct] });
  };

  const historical = forecasts?.filter((f) => !f.is_forecast) || [];
  const forecast = forecasts?.filter((f) => f.is_forecast) || [];

  // MAPE calculation
  const mape = historical.length
    ? (historical.reduce((s, f) => {
        if (f.actual_demand && f.predicted_demand) {
          return s + Math.abs(f.actual_demand - f.predicted_demand) / f.actual_demand;
        }
        return s;
      }, 0) / historical.length * 100).toFixed(1)
    : "0.0";

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demand Forecasting</h1>
          <p className="text-muted-foreground">AI-powered demand predictions and trend analysis</p>
        </div>
        <div className="flex flex-col items-end gap-2">
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
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={!selectedProduct}
          >
            Recalculate forecast
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="MAPE" value={`${mape}%`} change="Forecast accuracy" changeType="positive" icon={Target} />
        <KPICard title="RMSE" value={rmse} change="Root mean square error" changeType="neutral" icon={BarChart3} />
        <KPICard title="Forecast Horizon" value={`${forecast.length} months`} change="Forward-looking" changeType="neutral" icon={LineChartIcon} />
        <KPICard title="Data Points" value={String(historical.length)} change="Historical months" changeType="neutral" icon={TrendingUp} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Demand: Actual vs Forecast</CardTitle>
          <CardDescription>Historical demand with AI-generated predictions (dashed = forecast)</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[320px] w-full">
            <LineChart data={demandChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="actual" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              <Line type="monotone" dataKey="predicted" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

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
                <Area type="monotone" dataKey="index" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} />
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
                <Line type="monotone" dataKey="trend" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Forecasting;
