import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Cell,
  PieChart, Pie, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Package, TrendingUp, TrendingDown, BarChart3, DollarSign,
  RefreshCw, Search, Filter, ArrowUpDown, Download, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

const RECOMMENDATION_COLORS: Record<string, string> = {
  add: "default",
  keep: "secondary",
  delist: "destructive",
  review: "outline",
};

const RECOMMENDATION_BADGE_CLASSES: Record<string, string> = {
  add: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  keep: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  delist: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  review: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
};

type SortField = "productName" | "revenue" | "revenue_growth_pct" | "net_profit" | "market_share_pct" | "category_mix_pct";
type SortDir = "asc" | "desc";

const Assortment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: assortment, isLoading } = useQuery({
    queryKey: ["assortment"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/assortment`);
      if (!res.ok) throw new Error("Failed to fetch assortment data");
      return res.json();
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["assortment"] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: "Assortment data refreshed" });
  };

  // Aggregate KPIs
  const totalRevenue = assortment?.reduce((s, a) => s + Number(a.revenue), 0) || 0;
  const totalNetProfit = assortment?.reduce((s, a) => s + Number(a.net_profit || 0), 0) || 0;
  const totalLoss = assortment?.reduce((s, a) => s + Number(a.loss_amount || 0), 0) || 0;
  const avgGrowth = assortment?.length
    ? (assortment.reduce((s, a) => s + Number(a.revenue_growth_pct || 0), 0) / assortment.length).toFixed(1) : "0.0";
  const addCount = assortment?.filter((a) => a.recommendation === "add").length || 0;
  const delistCount = assortment?.filter((a) => a.recommendation === "delist").length || 0;
  const mlRecommendationCount = assortment?.filter((a) => a.recommendation_source === "ml_model").length || 0;
  const avgMlConfidence = assortment?.length
    ? (
      assortment
        .filter((a) => typeof a.recommendation_confidence === "number")
        .reduce((s, a) => s + Number(a.recommendation_confidence || 0), 0) /
      Math.max(1, assortment.filter((a) => typeof a.recommendation_confidence === "number").length)
    ).toFixed(2) : "0.00";

  // Channels for filter
  const channels = useMemo(() => {
    const chans = new Set<string>((assortment || []).map((a: any) => a.channel).filter(Boolean));
    return Array.from(chans).sort();
  }, [assortment]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  // Filtered & sorted assortment
  const filteredAssortment = useMemo(() => {
    if (!assortment) return [];
    let list = [...assortment];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((a: any) =>
        a.productName?.toLowerCase().includes(q) || a.channel?.toLowerCase().includes(q)
      );
    }
    if (recommendationFilter !== "all") {
      list = list.filter((a: any) => a.recommendation === recommendationFilter);
    }
    if (channelFilter !== "all") {
      list = list.filter((a: any) => a.channel === channelFilter);
    }

    list.sort((a: any, b: any) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      if (sortField === "productName") {
        return sortDir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return list;
  }, [assortment, search, recommendationFilter, channelFilter, sortField, sortDir]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Product", "Channel", "Revenue", "Net Profit", "Loss", "Growth%", "Market Share%", "Mix%", "Confidence", "Recommendation"];
    const rows = filteredAssortment.map((a: any) => [
      a.productName, a.channel,
      (Number(a.revenue) / 1000).toFixed(0) + "K",
      (Number(a.net_profit || 0) / 1000).toFixed(0) + "K",
      (Number(a.loss_amount || 0) / 1000).toFixed(0) + "K",
      Number(a.revenue_growth_pct || 0).toFixed(1),
      a.market_share_pct, a.category_mix_pct,
      typeof a.recommendation_confidence === "number"
        ? (Number(a.recommendation_confidence) * 100).toFixed(0) + "%" : "—",
      a.recommendation || ""
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "assortment_data.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${filteredAssortment.length} items exported.` });
  };

  // Chart data
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

  const SCATTER_COLORS: Record<string, string> = {
    add: "#10b981",
    keep: "#3b82f6",
    delist: "#ef4444",
    review: "#f59e0b",
  };

  const chartConfig = {
    x: { label: "Revenue ($K)", color: "hsl(var(--chart-1))" },
    y: { label: "Growth %", color: "hsl(var(--chart-2))" },
    value: { label: "Mix %", color: "hsl(var(--chart-1))" },
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`ml-1 h-3 w-3 inline ${sortField === field ? "text-primary" : "text-muted-foreground/40"}`}
    />
  );

  // Summary counts by recommendation
  const recCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (assortment || []).forEach((a: any) => {
      const r = a.recommendation || "unknown";
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [assortment]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assortment Analysis</h1>
          <p className="text-muted-foreground">AI-driven SKU performance and add/keep/delist recommendations</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            ML coverage: {mlRecommendationCount}/{assortment?.length || 0} rows · Avg confidence: {avgMlConfidence}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Recommendation summary badges */}
      {Object.keys(recCounts).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(recCounts).map(([rec, count]) => (
            <button
              key={rec}
              onClick={() => setRecommendationFilter(recommendationFilter === rec ? "all" : rec)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${recommendationFilter === rec
                  ? RECOMMENDATION_BADGE_CLASSES[rec] || "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                }`}
            >
              <span className="font-bold">{count}</span> {rec.charAt(0).toUpperCase() + rec.slice(1)}
            </button>
          ))}
          {recommendationFilter !== "all" && (
            <button
              onClick={() => setRecommendationFilter("all")}
              className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 px-3 py-1 text-xs text-muted-foreground hover:bg-muted/60"
            >
              ✕ Clear filter
            </button>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Total Revenue" value={`$${(totalRevenue / 1000000).toFixed(1)}M`} change="+14.2% YoY" changeType="positive" icon={Package} />
        <KPICard title="Net Profit" value={`$${(totalNetProfit / 1000).toFixed(0)}K`} change="After losses" changeType="positive" icon={DollarSign} />
        <KPICard title="Loss" value={`$${(totalLoss / 1000).toFixed(0)}K`} change="Operational losses" changeType="negative" icon={TrendingDown} />
        <KPICard title="Avg Growth" value={`${avgGrowth}%`} change="Revenue growth" changeType={Number(avgGrowth) >= 0 ? "positive" : "negative"} icon={TrendingUp} />
        <KPICard title="Add Recs" value={String(addCount)} change="SKUs to expand" changeType="positive" icon={BarChart3} badge={addCount > 0 ? "Action" : undefined} />
        <KPICard title="Delist Recs" value={String(delistCount)} change="SKUs to remove" changeType="negative" icon={TrendingDown} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">SKU Performance Matrix</CardTitle>
            <CardDescription>Revenue ($K) vs growth rate — color coded by recommendation</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="x" name="Revenue" unit="K" className="text-xs" />
                <YAxis dataKey="y" name="Growth" unit="%" className="text-xs" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Scatter data={scatterData} fill="hsl(var(--chart-1))">
                  {scatterData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={SCATTER_COLORS[entry.recommendation] || COLORS[i % COLORS.length]}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
            {/* Legend */}
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              {Object.entries(SCATTER_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </div>
              ))}
            </div>
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
                  label={({ name, value }) =>
                    value > 3 ? `${name.length > 8 ? name.slice(0, 8) + "…" : name}: ${value}%` : ""
                  }
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

      {/* SKU Table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">SKU Recommendations</CardTitle>
              <CardDescription>
                {filteredAssortment.length} of {assortment?.length || 0} SKUs · Click for details
              </CardDescription>
            </div>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={recommendationFilter} onValueChange={setRecommendationFilter}>
              <SelectTrigger className="w-[150px] h-9 text-sm">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="All Recs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recommendations</SelectItem>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="keep">Keep</SelectItem>
                <SelectItem value="delist">Delist</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead
                    className="cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("productName")}
                  >
                    Product <SortIcon field="productName" />
                  </TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("revenue")}
                  >
                    Revenue <SortIcon field="revenue" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("net_profit")}
                  >
                    Net Profit <SortIcon field="net_profit" />
                  </TableHead>
                  <TableHead className="text-right">Loss</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("revenue_growth_pct")}
                  >
                    Growth <SortIcon field="revenue_growth_pct" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("market_share_pct")}
                  >
                    Mkt Share <SortIcon field="market_share_pct" />
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-foreground"
                    onClick={() => handleSort("category_mix_pct")}
                  >
                    Mix% <SortIcon field="category_mix_pct" />
                  </TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                  <TableHead>Recommendation</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(11)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredAssortment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                      No SKUs match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssortment.map((a: any) => (
                    <TableRow
                      key={a._id || a.id}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setSelectedItem(a)}
                    >
                      <TableCell className="font-medium max-w-[140px] truncate">{a.productName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{a.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(Number(a.revenue) / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                        ${(Number(a.net_profit || 0) / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-500">
                        ${(Number(a.loss_amount || 0) / 1000).toFixed(0)}K
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono ${Number(a.revenue_growth_pct || 0) >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-500"
                          }`}
                      >
                        {Number(a.revenue_growth_pct || 0) > 0 ? "+" : ""}{a.revenue_growth_pct}%
                      </TableCell>
                      <TableCell className="text-right font-mono">{a.market_share_pct}%</TableCell>
                      <TableCell className="text-right font-mono">{a.category_mix_pct}%</TableCell>
                      <TableCell className="text-right font-mono">
                        {typeof a.recommendation_confidence === "number" ? (
                          <div className="flex items-center justify-end gap-1">
                            <div
                              className="h-1.5 rounded-full bg-primary/20"
                              style={{ width: "40px" }}
                            >
                              <div
                                className="h-1.5 rounded-full bg-primary"
                                style={{ width: `${Number(a.recommendation_confidence) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs">
                              {(Number(a.recommendation_confidence) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase ${RECOMMENDATION_BADGE_CLASSES[a.recommendation || "review"] || ""}`}
                        >
                          {a.recommendation || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Info className="h-4 w-4 text-muted-foreground/40" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* SKU Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedItem.productName}
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase ${RECOMMENDATION_BADGE_CLASSES[selectedItem.recommendation || "review"] || ""}`}
                  >
                    {selectedItem.recommendation || "review"}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedItem.channel} channel · Full performance breakdown
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  {
                    label: "Revenue", value: `$${(Number(selectedItem.revenue) / 1000).toFixed(1)}K`,
                    color: ""
                  },
                  {
                    label: "Net Profit", value: `$${(Number(selectedItem.net_profit || 0) / 1000).toFixed(1)}K`,
                    color: "text-emerald-600"
                  },
                  {
                    label: "Loss", value: `$${(Number(selectedItem.loss_amount || 0) / 1000).toFixed(1)}K`,
                    color: "text-red-500"
                  },
                  {
                    label: "Revenue Growth", value: `${Number(selectedItem.revenue_growth_pct || 0) > 0 ? "+" : ""}${selectedItem.revenue_growth_pct}%`,
                    color: Number(selectedItem.revenue_growth_pct || 0) >= 0 ? "text-emerald-600" : "text-red-500"
                  },
                  { label: "Market Share", value: `${selectedItem.market_share_pct}%`, color: "" },
                  { label: "Category Mix", value: `${selectedItem.category_mix_pct}%`, color: "" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
              {typeof selectedItem.recommendation_confidence === "number" && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    ML Recommendation Confidence •{" "}
                    {selectedItem.recommendation_source === "ml_model" ? "ML Model" : "Rule-based"}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Number(selectedItem.recommendation_confidence) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-primary">
                      {(Number(selectedItem.recommendation_confidence) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Assortment;
