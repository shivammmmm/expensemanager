import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Download, ArrowUpRight, Search } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, exportToCSV } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import ClientLedgerDialog from "@/components/shared/ClientLedgerDialog";
import ClientCombobox from "@/components/shared/ClientCombobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Sent({ user }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sent_to: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    remark: "",
  });
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id, user?.role],
    queryFn: () =>
      isAdmin
        ? base44.entities.Client.list()
        : base44.entities.Client.filter({ staff_id: user.id }),
    enabled: !!user,
  });

  const { data: received = [] } = useQuery({
    queryKey: ["collections"],

    queryFn: () =>
      isAdmin
        ? base44.entities.Collection.list("-date", 500)
        : base44.entities.Collection.filter(
            { staff_id: user.id },
            "-date",
            500
          ),
  });

  const { data: sent = [], isLoading } = useQuery({
    queryKey: ["sent-payments"],
    queryFn: () =>
      isAdmin
        ? base44.entities.SentPayment.list("-date", 500)
        : base44.entities.SentPayment.filter(
            { staff_id: user.id },
            "-date",
            500
          ),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () =>
      isAdmin
        ? base44.entities.Expense.list("-expense_date", 500)
        : base44.entities.Expense.filter(
            { staff_id: user.id },
            "-expense_date",
            500
          ),
  });

  const filtered = sent.filter(
    (s) =>
      s.sent_to?.toLowerCase().includes(search.toLowerCase()) ||
      s.remark?.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = received.reduce((s, r) => s + (r.amount || 0), 0);
  const totalSent = filtered.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalReceived - totalSent - totalExpenses;

  const handleSave = async () => {
    if (!form.amount) return;
    if (isAdmin && !selectedStaffId) return;

    // Balance validation (insufficient funds)
    const amountNum = parseFloat(form.amount);
    if (!Number.isFinite(amountNum)) return;

    // Available Balance = Transfers + Collections - Sent - Expenses
    const staffId = isAdmin ? selectedStaffId : user.id;

    const availableFromTransfers = (await base44.entities.StaffTransfer.filter({ staff_id: staffId }))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const availableFromCollections = (await base44.entities.Collection.filter({ staff_id: staffId }))
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const existingSent = (await base44.entities.SentPayment.filter({ staff_id: staffId }))
      .reduce((sum, sp) => sum + (sp.amount || 0), 0);

    const existingExpenses = (await base44.entities.Expense.filter({ staff_id: staffId }))
      .reduce((sum, ex) => sum + (ex.amount || 0), 0);

    const availableBalance = availableFromTransfers + availableFromCollections - existingSent - existingExpenses;

    if (amountNum > availableBalance) {
      const { toast } = await import("@/components/ui/toast");
      toast({
        variant: "destructive",
        title: "Insufficient Balance",
        description: `Available Balance: ${formatCurrency(availableBalance)}`,
      });
      return;
    }


    if (isAdmin && staffList.length > 0) {
      const selected = staffList.find((s) => s.id === selectedStaffId);
      if (!selected?.full_name) return;
    }

    const staff = isAdmin
      ? {
          id: selectedStaffId,
          full_name: staffList.find((s) => s.id === selectedStaffId)?.full_name,
        }
      : { id: user.id, full_name: user.full_name };

    setSaving(true);
    await base44.entities.SentPayment.create({
      ...form,
      amount: parseFloat(form.amount),
      staff_id: staff.id,
      staff_name: staff.full_name,
    });

    setSaving(false);
    setDialogOpen(false);
    setForm({
      sent_to: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      remark: "",
    });
    setSelectedStaffId("");

    queryClient.invalidateQueries({ queryKey: ["sent-payments"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((s) => ({
        "Sent To": s.sent_to,
        Amount: s.amount,
        Date: s.date,
        Remark: s.remark,
        Staff: s.staff_name,
      })),
      "sent_payments"
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Sent"
        subtitle={`Total Sent: ${formatCurrency(totalSent)}`}
      >
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Payment
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Received</p>
            <p className="text-lg font-bold text-accent">
              {formatCurrency(totalReceived)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Sent</p>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(totalSent)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="text-lg font-bold text-chart-3">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground">Balance</p>
            <p
              className={`text-lg font-bold ${
                balance >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {formatCurrency(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ArrowUpRight}
          title="No payments sent"
          description="Record a payment given to someone"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-sm cursor-pointer hover:underline text-primary"
                      onClick={() => setSelectedClient(s.sent_to)}
                    >
                      {s.sent_to || "Unknown"}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{s.date}</span>
                      {isAdmin && s.staff_name && <span>• {s.staff_name}</span>}
                    </div>
                    {s.remark && (
                      <p className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded inline-block">
                        {s.remark}
                      </p>
                    )}
                  </div>
                  <p className="font-heading font-bold text-lg text-destructive whitespace-nowrap">
                    {formatCurrency(s.amount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClientLedgerDialog
        clientName={selectedClient}
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Payment Sent</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Sent To</Label>
              <ClientCombobox
                clients={clients}
                value={form.sent_to}
                onChange={(v) => setForm((f) => ({ ...f, sent_to: v }))}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tip: type a name and select from suggestions.
              </p>
            </div>
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            {isAdmin && (
              <div>
                <Label>Staff *</Label>
                <Select
                  value={selectedStaffId}
                  onValueChange={(v) => setSelectedStaffId(v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Remark</Label>
              <Textarea
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                rows={2}
                placeholder="Reason for payment..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving || !form.amount || (isAdmin && !selectedStaffId)
                }
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
