import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Download, ArrowDownLeft, Search } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, exportToCSV } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ClientLedgerDialog from "@/components/shared/ClientLedgerDialog";
import ClientCombobox from "@/components/shared/ClientCombobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Received({ user }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    source: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: format(new Date(), "HH:mm"),
    payment_mode: "cash",
    reference_number: "",
    notes: "",
  });

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);

  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", user?.id, user?.role],
    queryFn: () =>
      isAdmin
        ? base44.entities.Client.list()
        : base44.entities.Client.filter({ staff_id: user.id }),
    enabled: !!user,
  });

  const { data: received = [], isLoading } = useQuery({
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

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const filtered = received.filter(
    (r) =>
      r.source?.toLowerCase().includes(search.toLowerCase()) ||
      r.staff_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.payment_mode?.toLowerCase().includes(search.toLowerCase())
  );

  const totalReceived = filtered.reduce((s, r) => s + (r.amount || 0), 0);
  const totalSent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const balance = totalReceived - totalSent;

  const handleSave = async () => {
    if (!form.amount) return;
    if (isAdmin && !selectedStaffId) return;

    const staff = isAdmin
      ? {
          id: selectedStaffId,
          full_name: staffList.find((s) => s.id === selectedStaffId)?.full_name,
        }
      : { id: user.id, full_name: user.full_name };

    setSaving(true);
    await base44.entities.Collection.create({
      ...form,
      amount: parseFloat(form.amount),
      staff_id: staff.id,
      staff_name: staff.full_name,
    });

    setSaving(false);
    setDialogOpen(false);
    setForm({
      source: "",
      amount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      time: format(new Date(), "HH:mm"),
      payment_mode: "cash",
      reference_number: "",
      notes: "",
    });
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((r) => ({
        Source: r.source,
        Amount: r.amount,
        Date: r.date,
        Mode: r.payment_mode,
        Reference: r.reference_number,
        Staff: r.staff_name,
        Notes: r.notes,
      })),
      "received"
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Received"
        subtitle={`Total Received: ${formatCurrency(totalReceived)}`}
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
          Add Received
        </Button>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Received</p>
            <p className="text-2xl font-heading font-bold text-accent">
              {formatCurrency(totalReceived)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
            <p className="text-2xl font-heading font-bold text-destructive">
              {formatCurrency(totalSent)}
            </p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p
              className={`text-2xl font-heading font-bold ${
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
          icon={ArrowDownLeft}
          title="No payments received"
          description="Record your first payment"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        className="font-semibold text-sm cursor-pointer hover:underline text-primary"
                        onClick={() => setSelectedClient(r.source)}
                      >
                        {r.source || "Unknown"}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="capitalize text-[10px]"
                      >
                        {r.payment_mode?.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{r.date}</span>
                      {r.time && <span>{r.time}</span>}
                      {isAdmin && r.staff_name && <span>• {r.staff_name}</span>}
                      {r.reference_number && (
                        <span>• Ref: {r.reference_number}</span>
                      )}
                    </div>
                  </div>
                  <p className="font-heading font-bold text-lg text-accent whitespace-nowrap">
                    {formatCurrency(r.amount)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Add Payment Received
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Received From</Label>
              <div className="w-full">
                <ClientCombobox
                  clients={clients}
                  value={form.source}
                  onChange={(v) => setForm((f) => ({ ...f, source: v }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Payment Mode</Label>
                <Select
                  value={form.payment_mode}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, payment_mode: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, time: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Reference</Label>
              <Input
                value={form.reference_number}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reference_number: e.target.value }))
                }
                placeholder="Cheque / TXN ID"
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
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.amount}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
