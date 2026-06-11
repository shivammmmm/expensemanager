import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/received", icon: ArrowDownLeft, label: "Received" },
  { to: "/sent", icon: ArrowUpRight, label: "Sent" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
];

const staffLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/received", icon: ArrowDownLeft, label: "Received" },
  { to: "/sent", icon: ArrowUpRight, label: "Sent" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
];

export default function MobileNav({ user }) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const links = isAdmin ? adminLinks : staffLinks;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}