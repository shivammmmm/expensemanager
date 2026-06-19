import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";

import { base44 } from "@/api/base44Client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Receipt,
  UserCircle,
} from "lucide-react";

import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { formatCurrency } from "@/lib/exportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function Dashboard({ user }) {
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();

  const [addCashOpen, setAddCashOpen] = useState(false);
  const [cashHistoryOpen, setCashHistoryOpen] = useState(false);

  const [deleteCashId, setDeleteCashId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);



  const { toast } = useToast();



  const handleConfirmDelete = async () => {
    if (!deleteCashId) return;

    await base44.entities.CashLedger.delete(deleteCashId);
    await queryClient.invalidateQueries(["cash-ledger"]);

    toast({ title: "Cash entry deleted successfully" });
    setDeleteOpen(false);
  };


  const [addCashForm, setAddCashForm] = useState({
    amount: "",
    remark: "",
    entry_date: format(new Date(), "yyyy-MM-dd"),
  });


  const { data: cashLedger = [] } = useQuery({
    queryKey: ["cash-ledger"],
    queryFn: () =>
      isAdmin
        ? base44.entities.CashLedger.list("-entry_date", 1000)
        : base44.entities.CashLedger.list(),
  });

  const { data: staffTransfers = [] } = useQuery({
    queryKey: ["staff-transfers"],
    queryFn: () =>
      isAdmin
        ? base44.entities.StaffTransfer.list("-transfer_date", 1000)
        : base44.entities.StaffTransfer.filter(
            { staff_id: user.id },
            "-transfer_date",
            1000
          ),
  });

  const shopCash =
    cashLedger.reduce((sum, l) => sum + (l.amount || 0), 0) -
    staffTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

  const { data: received = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () =>
      isAdmin
        ? base44.entities.Collection.list("-date", 1000)
        : base44.entities.Collection.filter(
            { staff_id: user.id },
            "-date",
            1000
          ),
  });

  const { data: sent = [] } = useQuery({
    queryKey: ["sent-payments"],
    queryFn: () =>
      isAdmin
        ? base44.entities.SentPayment.list("-date", 1000)
        : base44.entities.SentPayment.filter(
            { staff_id: user.id },
            "-date",
            1000
          ),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () =>
      isAdmin
        ? base44.entities.Expense.list("-expense_date", 1000)
        : base44.entities.Expense.filter(
            { staff_id: user.id },
            "-expense_date",
            1000
          ),
  });

  const totalReceived = received.reduce((s, r) => s + (r.amount || 0), 0);
  const totalSent = sent.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const staffTransfersTotal = staffTransfers.reduce(
    (sum, t) => sum + (t.amount || 0),
    0
  );

  // Staff-side balance: Transfers + Received - Sent - Expenses
  // (Admin formula is handled in staffSummary below and is not changed.)
  const balance =
    staffTransfersTotal + totalReceived - totalSent - totalExpenses;

  const today = format(new Date(), "yyyy-MM-dd");
  const todayReceived = received
    .filter((r) => r.date === today)
    .reduce((s, r) => s + (r.amount || 0), 0);
  const todaySent = sent
    .filter((p) => p.date === today)
    .reduce((s, p) => s + (p.amount || 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = format(d, "yyyy-MM-dd");
    return {
      date: format(d, "MMM dd"),
      received: received
        .filter((r) => r.date === dateStr)
        .reduce((s, r) => s + (r.amount || 0), 0),
      sent: sent
        .filter((p) => p.date === dateStr)
        .reduce((s, p) => s + (p.amount || 0), 0),
      expenses: expenses
        .filter((e) => e.expense_date === dateStr)
        .reduce((s, e) => s + (e.amount || 0), 0),
    };
  });

  const staffSummary = isAdmin
    ? (() => {
        const unique = new Map();
        [...received, ...sent, ...expenses, ...staffTransfers].forEach(
          (item) => {
            const sid = item.staff_id;
            const sname = item.staff_name;
            if (sid && !unique.has(sid))
              unique.set(sid, { id: sid, name: sname || "Unknown" });
          }
        );

        return [...unique.values()]
          .map((s) => {
            const transfers = staffTransfers
              .filter((t) => t.staff_id === s.id)
              .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
              ...s,
              transfers,
              received: received
                .filter((r) => r.staff_id === s.id)
                .reduce((sum, r) => sum + (r.amount || 0), 0),
              sent: sent
                .filter((p) => p.staff_id === s.id)
                .reduce((sum, p) => sum + (p.amount || 0), 0),
              expenses: expenses
                .filter((e) => e.staff_id === s.id)
                .reduce((sum, e) => sum + (e.amount || 0), 0),
            };
          })
          .map((s) => ({
            ...s,
            balance: s.transfers + s.received - s.sent - s.expenses,
          }));
      })()
    : [
        {
          id: user.id,
          name: user.full_name || "You",
          transfers: staffTransfers.reduce(
            (sum, t) => sum + (t.amount || 0),
            0
          ),
          received: totalReceived,
          sent: totalSent,
          expenses: totalExpenses,
          balance:
            staffTransfersTotal + totalReceived - totalSent - totalExpenses,
        },
      ];

  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => base44.settings.getCompanySettings(),
  });

  return (
    <div className="space-y-6">
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Cash Entry</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete this cash entry?
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageHeader
        title={companySettings?.company_name || "Admin"}

        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Received"
          value={formatCurrency(totalReceived)}
          icon={ArrowDownLeft}
          variant="accent"
        />
        <StatCard
          title="Sent"
          value={formatCurrency(totalSent)}
          icon={ArrowUpRight}
          variant="destructive"
        />
        <StatCard
          title="Expenses"
          value={formatCurrency(totalExpenses)}
          icon={Receipt}
          variant="warning"
        />
        <StatCard
          title="Balance"
          value={formatCurrency(balance)}
          icon={Wallet}
          variant={balance >= 0 ? "primary" : "destructive"}
        />

        {isAdmin && (
          <StatCard
            title="Shop Cash"
            value={formatCurrency(shopCash)}
            icon={Wallet}
            variant={shopCash >= 0 ? "primary" : "destructive"}
          />
        )}
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-heading font-semibold text-lg">
              Cash Added History
            </h3>

            <button
              type="button"
              className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/90"
              onClick={() => {
                // open dialog
                setCashHistoryOpen(true);
              }}
            >
              View All
            </button>
          </div>

          {(() => {
            const sortedAll = [...(cashLedger || [])].sort((a, b) => {
              const ad = a?.entry_date;
              const bd = b?.entry_date;
              if (ad === bd) {
                const ac = a?.created_at;
                const bc = b?.created_at;
                return (
                  (bc ? new Date(bc).getTime() : 0) -
                  (ac ? new Date(ac).getTime() : 0)
                );
              }
              return (
                (bd ? new Date(bd).getTime() : 0) -
                (ad ? new Date(ad).getTime() : 0)
              );
            });

            const latest5 = sortedAll.slice(0, 5);

            if (latest5.length === 0) {
              return (
                <div className="text-muted-foreground text-sm">
                  No cash entries found
                </div>
              );
            }

            return (
                <div className="rounded-md border overflow-hidden">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm">

                    <thead className="bg-muted/50">
                      <tr className="text-left">
                        <th className="px-4 py-2 font-medium">Amount</th>
                        <th className="px-4 py-2 font-medium">Entry Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latest5.map((l) => (
                        <tr key={l.id} className="border-t border-border/50">
                          <td className="px-4 py-2 whitespace-nowrap font-medium">
                            {formatCurrency(l.amount || 0)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {l.entry_date || "-"}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDeleteCashId(l.id);
                                  setDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Cash Entry</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Are you sure you want to delete this cash entry?
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cashHistoryOpen} onOpenChange={setCashHistoryOpen}>
        <DialogContent className="max-w-3xl">

          <DialogHeader>
            <DialogTitle>Cash Added History</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {(() => {
              const sortedAll = [...(cashLedger || [])].sort((a, b) => {
                const ad = a?.entry_date;
                const bd = b?.entry_date;
                if (ad === bd) {
                  const ac = a?.created_at;
                  const bc = b?.created_at;
                  return (
                    (bc ? new Date(bc).getTime() : 0) -
                    (ac ? new Date(ac).getTime() : 0)
                  );
                }
                return (
                  (bd ? new Date(bd).getTime() : 0) -
                  (ad ? new Date(ad).getTime() : 0)
                );
              });

              if (sortedAll.length === 0) {
                return (
                  <div className="text-muted-foreground text-sm py-2">
                    No cash entries found
                  </div>
                );
              }

              return (
                <div className="rounded-md border overflow-hidden">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr className="text-left">
                          <th className="px-4 py-2 font-medium">Amount</th>
                          <th className="px-4 py-2 font-medium">Entry Date</th>
                          <th className="px-4 py-2 font-medium text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAll.map((l) => (
                          <tr key={l.id} className="border-t border-border/50">
                            <td className="px-4 py-2 whitespace-nowrap font-medium">
                              {formatCurrency(l.amount || 0)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {l.entry_date || "-"}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <div className="inline-flex items-center gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setDeleteCashId(l.id);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            onClick={() => setAddCashOpen(true)}
          >
            <span className="text-lg leading-none">+</span>
            Add Cash
          </button>
        </div>
      )}

      <Dialog open={addCashOpen} onOpenChange={setAddCashOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Cash</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="cash-amount">Amount</Label>
              <Input
                id="cash-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={addCashForm.amount}
                onChange={(e) =>
                  setAddCashForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cash-remark">Remark</Label>
              <Textarea
                id="cash-remark"
                placeholder="Optional note"
                value={addCashForm.remark}
                onChange={(e) =>
                  setAddCashForm((f) => ({ ...f, remark: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cash-entry-date">Entry date</Label>
              <Input
                id="cash-entry-date"
                type="date"
                value={addCashForm.entry_date}
                onChange={(e) =>
                  setAddCashForm((f) => ({ ...f, entry_date: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => setAddCashOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              onClick={async () => {
                const amountNum = Number(addCashForm.amount);
                if (!Number.isFinite(amountNum)) return;

                await base44.entities.CashLedger.create({
                  amount: amountNum,
                  remark: addCashForm.remark || "",
                  entry_date: addCashForm.entry_date,
                  created_by: user.id,
                  created_at: new Date().toISOString(),
                });

                await queryClient.invalidateQueries(["cash-ledger"]);
                setAddCashOpen(false);
                setAddCashForm({
                  amount: "",
                  remark: "",
                  entry_date: format(new Date(), "yyyy-MM-dd"),
                });
              }}
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-heading">
            7 Day Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(220,10%,46%)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(0,0%,100%)",
                    border: "1px solid hsl(214,20%,90%)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(val) => formatCurrency(val)}
                />
                <Bar
                  dataKey="received"
                  fill="hsl(168,60%,42%)"
                  name="Received"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="sent"
                  fill="hsl(0,72%,51%)"
                  name="Sent"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  fill="hsl(40,90%,55%)"
                  name="Expenses"
                  radius={[4, 4, 0, 0]}
                />
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
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Staff
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-accent" />
                        Received
                      </span>
                      <span className="font-semibold text-sm text-accent">
                        {formatCurrency(s.received)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wallet className="w-3 h-3 text-primary" />
                        Transfers
                      </span>
                      <span className="font-semibold text-sm text-primary">
                        {formatCurrency(s.transfers || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-destructive" />
                        Sent
                      </span>
                      <span className="font-semibold text-sm text-destructive">
                        {formatCurrency(s.sent)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-chart-3" />
                        Expenses
                      </span>
                      <span className="font-semibold text-sm text-chart-3">
                        {formatCurrency(s.expenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t mt-2">
                      <span className="text-xs font-medium">Balance</span>
                      <span
                        className={`font-heading font-bold text-lg ${
                          s.balance >= 0 ? "text-primary" : "text-destructive"
                        }`}
                      >
                        {formatCurrency(s.balance)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {staffSummary.length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-8">
              No staff data yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
