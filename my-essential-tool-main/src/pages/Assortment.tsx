import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Cell, PieChart, Pie } from "recharts";
import { Package, TrendingUp, TrendingDown, BarChart3, DollarSign } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const RECOMMENDATION_COLORS: Record<string, string> = {
  add: "default",
  keep: "secondary",
  delist: "destructive",
  review: "outline",
};

const Assortment = () => {
  const { data: assortment } = useQuery({
    queryKey: ["assortment"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/assortment`);
      if (!res.ok) throw new Error("Failed to fetch assortment data");
      return res.json();
    },
  });

  const totalRevenue = assortment?.reduce((s, a) => s + Number(a.revenue), 0) || 0;
  const totalNetProfit = assortment?.reduce((s, a) => s + Number(a.net_profit || 0), 0) || 0;
  const totalLoss = assortment?.reduce((s, a) => s + Number(a.loss_amount || 0), 0) || 0;
  const avgGrowth = assortment?.length ? (assortment.reduce((s, a) => s + Number(a.revenue_growth_pct || 0), 0) / assortment.length).toFixed(1) : "0.0";
  const addCount = assortment?.filter((a) => a.recommendation === "add").length || 0;
  const delistCount = assortment?.filter((a) => a.recommendation === "delist").length || 0;
  const mlRecommendationCount = assortment?.filter((a) => a.recommendation_source === "ml_model").length || 0;
  const avgMlConfidence = assortment?.length
    ? (
        assortment
          .filter((a) => typeof a.recommendation_confidence === "number")
          .reduce((s, a) => s + Number(a.recommendation_confidence || 0), 0) /
        Math.max(1, assortment.filter((a) => typeof a.recommendation_confidence === "number").length)
      )
        .toFixed(2)
    : "0.00";

  const scatterData = assortment?.map((a) => ({
    x: Number(a.revenue) / 1000,
    y: Number(a.revenue_growth_pct || 0),
    name: (a as any).productName || "Unknown",
    recommendation: a.recommendation,
  })) || [];

  const pieData = assortment?.map((a) => ({
    name: (a as any).productName || "Unknown",
    value: Number(a.category_mix_pct || 0),
  })) || [];

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(210, 70%, 60%)",
    "hsl(174, 50%, 50%)",
    "hsl(38, 80%, 60%)",
    "hsl(280, 50%, 60%)",
    "hsl(0, 60%, 60%)",
  ];

  const chartConfig = {
    x: { label: "Revenue ($K)", color: "hsl(var(--chart-1))" },
    y: { label: "Growth %", color: "hsl(var(--chart-2))" },
    value: { label: "Mix %", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assortment Analysis</h1>
        <p className="text-muted-foreground">AI-driven SKU performance and add/keep/delist recommendations</p>
        <p className="text-xs text-muted-foreground">
          ML recommendation coverage: {mlRecommendationCount}/{assortment?.length || 0} rows | Avg confidence: {avgMlConfidence}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Revenue" value={`$${(totalRevenue / 1000000).toFixed(1)}M`} change="+14.2% YoY" changeType="positive" icon={Package} />
        <KPICard title="Net Profit" value={`$${(totalNetProfit / 1000).toFixed(0)}K`} change="After losses" changeType="positive" icon={DollarSign} />
        <KPICard title="Loss" value={`$${(totalLoss / 1000).toFixed(0)}K`} change="Operational losses" changeType="negative" icon={TrendingDown} />
        <KPICard title="Avg Growth" value={`${avgGrowth}%`} change="Revenue growth" changeType="positive" icon={TrendingUp} />
        <KPICard title="Add Recs" value={String(addCount)} change="SKUs to expand" changeType="positive" icon={BarChart3} />
        <KPICard title="Delist Recs" value={String(delistCount)} change="SKUs to remove" changeType="negative" icon={TrendingDown} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">SKU Performance Matrix</CardTitle>
            <CardDescription>Revenue ($K) vs growth rate — identify stars and laggards</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="x" name="Revenue" unit="K" className="text-xs" />
                <YAxis dataKey="y" name="Growth" unit="%" className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter data={scatterData} fill="hsl(var(--chart-1))">
                  {scatterData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Category Mix</CardTitle>
            <CardDescription>Share of assortment by product</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">SKU Recommendations</CardTitle>
          <CardDescription>Performance metrics and AI-driven assortment recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Loss</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                  <TableHead className="text-right">Market Share</TableHead>
                  <TableHead className="text-right">Mix %</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Recommendation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assortment?.map((a: any) => (
                <TableRow key={a._id || a.id}>
                  <TableCell className="font-medium">{a.productName}</TableCell>
                  <TableCell>{a.channel}</TableCell>
                  <TableCell className="text-right font-mono">${(Number(a.revenue) / 1000).toFixed(0)}K</TableCell>
                  <TableCell className="text-right font-mono text-[hsl(var(--success))]">${(Number(a.net_profit || 0) / 1000).toFixed(0)}K</TableCell>
                  <TableCell className="text-right font-mono text-destructive">${(Number(a.loss_amount || 0) / 1000).toFixed(0)}K</TableCell>
                  <TableCell className={`text-right font-mono ${Number(a.revenue_growth_pct || 0) >= 0 ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                    {Number(a.revenue_growth_pct || 0) > 0 ? "+" : ""}{a.revenue_growth_pct}%
                  </TableCell>
                  <TableCell className="text-right font-mono">{a.market_share_pct}%</TableCell>
                  <TableCell className="text-right font-mono">{a.category_mix_pct}%</TableCell>
                  <TableCell className="text-right font-mono">
                    {typeof a.recommendation_confidence === "number"
                      ? `${(Number(a.recommendation_confidence) * 100).toFixed(0)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={RECOMMENDATION_COLORS[a.recommendation || "review"] as any}>
                      {a.recommendation?.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Assortment;
