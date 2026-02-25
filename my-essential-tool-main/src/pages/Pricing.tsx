import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Percent, Target } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const Pricing = () => {
  const { data: products } = useQuery({
    queryKey: ["products-pricing"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: pricingRecords } = useQuery({
    queryKey: ["pricing-records"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/pricing-records`);
      if (!res.ok) throw new Error("Failed to fetch pricing records");
      return res.json();
    },
  });

  const { data: pricingInsight } = useQuery({
    queryKey: ["pricing-insight"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/pricing/insight`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const pricingInsightIsMl = pricingInsight?.source === "ml_model";
  const pricingRecommendationMap = new Map(
    ((pricingInsight?.recommendations as any[]) || []).map((r) => [String(r.product_id), r])
  );

  const avgPrice = products?.length ? (products.reduce((s, p) => s + Number(p.current_price), 0) / products.length).toFixed(2) : "0.00";
  const avgMargin = products?.length ? (products.reduce((s, p) => s + Number(p.margin_pct || 0), 0) / products.length).toFixed(1) : "0.0";
  const totalRevenue = pricingRecords?.length ? pricingRecords.reduce((s, r) => s + Number(r.revenue || 0), 0) : 0;
  const totalNetProfit = pricingRecords?.length ? pricingRecords.reduce((s, r) => s + Number(r.net_profit || 0), 0) : 0;
  const totalLoss = pricingRecords?.length ? pricingRecords.reduce((s, r) => s + Number(r.loss_amount || r.total_loss || 0), 0) : 0;
  const avgPriceIndex = pricingRecords?.length ? (pricingRecords.reduce((s, r) => s + Number(r.price_index || 0), 0) / pricingRecords.length).toFixed(1) : "0.0";

  // Elasticity chart data
  const elasticityData = products?.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    elasticity: Math.abs(Number(p.price_elasticity || 0)),
    price: Number(p.current_price),
  })) || [];

  // Competitor comparison
  const competitorData = products?.filter((p) => p.competitor_price).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    ours: Number(p.current_price),
    competitor: Number(p.competitor_price),
  })) || [];

  const chartConfig = {
    elasticity: { label: "Elasticity", color: "hsl(var(--chart-1))" },
    ours: { label: "Our Price", color: "hsl(var(--chart-1))" },
    competitor: { label: "Competitor", color: "hsl(var(--chart-3))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pricing Dashboard</h1>
        <p className="text-muted-foreground">AI-driven pricing insight, elasticity, and competitive intelligence</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Avg Price" value={`$${avgPrice}`} change="+2.3% vs Q3" changeType="positive" icon={DollarSign} />
        <KPICard title="Avg Margin" value={`${avgMargin}%`} change="+1.1pp" changeType="positive" icon={Percent} />
        <KPICard title="Revenue" value={`$${(totalRevenue / 1000000).toFixed(1)}M`} change="+8.7% MoM" changeType="positive" icon={TrendingUp} />
        <KPICard title="Net Profit" value={`$${(totalNetProfit / 1000000).toFixed(1)}M`} change="After losses" changeType="positive" icon={DollarSign} />
        <KPICard title="Loss" value={`$${(totalLoss / 1000).toFixed(0)}K`} change="Returns/shrinkage" changeType="negative" icon={TrendingDown} />
        <KPICard title="Price Index" value={`${avgPriceIndex}`} change="vs competitors" changeType="neutral" icon={Target} />
      </div>

      {pricingInsight?.insight && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI insight</CardTitle>
            <CardDescription>
              {pricingInsightIsMl
                ? `ML pricing model (${pricingInsight?.model_type || "model"}) trained on ${pricingInsight?.training_samples ?? 0} records`
                : "Data-driven pricing view from our backend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{pricingInsight.insight}</p>
            {pricingInsightIsMl && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  Train MAE: {pricingInsight?.train_mae_units ?? "n/a"} | Train R2: {pricingInsight?.train_r2_units ?? "n/a"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Historical profit: ${Number(pricingInsight?.historical_total_profit || 0).toFixed(0)} | Historical loss: ${Number(pricingInsight?.historical_total_loss || 0).toFixed(0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Price Elasticity by Product</CardTitle>
            <CardDescription>How demand changes with price adjustments (|elasticity|)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={elasticityData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={60} />
                <YAxis className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="elasticity" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Competitor Price Comparison</CardTitle>
            <CardDescription>Our pricing vs competitor benchmarks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={competitorData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={60} />
                <YAxis className="text-xs" tickFormatter={(v) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="competitor" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Product Pricing Table</CardTitle>
          <CardDescription>Current, recommended, and competitor pricing with expected impact</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Recommended</TableHead>
                <TableHead className="text-right">Competitor</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Elasticity</TableHead>
                <TableHead className="text-right">Net Profit (Rec)</TableHead>
                <TableHead className="text-right">Loss (Rec)</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p: any) => {
                const rec = pricingRecommendationMap.get(String(p._id || p.id));
                const currentPrice = Number(p.current_price || 0);
                const recommendedPrice = Number(rec?.recommended_price ?? p.recommended_price ?? currentPrice);
                const diff = recommendedPrice - currentPrice;
                const action =
                  rec?.action || (diff > 0 ? "increase" : diff < 0 ? "decrease" : "hold");
                const predictedNetProfit = Number(rec?.predicted_net_profit_recommended ?? rec?.predicted_profit_recommended ?? 0);
                const predictedLoss = Number(rec?.predicted_loss_recommended ?? 0);
                return (
                  <TableRow key={p._id || p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell className="text-right font-mono">${currentPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${recommendedPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">${Number(p.competitor_price || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(p.margin_pct || 0).toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-mono">{Number(p.price_elasticity || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono">{rec ? `$${predictedNetProfit.toFixed(0)}` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-destructive">{rec ? `$${predictedLoss.toFixed(0)}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={action === "increase" ? "default" : action === "decrease" ? "secondary" : "outline"}>
                        {action === "increase" ? "Increase" : action === "decrease" ? "Decrease" : "Hold"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pricing;
