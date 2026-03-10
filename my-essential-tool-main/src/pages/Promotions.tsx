import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, DollarSign, Target, Percent, RefreshCw, Trash2,
  Download, CalendarDays, CheckCircle2, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

interface Scenario {
  id: number;
  discount: number;
  duration: number;
  channel: string;
  productCategory: string;
  region: string;
  promoType: string;
  budget: number;
  revenueLift: number;
  roi: number;
  cannibalization: number;
  incrementalProfit: number;
  incrementalLoss: number;
}

interface ProductInputOption {
  category?: string;
  region?: string;
}

interface UpcomingPromo {
  event_name: string;
  event_date: string;
  event_time: string;
  display_name: string;
  reference_name?: string;
  reference_roi?: number;
  reference_revenue_lift_pct?: number;
  reference_discount_pct?: number;
  reference_duration_days?: number;
  reference_channel?: string;
}

const ALL_CATEGORIES = "ALL_CATEGORIES";
const ALL_REGIONS = "ALL_REGIONS";

const PROMO_TYPES = [
  { value: "percent_off", label: "% Off" },
  { value: "bogo", label: "BOGO" },
  { value: "bundle", label: "Bundle" },
];

const promoTypeLabel = (value: string) => {
  const found = PROMO_TYPES.find((option) => option.value === value);
  return found?.label || value;
};

const holidayDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const formatHolidayDate = (eventDate: string) => {
  const parsed = new Date(`${eventDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return eventDate;
  return holidayDateFormatter.format(parsed);
};

// Get a color for badge based on ROI
function getRoiBadgeColor(roi: number) {
  if (roi >= 3) return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (roi >= 1.5) return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
}

const Promotions = () => {
  const { toast } = useToast();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [discount, setDiscount] = useState([15]);
  const [duration, setDuration] = useState("7");
  const [channel, setChannel] = useState("Retail");
  const [productCategory, setProductCategory] = useState(ALL_CATEGORIES);
  const [region, setRegion] = useState(ALL_REGIONS);
  const [promoType, setPromoType] = useState("percent_off");
  const [budget, setBudget] = useState("10000");
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  const [calendarSyncMessage, setCalendarSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: promotions } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/promotions`);
      if (!res.ok) throw new Error("Failed to fetch promotions");
      return res.json();
    },
  });

  const { data: upcomingPromotions } = useQuery({
    queryKey: ["promotions", "upcoming"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/promotions/upcoming`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to fetch upcoming promotions");
      return data;
    },
  });

  const { data: promotionRecommendation } = useQuery({
    queryKey: ["promotions", "recommendation"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/promotions/recommendation`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", "simulator-inputs"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const categoryOptions = Array.from(
    new Set(
      ((products || []) as ProductInputOption[])
        .map((product) => String(product?.category || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const regionOptions = Array.from(
    new Set(
      ((products || []) as ProductInputOption[])
        .map((product) => String(product?.region || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  const avgROI = promotions?.length
    ? (promotions.reduce((s, p) => s + Number(p.roi || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const avgLift = promotions?.length
    ? (promotions.reduce((s, p) => s + Number(p.revenue_lift_pct || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const totalPromoProfit = promotions?.length
    ? promotions.reduce((s, p) => s + Number(p.incremental_profit || p.net_profit || 0), 0) : 0;
  const totalPromoLoss = promotions?.length
    ? promotions.reduce((s, p) => s + Number(p.incremental_loss || p.loss_amount || 0), 0) : 0;
  const bestPromo = promotions?.reduce(
    (best, p) => (Number(p.roi || 0) > Number(best?.roi || 0) ? p : best),
    promotions[0]
  );
  const promotionRecommendationIsMl = promotionRecommendation?.source === "ml_model";
  const activePromos = promotions?.filter((p: any) => p.status === "active").length || 0;

  // Dynamic lift change: compare first-half vs second-half promos chronologically
  const liftChangeLabel = useMemo(() => {
    if (!promotions || promotions.length < 4) return "vs prior period";
    const sorted = [...promotions].sort((a, b) =>
      String(a.start_date || "").localeCompare(String(b.start_date || ""))
    );
    const mid = Math.floor(sorted.length / 2);
    const h1Lift = sorted.slice(0, mid).reduce((s, p) => s + Number(p.revenue_lift_pct || 0), 0) / mid;
    const h2Lift = sorted.slice(mid).reduce((s, p) => s + Number(p.revenue_lift_pct || 0), 0) / (sorted.length - mid);
    const diff = (h2Lift - h1Lift).toFixed(1);
    return `${Number(diff) >= 0 ? "+" : ""}${diff}pp H1→H2`;
  }, [promotions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["promotions"] });
    setTimeout(() => setIsRefreshing(false), 600);
    toast({ title: "Promotions data refreshed" });
  };

  const simulate = async () => {
    const d = discount[0];
    const dur = parseInt(duration, 10);
    const budgetValue = Number(budget);
    if (!Number.isFinite(dur) || dur <= 0) {
      setSimulationError("Duration must be a positive number.");
      return;
    }
    if (!Number.isFinite(budgetValue) || budgetValue <= 0) {
      setSimulationError("Budget must be a positive number.");
      return;
    }

    setSimulationError(null);
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/promotions/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountPct: d,
          durationDays: dur,
          channel,
          productCategory: productCategory === ALL_CATEGORIES ? null : productCategory,
          region: region === ALL_REGIONS ? null : region,
          promoType,
          budget: budgetValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.detail || "Failed to simulate promotion");
      }

      const newScenario: Scenario = {
        id: Date.now(),
        discount: d,
        duration: dur,
        channel,
        productCategory: String(data?.product_category || (productCategory === ALL_CATEGORIES ? "All Categories" : productCategory)),
        region: String(data?.region || (region === ALL_REGIONS ? "All Regions" : region)),
        promoType: promoTypeLabel(String(data?.promo_type || promoType)),
        budget: Number(data?.budget ?? budgetValue),
        revenueLift: Number(data?.predicted_revenue_lift_pct || 0),
        roi: Number(data?.predicted_roi || 0),
        cannibalization: Number(data?.predicted_cannibalization_pct || 0),
        incrementalProfit: Number(data?.predicted_incremental_profit || 0),
        incrementalLoss: Number(data?.predicted_incremental_loss || 0),
      };
      setScenarios((prev) => [...prev, newScenario]);
      toast({
        title: "Simulation complete",
        description: `ROI: ${newScenario.roi.toFixed(1)}x | Revenue lift: +${newScenario.revenueLift.toFixed(1)}%`,
      });
    } catch (err: any) {
      setSimulationError(err?.message || "Failed to simulate promotion.");
    } finally {
      setIsSimulating(false);
    }
  };

  const deleteScenario = (id: number) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const clearScenarios = () => {
    setScenarios([]);
    toast({ title: "All scenarios cleared" });
  };

  const exportScenarios = () => {
    if (!scenarios.length) return;
    const headers = ["Discount%", "Duration(d)", "Channel", "Category", "Region", "Type", "Budget", "Rev Lift%", "ROI", "Cannib%", "Profit", "Loss"];
    const rows = scenarios.map(s => [
      s.discount, s.duration, s.channel, s.productCategory, s.region, s.promoType,
      s.budget.toFixed(0), s.revenueLift.toFixed(1), s.roi.toFixed(2),
      s.cannibalization.toFixed(1), s.incrementalProfit.toFixed(0), s.incrementalLoss.toFixed(0)
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "scenarios.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Scenarios exported", description: `${scenarios.length} scenarios saved.` });
  };

  // Best scenario highlight
  const bestScenario = useMemo(
    () => scenarios.length > 0 ? scenarios.reduce((best, s) => s.roi > best.roi ? s : best) : null,
    [scenarios]
  );

  const syncGoogleCalendarEvents = async () => {
    if (isSyncingCalendar) return;
    setIsSyncingCalendar(true);
    setCalendarSyncError(null);
    setCalendarSyncMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/promotions/sync-google-calendar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || "Failed to sync Google Calendar events.");
      const syncedCount = Number(data?.events_upserted || 0);
      const syncedAtRaw = typeof data?.synced_at === "string" ? data.synced_at : null;
      if (syncedAtRaw) setLastSyncedAt(syncedAtRaw);
      setCalendarSyncMessage(`Sync completed. ${syncedCount} event(s) refreshed.`);
      await queryClient.invalidateQueries({ queryKey: ["promotions", "upcoming"] });
    } catch (err: any) {
      setCalendarSyncError(err?.message || "Failed to sync Google Calendar events.");
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const promoChartData = promotions?.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    roi: Number(p.roi || 0),
    lift: Number(p.revenue_lift_pct || 0),
  })) || [];

  const chartConfig = {
    roi: { label: "ROI", color: "hsl(var(--chart-1))" },
    lift: { label: "Revenue Lift %", color: "hsl(var(--chart-2))" },
  };

  const upcomingHolidayList = ((upcomingPromotions || []) as UpcomingPromo[]).slice(0, 6);
  const nearestHoliday = upcomingHolidayList[0];
  const holidaySuggestion = nearestHoliday
    ? `Increase discount before ${nearestHoliday.display_name} by 5-10%.`
    : "Increase discount before holiday by 5-10%.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotion Simulator</h1>
          <p className="text-muted-foreground">AI recommendation, scenario simulator, and upcoming event promotions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICard title="Avg ROI" value={`${avgROI}x`} change="Across all promos" changeType="neutral" icon={Target} />
        <KPICard title="Avg Rev Lift" value={`${avgLift}%`} change={liftChangeLabel} changeType={liftChangeLabel.startsWith("+") ? "positive" : "negative"} icon={TrendingUp} />
        <KPICard title="Promo Profit" value={`$${(totalPromoProfit / 1000).toFixed(0)}K`} change="Incremental" changeType="positive" icon={DollarSign} />
        <KPICard title="Promo Loss" value={`$${(totalPromoLoss / 1000).toFixed(0)}K`} change="Cannibalization/costs" changeType="negative" icon={Percent} />
        <KPICard
          title="Best Promo"
          value={bestPromo?.name?.length > 12 ? bestPromo.name.slice(0, 12) + "…" : (bestPromo?.name || "—")}
          change={`ROI: ${bestPromo?.roi || 0}x`}
          changeType="positive"
          icon={DollarSign}
        />
        <KPICard
          title="Active Promos"
          value={String(activePromos)}
          change={`${promotions?.length || 0} total`}
          changeType="neutral"
          icon={Percent}
          badge={activePromos > 0 ? "Live" : undefined}
        />
      </div>

      {/* AI Recommendation */}
      {promotionRecommendation?.insight && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Recommendation</CardTitle>
              <Badge variant="secondary" className="text-[10px]">
                {promotionRecommendationIsMl ? "ML Model" : "Data-Driven"}
              </Badge>
            </div>
            <CardDescription>
              {promotionRecommendationIsMl
                ? `ML recommendation (${promotionRecommendation?.model_type || "model"}) trained on ${promotionRecommendation?.training_samples ?? 0} records`
                : "Data-driven suggestion from our backend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{promotionRecommendation.insight}</p>
            {promotionRecommendationIsMl && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>ROI MAE: {promotionRecommendation?.roi_train_mae ?? "n/a"}</span>
                <span>|</span>
                <span>Lift MAE: {promotionRecommendation?.lift_train_mae ?? "n/a"}</span>
                <span>|</span>
                <span>Predicted profit: ${Number(promotionRecommendation?.predicted_incremental_profit || 0).toFixed(0)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Simulator + Comparison */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Scenario Builder</CardTitle>
            <CardDescription>Configure and simulate promotion scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Discount</Label>
                <span className="text-sm font-bold text-primary">{discount[0]}%</span>
              </div>
              <Slider value={discount} onValueChange={setDiscount} min={5} max={50} step={5} className="mt-1" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5%</span><span>50%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (days)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} min={1} max={60} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Foodservice">Foodservice</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Product category</Label>
              <Select value={productCategory} onValueChange={setProductCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_REGIONS}>All Regions</SelectItem>
                  {regionOptions.map((regionOption) => (
                    <SelectItem key={regionOption} value={regionOption}>{regionOption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Promo type</Label>
              <Select value={promoType} onValueChange={setPromoType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROMO_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget ($)</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} min={1} step={100} />
            </div>
            <Button onClick={simulate} className="w-full" disabled={isSimulating}>
              {isSimulating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Simulating…</>
              ) : (
                "▶ Run Simulation"
              )}
            </Button>
            {simulationError && (
              <p className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {simulationError}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Scenario Comparison</CardTitle>
                <CardDescription>
                  {scenarios.length ? `${scenarios.length} scenario${scenarios.length > 1 ? "s" : ""} simulated` : "Run simulations to compare"}
                </CardDescription>
              </div>
              {scenarios.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportScenarios} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearScenarios} className="gap-1.5 text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Clear All
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scenarios.length > 0 ? (
              <div className="space-y-3">
                {/* Best scenario highlight */}
                {bestScenario && scenarios.length > 1 && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Best ROI: <strong>{bestScenario.discount}% off, {bestScenario.duration}d {bestScenario.channel}</strong> → {bestScenario.roi.toFixed(1)}x ROI
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Discount</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Channel</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Rev Lift</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarios.map((s) => {
                        const isBest = bestScenario?.id === s.id && scenarios.length > 1;
                        return (
                          <TableRow key={s.id} className={isBest ? "bg-emerald-500/5" : ""}>
                            <TableCell className="font-mono font-medium">
                              {s.discount}%
                              {isBest && <span className="ml-1 text-[10px] text-emerald-600">★ Best</span>}
                            </TableCell>
                            <TableCell>{s.duration}d</TableCell>
                            <TableCell>{s.channel}</TableCell>
                            <TableCell className="max-w-[100px] truncate">{s.productCategory}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">
                              +{s.revenueLift.toFixed(1)}%
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={`text-xs font-mono ${getRoiBadgeColor(s.roi)}`}>
                                {s.roi.toFixed(1)}x
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600">
                              ${s.incrementalProfit.toFixed(0)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteScenario(s.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingUp className="h-8 w-8 opacity-20" />
                <p className="text-sm">Configure a scenario and click "Run Simulation"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Holidays */}
      <Card className="glass-card border-secondary/20 bg-[hsl(var(--secondary))]/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-secondary-foreground/70" />
            <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {upcomingHolidayList.length} events
            </Badge>
          </div>
          <CardDescription>From connected calendar events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingHolidayList.length ? (
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingHolidayList.map((holiday, index) => (
                <div
                  key={`${holiday.event_name}-${holiday.event_date}-${index}`}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm"
                >
                  <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0" />
                  <span className="font-medium truncate">{holiday.display_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {formatHolidayDate(holiday.event_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming holidays yet. Run calendar sync to load events.</p>
          )}
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            💡 Suggestion: {holidaySuggestion}
          </p>
        </CardContent>
      </Card>

      {/* Upcoming promotions table */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Upcoming promotions</CardTitle>
              <CardDescription>Based on past festival/event promotion performance</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" onClick={syncGoogleCalendarEvents} disabled={isSyncingCalendar} className="gap-1.5">
                {isSyncingCalendar ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…</>
                ) : (
                  "Sync Now"
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
              </p>
            </div>
          </div>
          {calendarSyncMessage && (
            <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> {calendarSyncMessage}
            </p>
          )}
          {calendarSyncError && <p className="text-xs text-destructive">{calendarSyncError}</p>}
        </CardHeader>
        <CardContent>
          {upcomingPromotions?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Reference (past)</TableHead>
                  <TableHead className="text-right">ROI</TableHead>
                  <TableHead className="text-right">Lift %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPromotions.map((u: UpcomingPromo, i: number) => (
                  <TableRow key={`${u.event_name}-${u.event_date}-${i}`}>
                    <TableCell className="font-medium">{u.display_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">{u.event_date}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.event_time}</TableCell>
                    <TableCell className="text-muted-foreground">{u.reference_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {u.reference_roi != null ? (
                        <Badge variant="outline" className={`text-xs ${getRoiBadgeColor(u.reference_roi)}`}>
                          {u.reference_roi}x
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {u.reference_revenue_lift_pct != null ? `+${u.reference_revenue_lift_pct}%` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">
              No upcoming events. Sync Google Calendar or add event_calendar rows with matching past promotion event_name.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historical chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Historical Promotion Performance</CardTitle>
          <CardDescription>ROI and revenue lift across past promotions</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart data={promoChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" className="text-xs" angle={-20} textAnchor="end" height={60} />
              <YAxis className="text-xs" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="roi" fill="hsl(var(--chart-1))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="lift" fill="hsl(var(--chart-2))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Promotions;
