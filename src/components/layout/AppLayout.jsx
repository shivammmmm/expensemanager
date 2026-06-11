import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import { cn } from "@/lib/utils";

export default function AppLayout({ user }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar user={user} collapsed={collapsed} setCollapsed={setCollapsed} />
      </div>
      <MobileNav user={user} />
      <main
        className={cn(
          "transition-all duration-300 pb-20 md:pb-6",
          collapsed ? "md:ml-[68px]" : "md:ml-[240px]"
        )}
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}