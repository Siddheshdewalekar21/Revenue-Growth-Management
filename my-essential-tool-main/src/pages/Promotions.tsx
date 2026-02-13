import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KPICard } from "@/components/KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  revenueLift: number;
  roi: number;
  cannibalization: number;
}

const Promotions = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [discount, setDiscount] = useState([15]);
  const [duration, setDuration] = useState("7");
  const [channel, setChannel] = useState("Retail");

  const { data: promotions } = useQuery({
    queryKey: ["promotions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/promotions`);
      if (!res.ok) throw new Error("Failed to fetch promotions");
      return res.json();
    },
  });

  const avgROI = promotions?.length ? (promotions.reduce((s, p) => s + Number(p.roi || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const avgLift = promotions?.length ? (promotions.reduce((s, p) => s + Number(p.revenue_lift_pct || 0), 0) / promotions.length).toFixed(1) : "0.0";
  const bestPromo = promotions?.reduce((best, p) => (Number(p.roi || 0) > Number(best?.roi || 0) ? p : best), promotions[0]);

  const simulate = () => {
    const d = discount[0];
    const dur = parseInt(duration);
    // Simple simulation model
    const revLift = d * 1.4 + (dur > 7 ? 5 : 0) + (channel === "Foodservice" ? 3 : 0);
    const roi = (100 - d) / d * (dur < 7 ? 1.5 : 1.0);
    const cannib = d * 0.4 + (dur > 14 ? 5 : 0);
    setScenarios((prev) => [
      ...prev,
      { id: Date.now(), discount: d, duration: dur, channel, revenueLift: parseFloat(revLift.toFixed(1)), roi: parseFloat(roi.toFixed(2)), cannibalization: parseFloat(cannib.toFixed(1)) },
    ]);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Promotion Simulator</h1>
        <p className="text-muted-foreground">Test promotion scenarios and analyze historical performance</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Avg ROI" value={`${avgROI}x`} change="Across all promos" changeType="neutral" icon={Target} />
        <KPICard title="Avg Revenue Lift" value={`${avgLift}%`} change="+3.2% vs prior year" changeType="positive" icon={TrendingUp} />
        <KPICard title="Best Promo" value={bestPromo?.name || "—"} change={`ROI: ${bestPromo?.roi || 0}x`} changeType="positive" icon={DollarSign} />
        <KPICard title="Active Promos" value={String(promotions?.filter((p) => p.status === "active").length || 0)} change={`${promotions?.length || 0} total`} changeType="neutral" icon={Percent} />
      </div>

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
            <Button onClick={simulate} className="w-full">Run Simulation</Button>
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
                    <TableHead className="text-right">Rev Lift</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Cannib.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono">{s.discount}%</TableCell>
                      <TableCell>{s.duration}d</TableCell>
                      <TableCell>{s.channel}</TableCell>
                      <TableCell className="text-right font-mono text-[hsl(var(--success))]">+{s.revenueLift}%</TableCell>
                      <TableCell className="text-right font-mono">{s.roi}x</TableCell>
                      <TableCell className="text-right font-mono text-destructive">{s.cannibalization}%</TableCell>
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
