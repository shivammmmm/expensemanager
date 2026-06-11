import React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, variant = "default", className }) {
  const variants = {
    default: "bg-card border border-border",
    primary: "bg-primary/5 border border-primary/20",
    accent: "bg-accent/5 border border-accent/20",
    destructive: "bg-destructive/5 border border-destructive/20",
    warning: "bg-chart-3/5 border border-chart-3/20",
  };

  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-chart-3/10 text-chart-3",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("rounded-xl p-5", variants[variant], className)}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl md:text-3xl font-heading font-bold">{value}</p>
          {trendLabel && (
            <p className={cn(
              "text-xs font-medium",
              trend > 0 ? "text-accent" : trend < 0 ? "text-destructive" : "text-muted-foreground"
            )}>
              {trend > 0 ? "↑" : trend < 0 ? "↓" : "→"} {trendLabel}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}