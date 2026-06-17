import React, { useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

import { formatCurrency } from "@/lib/exportUtils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Plus, ArrowRightLeft, Users } from "lucide-react";

export default function StaffTransfers({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: staffList = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: transfers = [], isLoading: loadingTransfers } = useQuery({
    queryKey: ["staff-transfers"],
    queryFn: () => base44.entities.StaffTransfer.list("-created_at", 1000),
    enabled: !!user,
  });

  const { data: cashLedger = [] } = useQuery({
    queryKey: ["cash-ledger"],
    queryFn: () => base44.entities.CashLedger.list(),
    enabled: !!user,
  });


  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staff_id: "",
    amount: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    remark: "",
  });

  const selectedStaff = useMemo(() => {
    if (!form.staff_id) return null;
    return staffList.find((s) => s.id === form.staff_id) || null;
  }, [form.staff_id, staffList]);

  const canSave = isAdmin && form.staff_id && form.amount;

  const handleSave = async () => {
    if (!canSave) return;

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Amount must be greater than 0." });
      return;
    }

    // Transfer validation: if transferAmount > Available Shop Cash => block
    const shopCash = cashLedger.reduce((sum, l) => sum + (l.amount || 0), 0)
      - transfers.reduce((sum, t) => sum + (t.amount || 0), 0);

    if (amount > shopCash) {
      toast({
        title: "Insufficient Shop Cash",
        description: `Available Shop Cash: ₹${shopCash}`,
      });
      return;
    }

    setSaving(true);
    try {
      await base44.entities.StaffTransfer.create({
        staff_id: form.staff_id,
        amount,
        remark: form.remark || "",
        transfer_date: form.transfer_date,
      });


      toast({
        title: "Transfer saved",
        description: `Transferred ${formatCurrency(amount)} to ${selectedStaff?.full_name || "staff"}`,
      });

      setCreateOpen(false);
      setForm({
        staff_id: "",
        amount: "",
        transfer_date: new Date().toISOString().slice(0, 10),
        remark: "",
      });

      queryClient.invalidateQueries({ queryKey: ["staff-transfers"] });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Staff Transfers" subtitle="Admin only" />
        <EmptyState icon={Users} title="Forbidden" description="You do not have access to staff transfers." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Transfers" subtitle="Transfer shop cash to staff balances" >
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Transfer
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {loadingTransfers ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ArrowRightLeft}
                title="No transfers yet"
                description="Create the first staff transfer to enable staff balances."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Remark</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.transfer_date}</TableCell>
                    <TableCell>{t.staff_name || t.staff_id}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{t.remark || ""}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(t.amount || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">New Staff Transfer</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label>Staff *</Label>
              <Select
                value={form.staff_id}
                onValueChange={(v) => setForm((f) => ({ ...f, staff_id: v }))}
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

            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Transfer Date</Label>
              <Input
                type="date"
                value={form.transfer_date}
                onChange={(e) => setForm((f) => ({ ...f, transfer_date: e.target.value }))}
              />
            </div>

            <div>
              <Label>Remark</Label>
              <Textarea
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder="Optional remark"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !canSave}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>

            {loadingStaff && <div className="text-xs text-muted-foreground">Loading staff...</div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

