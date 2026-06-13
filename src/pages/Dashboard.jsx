import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowDownLeft, ArrowUpRight, Wallet, Receipt, UserCircle } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/exportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function Dashboard({ user }) {
  const isAdmin = user?.role === "admin";

  const { data: received = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => isAdmin
      ? base44.entities.Collection.list("-date", 1000)
      : base44.entities.Collection.filter({ staff_id: user.id }, "-date", 1000),
  });

  const { data: sent = [] } = useQuery({
    queryKey: ["sent-payments"],
    queryFn: () => isAdmin
      ? base44.entities.SentPayment.list("-date", 1000)
      : base44.entities.SentPayment.filter({ staff_id: user.id }, "-date", 1000),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => isAdmin
      ? base44.entities.Expense.list("-expense_date", 1000)
      : base44.entities.Expense.filter({ staff_id: user.id }, "-expense_date", 1000),
  });

  const totalReceived = received.reduce((s, r) => s + (r.amount || 0), 0);
  const totalSent = sent.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalReceived - totalSent - totalExpenses;

  const today = format(new Date(), "yyyy-MM-dd");
  const todayReceived = received.filter(r => r.date === today).reduce((s, r) => s + (r.amount || 0), 0);
  const todaySent = sent.filter(p => p.date === today).reduce((s, p) => s + (p.amount || 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      date: format(d, "MMM dd"),
      received: received.filter(r => r.date === dateStr).reduce((s, r) => s + (r.amount || 0), 0),
      sent: sent.filter(p => p.date === dateStr).reduce((s, p) => s + (p.amount || 0), 0),
      expenses: expenses.filter(e => e.expense_date === dateStr).reduce((s, e) => s + (e.amount || 0), 0),
    };
  });

  const staffSummary = isAdmin ? (() => {
    const unique = new Map();
    [...received, ...sent, ...expenses].forEach(item => {
      const sid = item.staff_id;
      const sname = item.staff_name;
      if (sid && !unique.has(sid)) unique.set(sid, { id: sid, name: sname || "Unknown" });
    });
    return [...unique.values()].map(s => ({
      ...s,
      received: received.filter(r => r.staff_id === s.id).reduce((sum, r) => sum + (r.amount || 0), 0),
      sent: sent.filter(p => p.staff_id === s.id).reduce((sum, p) => sum + (p.amount || 0), 0),
      expenses: expenses.filter(e => e.staff_id === s.id).reduce((sum, e) => sum + (e.amount || 0), 0),
    })).map(s => ({ ...s, balance: s.received - s.sent - s.expenses }));
  })() : [{
    id: user.id,
    name: user.full_name || "You",
    received: totalReceived,
    sent: totalSent,
    expenses: totalExpenses,
    balance,
  }];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${user?.full_name?.split(" ")[0] || "User"}`}
        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Received" value={formatCurrency(totalReceived)} icon={ArrowDownLeft} variant="accent" />
        <StatCard title="Sent" value={formatCurrency(totalSent)} icon={ArrowUpRight} variant="destructive" />
        <StatCard title="Expenses" value={formatCurrency(totalExpenses)} icon={Receipt} variant="warning" />
        <StatCard title="Balance" value={formatCurrency(balance)} icon={Wallet} variant={balance >= 0 ? "primary" : "destructive"} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">7 Day Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(0,0%,100%)", border: "1px solid hsl(214,20%,90%)", borderRadius: "8px", fontSize: 12 }}
                  formatter={(val) => formatCurrency(val)}
                />
                <Bar dataKey="received" fill="hsl(168,60%,42%)" name="Received" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sent" fill="hsl(0,72%,51%)" name="Sent" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(40,90%,55%)" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-heading font-semibold text-lg mb-4">
          {isAdmin ? "Staff Summary" : "Your Summary"}
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffSummary.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-primary">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Staff</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-accent" />Received
                      </span>
                      <span className="font-semibold text-sm text-accent">{formatCurrency(s.received)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-destructive" />Sent
                      </span>
                      <span className="font-semibold text-sm text-destructive">{formatCurrency(s.sent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-chart-3" />Expenses
                      </span>
                      <span className="font-semibold text-sm text-chart-3">{formatCurrency(s.expenses)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <span className="text-xs font-medium">Balance</span>
                      <span className={`font-heading font-bold text-lg ${s.balance >= 0 ? "text-primary" : "text-destructive"}`}>
                        {formatCurrency(s.balance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {staffSummary.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-8">No staff data yet</p>
          )}
        </div>
      </div>
    </div>
  );
}