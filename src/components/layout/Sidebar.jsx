import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, ArrowDownLeft, ArrowUpRight, Receipt, FileText, 
  ChevronLeft, ChevronRight, LogOut, UserCircle, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const adminLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/received", icon: ArrowDownLeft, label: "Received" },
  { to: "/sent", icon: ArrowUpRight, label: "Sent" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
  { to: "/reports", icon: FileText, label: "Reports" },
  { to: "/staff", icon: Users, label: "Staff" },
];

const staffLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/received", icon: ArrowDownLeft, label: "Received" },
  { to: "/sent", icon: ArrowUpRight, label: "Sent" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
];

export default function Sidebar({ user, collapsed, setCollapsed }) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const links = isAdmin ? adminLinks : staffLinks;

  const handleLogout = () => {
    // Clear token in SDK stub, then force redirect to login.
    base44.auth.logout("/login");
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-40 transition-all duration-300 flex flex-col",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-base tracking-tight whitespace-nowrap">CashTrack</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <ArrowDownLeft className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-sidebar-foreground/70" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold truncate">{user?.full_name || "User"}</p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider">{user?.role || "staff"}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform hidden md:flex"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}