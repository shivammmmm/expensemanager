import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  MoreHorizontal,
  FileText,
  Users,
  ArrowRightLeft,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

const primaryLinks = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/received", icon: ArrowDownLeft, label: "Received" },
  { to: "/sent", icon: ArrowUpRight, label: "Sent" },
  { to: "/expenses", icon: Receipt, label: "Expenses" },
];

export default function MobileNav({ user }) {
  const location = useLocation();
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    base44.auth.logout("/login");
    window.location.href = "/login";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around py-1.5">
        {primaryLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <link.icon
                className={cn("w-5 h-5", isActive && "stroke-[2.5]")}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors text-muted-foreground"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0">
            <div className="p-4 border-b border-border">
              <SheetTitle className="text-base">More</SheetTitle>
            </div>

            <div className="p-2">
              {isAdmin ? (
                <>
                  <Link
                    to="/staff-transfers"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Staff Transfers</span>
                  </Link>
                  <Link
                    to="/staff"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <Users className="w-4 h-4" />
                    <span>Staff</span>
                  </Link>
                  <Link
                    to="/reports"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Reports</span>
                  </Link>
                  <Link
                    to="/company-settings"
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Company Settings</span>
                  </Link>

                  <div className="h-px bg-border my-2" />
                </>
              ) : null}

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors text-sm text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
