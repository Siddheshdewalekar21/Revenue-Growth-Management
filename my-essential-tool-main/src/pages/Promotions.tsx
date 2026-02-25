import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, Target, Percent } from "lucide-react";

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

const Promotions = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [discount, setDiscount] = useState([15]);
  const [duration, setDuration] = useState("7");
  const [channel, setChannel] = useState("Retail");
  const [productCategory, setProductCategory] = useState(ALL_CATEGORIES);
  const [region, setRegion] = useState(ALL_REGIONS);
  const [promoType, setPromoType] = useState("percent_off");
  const [budget, setBudget] = useState("10000");
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncError, setCalendarSyncError] = useState<string | null>(null);
  const [calendarSyncMessage, setCalendarSyncMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
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

  const avgROI = promotions?.length ? (promotions.reduce((s, p) => s + Number(p.roi || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const avgLift = promotions?.length ? (promotions.reduce((s, p) => s + Number(p.revenue_lift_pct || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const totalPromoProfit = promotions?.length ? promotions.reduce((s, p) => s + Number(p.incremental_profit || p.net_profit || 0), 0) : 0;
  const totalPromoLoss = promotions?.length ? promotions.reduce((s, p) => s + Number(p.incremental_loss || p.loss_amount || 0), 0) : 0;
  const bestPromo = promotions?.reduce((best, p) => (Number(p.roi || 0) > Number(best?.roi || 0) ? p : best), promotions[0]);
  const promotionRecommendationIsMl = promotionRecommendation?.source === "ml_model";

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

      setScenarios((prev) => [
        ...prev,
        {
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
        },
      ]);
    } catch (err: any) {
      setSimulationError(err?.message || "Failed to simulate promotion.");
    }
  };

  const syncGoogleCalendarEvents = async () => {
    if (isSyncingCalendar) return;

    setIsSyncingCalendar(true);
    setCalendarSyncError(null);
    setCalendarSyncMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/promotions/sync-google-calendar`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to sync Google Calendar events.");
      }

      const syncedCount = Number(data?.events_upserted || 0);
      const syncedAtRaw = typeof data?.synced_at === "string" ? data.synced_at : null;
      if (syncedAtRaw) {
        setLastSyncedAt(syncedAtRaw);
      }
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promotion Simulator</h1>
        <p className="text-muted-foreground">AI recommendation, scenario simulator, and upcoming event promotions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Avg ROI" value={`${avgROI}x`} change="Across all promos" changeType="neutral" icon={Target} />
        <KPICard title="Avg Revenue Lift" value={`${avgLift}%`} change="+3.2% vs prior year" changeType="positive" icon={TrendingUp} />
        <KPICard title="Promo Profit" value={`$${(totalPromoProfit / 1000).toFixed(0)}K`} change="Incremental" changeType="positive" icon={DollarSign} />
        <KPICard title="Promo Loss" value={`$${(totalPromoLoss / 1000).toFixed(0)}K`} change="Cannibalization/costs" changeType="negative" icon={Percent} />
        <KPICard title="Best Promo" value={bestPromo?.name || "—"} change={`ROI: ${bestPromo?.roi || 0}x`} changeType="positive" icon={DollarSign} />
        <KPICard title="Active Promos" value={String(promotions?.filter((p) => p.status === "active").length || 0)} change={`${promotions?.length || 0} total`} changeType="neutral" icon={Percent} />
      </div>

      {promotionRecommendation?.insight && (
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI recommendation</CardTitle>
            <CardDescription>
              {promotionRecommendationIsMl
                ? `ML recommendation (${promotionRecommendation?.model_type || "model"}) trained on ${promotionRecommendation?.training_samples ?? 0} records`
                : "Data-driven suggestion from our backend"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{promotionRecommendation.insight}</p>
            {promotionRecommendationIsMl && (
              <>
                <p className="mt-2 text-xs text-muted-foreground">
                  ROI MAE: {promotionRecommendation?.roi_train_mae ?? "n/a"} | Lift MAE: {promotionRecommendation?.lift_train_mae ?? "n/a"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Predicted profit: ${Number(promotionRecommendation?.predicted_incremental_profit || 0).toFixed(0)} | Predicted loss: ${Number(promotionRecommendation?.predicted_incremental_loss || 0).toFixed(0)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg">Scenario Builder</CardTitle>
            <CardDescription>Configure and simulate promotion scenarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Discount: {discount[0]}%</Label>
              <Slider value={discount} onValueChange={setDiscount} min={5} max={50} step={5} />
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
            <Button onClick={simulate} className="w-full">Run Simulation</Button>
            {simulationError && <p className="text-xs text-destructive">{simulationError}</p>}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Scenario Comparison</CardTitle>
            <CardDescription>{scenarios.length ? `${scenarios.length} scenarios simulated` : "Run simulations to compare"}</CardDescription>
          </CardHeader>
          <CardContent>
            {scenarios.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discount</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Promo Type</TableHead>
                    <TableHead className="text-right">Budget</TableHead>
                    <TableHead className="text-right">Rev Lift</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Cannib.</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.discount}%</TableCell>
                      <TableCell>{s.duration}d</TableCell>
                      <TableCell>{s.channel}</TableCell>
                      <TableCell>{s.productCategory}</TableCell>
                      <TableCell>{s.region}</TableCell>
                      <TableCell>{s.promoType}</TableCell>
                      <TableCell className="text-right font-mono">${s.budget.toFixed(0)}</TableCell>
                      <TableCell className="text-right font-mono text-[hsl(var(--success))]">+{s.revenueLift}%</TableCell>
                      <TableCell className="text-right font-mono">{s.roi}x</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{s.cannibalization}%</TableCell>
                      <TableCell className="text-right font-mono text-[hsl(var(--success))]">${s.incrementalProfit.toFixed(0)}</TableCell>
                      <TableCell className="text-right font-mono text-destructive">${s.incrementalLoss.toFixed(0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Configure a scenario and click "Run Simulation"</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-secondary/20 bg-[hsl(var(--secondary))]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">📅 Upcoming Holidays</CardTitle>
          <CardDescription>From connected calendar events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingHolidayList.length ? (
            <div className="space-y-1 text-sm">
              {upcomingHolidayList.map((holiday, index) => (
                <p key={`${holiday.event_name}-${holiday.event_date}-${index}`} className="text-foreground">
                  • {holiday.display_name} - {formatHolidayDate(holiday.event_date)}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming holidays yet. Run calendar sync to load events.</p>
          )}
          <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            Suggestion: {holidaySuggestion}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Upcoming promotions</CardTitle>
              <CardDescription>Based on past festival/event promotion performance</CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button variant="outline" size="sm" onClick={syncGoogleCalendarEvents} disabled={isSyncingCalendar}>
                {isSyncingCalendar ? "Syncing..." : "Sync Now"}
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "Never"}
              </p>
            </div>
          </div>
          {calendarSyncMessage && <p className="text-xs text-[hsl(var(--success))]">{calendarSyncMessage}</p>}
          {calendarSyncError && <p className="text-xs text-destructive">{calendarSyncError}</p>}
        </CardHeader>
        <CardContent>
          {upcomingPromotions?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
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
                    <TableCell>{u.event_date}</TableCell>
                    <TableCell>{u.event_time}</TableCell>
                    <TableCell className="text-muted-foreground">{u.reference_name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{u.reference_roi != null ? `${u.reference_roi}x` : "—"}</TableCell>
                    <TableCell className="text-right font-mono text-[hsl(var(--success))]">{u.reference_revenue_lift_pct != null ? `+${u.reference_revenue_lift_pct}%` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No upcoming events. Sync Google Calendar (POST /api/promotions/sync-google-calendar) or add event_calendar rows with matching past promotion event_name.</p>
          )}
        </CardContent>
      </Card>

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
              <Bar dataKey="roi" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lift" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Promotions;
