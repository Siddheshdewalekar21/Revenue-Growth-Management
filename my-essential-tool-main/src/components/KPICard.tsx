import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  description?: string;
  sparklineData?: number[];
  onClick?: () => void;
  badge?: string;
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={(((data.length - 1) / (data.length - 1)) * w)}
        cy={h - ((data[data.length - 1] - min) / range) * h}
        r="2"
        fill={color}
      />
    </svg>
  );
}

function AnimatedValue({ value }: { value: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setDisplayed(value);
    }
  }, [value]);

  return (
    <p className="text-2xl font-bold tracking-tight transition-all duration-300">
      {displayed}
    </p>
  );
}

export function KPICard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  sparklineData,
  onClick,
  badge,
}: KPICardProps) {
  const [hovered, setHovered] = useState(false);

  const iconColor =
    changeType === "positive"
      ? "text-emerald-500"
      : changeType === "negative"
        ? "text-red-500"
        : "text-blue-500";

  const bgColor =
    changeType === "positive"
      ? "bg-emerald-500/10"
      : changeType === "negative"
        ? "bg-red-500/10"
        : "bg-blue-500/10";

  const changeIcon =
    changeType === "positive" ? (
      <TrendingUp className="h-3 w-3" />
    ) : changeType === "negative" ? (
      <TrendingDown className="h-3 w-3" />
    ) : (
      <Minus className="h-3 w-3" />
    );

  const sparklineColor =
    changeType === "positive"
      ? "#10b981"
      : changeType === "negative"
        ? "#ef4444"
        : "#3b82f6";

  return (
    <Card
      className={cn(
        "glass-card group relative overflow-hidden transition-all duration-300",
        onClick && "cursor-pointer select-none",
        hovered && onClick && "shadow-lg scale-[1.02] border-primary/30"
      )}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Hover glow effect */}
      {onClick && (
        <div
          className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
            hovered && "opacity-100"
          )}
          style={{
            background:
              "radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.06), transparent 70%)",
          }}
        />
      )}

      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground truncate">
                {title}
              </p>
              {badge && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {badge}
                </span>
              )}
            </div>
            <AnimatedValue value={value} />
            {change && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  changeType === "positive" && "text-emerald-600 dark:text-emerald-400",
                  changeType === "negative" && "text-red-600 dark:text-red-400",
                  changeType === "neutral" && "text-muted-foreground"
                )}
              >
                {changeIcon}
                {change}
              </p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bgColor)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            {sparklineData && sparklineData.length >= 2 && (
              <Sparkline data={sparklineData} color={sparklineColor} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
