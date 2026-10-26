import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label?: string; isPositive?: boolean };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, iconColor = "text-primary", iconBg, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn("text-xs font-medium", (trend.isPositive ?? trend.value >= 0) ? "text-green-600" : "text-red-600")}>
                {(trend.isPositive ?? trend.value >= 0) ? "+" : ""}{trend.value}% {trend.label ?? ""}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn("rounded-full p-3", iconBg || "bg-muted", iconColor)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
