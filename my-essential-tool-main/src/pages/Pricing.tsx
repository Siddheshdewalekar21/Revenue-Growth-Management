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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Target, RefreshCw,
  Search, Filter, Download, ArrowUpDown, Info, CheckCircle2,
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

type SortField = "name" | "current_price" | "margin_pct" | "price_elasticity" | "competitor_price";
type SortDir = "asc" | "desc";

const Pricing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: products, isLoading: productsLoading } = useQuery({
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["products-pricing"] });
    await queryClient.invalidateQueries({ queryKey: ["pricing-records"] });
    await queryClient.invalidateQueries({ queryKey: ["pricing-insight"] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: "Pricing data refreshed" });
  };

  const pricingInsightIsMl = pricingInsight?.source === "ml_model";
  const pricingRecommendationMap = new Map(
    ((pricingInsight?.recommendations as any[]) || []).map((r) => [String(r.product_id), r])
  );

  // KPI calculations
  const avgPrice = products?.length
    ? (products.reduce((s, p) => s + Number(p.current_price), 0) / products.length).toFixed(2) : "0.00";
  const avgMargin = products?.length
    ? (products.reduce((s, p) => s + Number(p.margin_pct || 0), 0) / products.length).toFixed(1) : "0.0";
  const totalRevenue = pricingRecords?.length
    ? pricingRecords.reduce((s, r) => s + Number(r.revenue || 0), 0) : 0;
  const totalNetProfit = pricingRecords?.length
    ? pricingRecords.reduce((s, r) => s + Number(r.net_profit || 0), 0) : 0;
  const totalLoss = pricingRecords?.length
    ? pricingRecords.reduce((s, r) => s + Number(r.loss_amount || r.total_loss || 0), 0) : 0;
  const avgPriceIndex = pricingRecords?.length
    ? (pricingRecords.reduce((s, r) => s + Number(r.price_index || 0), 0) / pricingRecords.length).toFixed(1) : "0.0";

  // ── Dynamic change labels derived from real pricingRecords ────────────────
  const pricingChangeLabels = useMemo(() => {
    if (!pricingRecords || pricingRecords.length < 2) {
      return { revMoM: "vs prior period", priceChg: "vs prior period", marginChg: "vs prior period" };
    }
    // Sort by effective_date and split into two halves
    const sorted = [...pricingRecords].sort((a, b) =>
      String(a.effective_date || "").localeCompare(String(b.effective_date || ""))
    );
    const mid = Math.floor(sorted.length / 2);
    const h1 = sorted.slice(0, mid);
    const h2 = sorted.slice(mid);

    // Revenue MoM (H1 vs H2)
    const h1Rev = h1.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const h2Rev = h2.reduce((s, r) => s + Number(r.revenue || 0), 0);
    const revMoMPct = h1Rev > 0 ? ((h2Rev - h1Rev) / h1Rev * 100).toFixed(1) : null;
    const revMoM = revMoMPct !== null
      ? `${Number(revMoMPct) >= 0 ? "+" : ""}${revMoMPct}% H1→H2`
      : "vs prior period";

    // Avg price change (H1 vs H2 using pricing records price field)
    const h1AvgP = h1.length ? h1.reduce((s, r) => s + Number(r.price || 0), 0) / h1.length : 0;
    const h2AvgP = h2.length ? h2.reduce((s, r) => s + Number(r.price || 0), 0) / h2.length : 0;
    const priceChgPct = h1AvgP > 0 ? ((h2AvgP - h1AvgP) / h1AvgP * 100).toFixed(1) : null;
    const priceChg = priceChgPct !== null
      ? `${Number(priceChgPct) >= 0 ? "+" : ""}${priceChgPct}% H1→H2`
      : "vs prior period";

    // Avg margin change (H1 vs H2 using margin_pct field)
    const h1Margin = h1.length ? h1.reduce((s, r) => s + Number(r.margin_pct || 0), 0) / h1.length : 0;
    const h2Margin = h2.length ? h2.reduce((s, r) => s + Number(r.margin_pct || 0), 0) / h2.length : 0;
    const marginDiff = (h2Margin - h1Margin).toFixed(1);
    const marginChg = `${Number(marginDiff) >= 0 ? "+" : ""}${marginDiff}pp H1→H2`;

    return { revMoM, priceChg, marginChg };
  }, [pricingRecords]);

  // Categories for filter
  const categories = useMemo(() => {
    const cats = new Set<string>((products || []).map((p: any) => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let list = [...products];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p: any) =>
        p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "all") {
      list = list.filter((p: any) => p.category === categoryFilter);
    }
    if (actionFilter !== "all") {
      list = list.filter((p: any) => {
        const rec = pricingRecommendationMap.get(String(p._id || p.id));
        const currentPrice = Number(p.current_price || 0);
        const recommendedPrice = Number(rec?.recommended_price ?? p.recommended_price ?? currentPrice);
        const diff = recommendedPrice - currentPrice;
        const action = rec?.action || (diff > 0 ? "increase" : diff < 0 ? "decrease" : "hold");
        return action === actionFilter;
      });
    }

    list.sort((a: any, b: any) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (sortField === "name") {
        va = String(va); vb = String(vb);
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return list;
  }, [products, search, categoryFilter, actionFilter, sortField, sortDir, pricingRecommendationMap]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Product", "Category", "Current Price", "Recommended", "Competitor", "Margin%", "Elasticity", "Action"];
    const rows = filteredProducts.map((p: any) => {
      const rec = pricingRecommendationMap.get(String(p._id || p.id));
      const currentPrice = Number(p.current_price || 0);
      const recommendedPrice = Number(rec?.recommended_price ?? p.recommended_price ?? currentPrice);
      const diff = recommendedPrice - currentPrice;
      const action = rec?.action || (diff > 0 ? "increase" : diff < 0 ? "decrease" : "hold");
      return [p.name, p.category, currentPrice.toFixed(2), recommendedPrice.toFixed(2),
      Number(p.competitor_price || 0).toFixed(2), Number(p.margin_pct || 0).toFixed(1),
      Number(p.price_elasticity || 0).toFixed(2), action];
    });
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pricing_data.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: `${filteredProducts.length} products exported.` });
  };

  // Chart data
  const elasticityData = products?.map((p) => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
    elasticity: Math.abs(Number(p.price_elasticity || 0)),
    price: Number(p.current_price),
  })) || [];

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

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown
      className={`ml-1 h-3 w-3 inline transition-colors ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`}
    />
  );

  // Product detail modal content
  const getProductAction = (p: any) => {
    const rec = pricingRecommendationMap.get(String(p._id || p.id));
    const currentPrice = Number(p.current_price || 0);
    const recommendedPrice = Number(rec?.recommended_price ?? p.recommended_price ?? currentPrice);
    const diff = recommendedPrice - currentPrice;
    return { rec, currentPrice, recommendedPrice, diff, action: rec?.action || (diff > 0 ? "increase" : diff < 0 ? "decrease" : "hold") };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pricing Dashboard</h1>
          <p className="text-muted-foreground">AI-driven pricing insight, elasticity, and competitive intelligence</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Avg Price" value={`$${avgPrice}`} change={pricingChangeLabels.priceChg} changeType={pricingChangeLabels.priceChg.startsWith("+") ? "positive" : "negative"} icon={DollarSign} />
        <KPICard title="Avg Margin" value={`${avgMargin}%`} change={pricingChangeLabels.marginChg} changeType={pricingChangeLabels.marginChg.startsWith("+") ? "positive" : "negative"} icon={Percent} />
        <KPICard title="Revenue" value={`$${(totalRevenue / 1000000).toFixed(1)}M`} change={pricingChangeLabels.revMoM} changeType={pricingChangeLabels.revMoM.startsWith("+") ? "positive" : "negative"} icon={TrendingUp} />
        <KPICard title="Net Profit" value={`$${(totalNetProfit / 1000000).toFixed(1)}M`} change="After losses" changeType="positive" icon={DollarSign} />
        <KPICard title="Loss" value={`$${(totalLoss / 1000).toFixed(0)}K`} change="Returns/shrinkage" changeType="negative" icon={TrendingDown} />
        <KPICard title="Price Index" value={`${avgPriceIndex}`} change="vs competitors" changeType="neutral" icon={Target} />
      </div>

      {/* AI Insight */}
      {pricingInsight?.insight && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Pricing Insight</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {pricingInsightIsMl ? "ML Model" : "Data-Driven"}
              </Badge>
            </div>
            <CardDescription>
              {pricingInsightIsMl
                ? `ML pricing model (${pricingInsight?.model_type || "model"}) trained on ${pricingInsight?.training_samples ?? 0} records`
                : "Data-driven pricing view from our backend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{pricingInsight.insight}</p>
            {pricingInsightIsMl && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Train MAE: {pricingInsight?.train_mae_units ?? "n/a"}</span>
                <span>|</span>
                <span>Train R²: {pricingInsight?.train_r2_units ?? "n/a"}</span>
                <span>|</span>
                <span>Historical profit: ${Number(pricingInsight?.historical_total_profit || 0).toFixed(0)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Charts */}
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
                <Bar dataKey="elasticity" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
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
                <Bar dataKey="ours" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="competitor" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Product Pricing Table with Filters */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Product Pricing Table</CardTitle>
              <CardDescription>
                {filteredProducts.length} of {products?.length || 0} products • Click a row for details
              </CardDescription>
            </div>
          </div>
          {/* Filter bar */}
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
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
                <SelectItem value="hold">Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort("name")}>
                    Product <SortIcon field="name" />
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("current_price")}>
                    Current <SortIcon field="current_price" />
                  </TableHead>
                  <TableHead className="text-right">Recommended</TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("competitor_price")}>
                    Competitor <SortIcon field="competitor_price" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("margin_pct")}>
                    Margin <SortIcon field="margin_pct" />
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort("price_elasticity")}>
                    Elasticity <SortIcon field="price_elasticity" />
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(9)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No products match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((p: any) => {
                    const { rec, currentPrice, recommendedPrice, diff, action } = getProductAction(p);
                    const priceGap = currentPrice > 0 ? ((recommendedPrice - currentPrice) / currentPrice * 100).toFixed(1) : "0";
                    return (
                      <TableRow
                        key={p._id || p.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setSelectedProduct(p)}
                      >
                        <TableCell className="font-medium max-w-[160px] truncate">{p.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">${currentPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">
                          <span className={diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : ""}>
                            ${recommendedPrice.toFixed(2)}
                          </span>
                          {diff !== 0 && (
                            <span className={`ml-1 text-[10px] ${diff > 0 ? "text-emerald-500" : "text-red-500"}`}>
                              ({diff > 0 ? "+" : ""}{priceGap}%)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">${Number(p.competitor_price || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{Number(p.margin_pct || 0).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-mono">{Number(p.price_elasticity || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={action === "increase" ? "default" : action === "decrease" ? "secondary" : "outline"}
                            className={
                              action === "increase"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                : action === "decrease"
                                  ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
                                  : ""
                            }
                          >
                            {action === "increase" ? "↑ Increase" : action === "decrease" ? "↓ Decrease" : "— Hold"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Info className="h-4 w-4 text-muted-foreground/50" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Product Detail Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          {selectedProduct && (() => {
            const { rec, currentPrice, recommendedPrice, diff, action } = getProductAction(selectedProduct);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedProduct.name}</DialogTitle>
                  <DialogDescription>
                    {selectedProduct.category} • Full pricing analysis
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  {[
                    { label: "Current Price", value: `$${currentPrice.toFixed(2)}`, color: "" },
                    {
                      label: "Recommended Price", value: `$${recommendedPrice.toFixed(2)}`,
                      color: diff > 0 ? "text-emerald-600" : diff < 0 ? "text-red-600" : ""
                    },
                    { label: "Competitor Price", value: `$${Number(selectedProduct.competitor_price || 0).toFixed(2)}`, color: "" },
                    { label: "Margin", value: `${Number(selectedProduct.margin_pct || 0).toFixed(1)}%`, color: "" },
                    { label: "Price Elasticity", value: Number(selectedProduct.price_elasticity || 0).toFixed(2), color: "" },
                    {
                      label: "Price Action", value: action.charAt(0).toUpperCase() + action.slice(1),
                      color: action === "increase" ? "text-emerald-600" : action === "decrease" ? "text-red-600" : ""
                    },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {rec?.predicted_net_profit_recommended != null && (
                  <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground mb-1">ML Predicted Impact (at recommended price)</p>
                    <div className="flex justify-between text-sm">
                      <span>Net Profit: <strong className="text-emerald-600">${Number(rec.predicted_net_profit_recommended).toFixed(0)}</strong></span>
                      <span>Loss: <strong className="text-red-500">${Number(rec.predicted_loss_recommended || 0).toFixed(0)}</strong></span>
                    </div>
                  </div>
                )}
                {diff !== 0 && (
                  <p className="text-sm text-muted-foreground">
                    Price change of <strong className={diff > 0 ? "text-emerald-600" : "text-red-600"}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(2)} ({diff > 0 ? "+" : ""}{((diff / currentPrice) * 100).toFixed(1)}%)
                    </strong> recommended to optimize revenue.
                  </p>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;
