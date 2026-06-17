import React, { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Users,
  UserPlus,
  Phone,
  MapPin,
  Wallet,
  Receipt,
  Pencil,
  KeyRound,
  Trash2,
} from "lucide-react";


import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/exportUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useToast } from "@/hooks/use-toast";

export default function Staff() {
  const { toast } = useToast();

  const { data: staffList = [], isLoading, refetch } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
  });

  const isAdminView = true; // this route is admin-only via App.jsx

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    designation: "",
  });

  const handleCreateStaff = async () => {
    const { full_name, email, password, phone, designation } = form;
    if (!full_name || !email || !password) return;

    setSaving(true);
    try {
      await base44.users.createStaff({
        full_name,
        email,
        password,
        phone,
        designation,
        role: "staff",
      });

      toast({ title: "Staff created", description: `Created ${full_name}` });
      setCreateOpen(false);
      setForm({
        full_name: "",
        email: "",
        password: "",
        phone: "",
        designation: "",
      });
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState(null);
  const editingStaff = useMemo(
    () => staffList.find((s) => s.id === editingStaffId) || null,
    [staffList, editingStaffId]
  );

  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    designation: "",
    area: "",
  });

  const openEdit = (s) => {
    setEditingStaffId(s.id);
    setEditForm({
      full_name: s.full_name || "",
      email: s.email || "",
      phone: s.phone || "",
      designation: s.designation || "",
      area: s.area || "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingStaffId) return;
    setEditSaving(true);
    try {
      await base44.users.updateStaff(editingStaffId, editForm);
      toast({ title: "Staff updated" });
      setEditOpen(false);
      setEditingStaffId(null);
      await refetch();
    } finally {
      setEditSaving(false);
    }
  };

  const [resetOpen, setResetOpen] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetStaffId, setResetStaffId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");

  const openReset = (s) => {
    setResetStaffId(s.id);
    setResetPassword("");
    setResetOpen(true);
  };

  const handleResetPassword = async () => {
    if (!resetStaffId || !resetPassword) return;
    setResetSaving(true);
    try {
      await base44.users.resetStaffPassword(resetStaffId, {
        password: resetPassword,
      });
      toast({ title: "Password updated" });
      setResetOpen(false);
      setResetStaffId(null);
      await refetch();
    } finally {
      setResetSaving(false);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteStaffId, setDeleteStaffId] = useState(null);

  const openDelete = (s) => {
    setDeleteStaffId(s.id);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteStaffId) return;
    setDeleteSaving(true);
    try {
      await base44.users.deleteStaff(deleteStaffId);
      toast({ title: "Staff deleted" });
      setDeleteOpen(false);
      setDeleteStaffId(null);
      await refetch();
    } finally {
      setDeleteSaving(false);
    }
  };

  const { data: collections = [] } = useQuery({
    queryKey: ["all-collections"],
    queryFn: () => base44.entities.Collection.list("-collection_date", 1000),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 1000),
  });


  const staffTableActions = (s) => {
    const isAdminTarget = s?.role === "admin";

    return (
      <div className="flex gap-2 pt-3">
        <Button
          size="sm"
          variant="outline"
          disabled={isAdminTarget || !isAdminView}
          onClick={() => openEdit(s)}
        >
          <Pencil className="w-4 h-4 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isAdminTarget || !isAdminView}
          onClick={() => openReset(s)}
        >
          <KeyRound className="w-4 h-4 mr-1" />
          Reset Password
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={isAdminTarget || !isAdminView}
          onClick={() => openDelete(s)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Delete
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Staff Management" subtitle="Manage your team members">
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Create Staff
        </Button>
      </PageHeader>


      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : staffList.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No staff members"
          description="Invite your first team member"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((s) => {
            const staffCollections = collections.filter(
              (c) => c.staff_id === s.id
            );
            const staffExpenses = expenses.filter((e) => e.staff_id === s.id);
            const totalCollected = staffCollections.reduce(
              (sum, c) => sum + (c.amount || 0),
              0
            );
            const totalExpensed = staffExpenses.reduce(
              (sum, e) => sum + (e.amount || 0),
              0
            );

            return (
              <Card key={s.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold">
                        {s.full_name || "Unnamed"}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {s.full_name}
                      </p>
                    </div>
                    <Badge
                      variant={s.role === "admin" ? "default" : "secondary"}
                      className="capitalize text-xs"
                    >
                      {s.role || "staff"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground mb-4">
                    {s.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {s.phone}
                      </div>
                    )}
                    {s.area && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        {s.area}
                      </div>
                    )}
                    {s.designation && (
                      <div className="flex items-center gap-1.5">
                        {s.designation}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-accent mb-0.5">
                        <Wallet className="w-3 h-3" />
                        <span className="text-xs font-medium">Collected</span>
                      </div>
                      <p className="font-heading font-bold text-sm">
                        {formatCurrency(totalCollected)}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-destructive mb-0.5">
                        <Receipt className="w-3 h-3" />
                        <span className="text-xs font-medium">Expenses</span>
                      </div>
                      <p className="font-heading font-bold text-sm">
                        {formatCurrency(totalExpensed)}
                      </p>
                    </div>
                  </div>

                  <div>{staffTableActions(s)}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Create Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Full name *</Label>
              <Input
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="staff@example.com"
              />
            </div>

            <div>
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label>Phone (optional)</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="9876543210"
              />
            </div>

            <div>
              <Label>Designation (optional)</Label>
              <Input
                value={form.designation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, designation: e.target.value }))
                }
                placeholder="Accountant"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateStaff}
                disabled={
                  saving || !form.full_name || !form.email || !form.password
                }
              >
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Staff */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Full name</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="Staff name"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="staff@example.com"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="9876543210"
              />
            </div>

            <div>
              <Label>Designation</Label>
              <Input
                value={editForm.designation}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, designation: e.target.value }))
                }
                placeholder="Accountant"
              />
            </div>

            <div>
              <Label>Area</Label>
              <Input
                value={editForm.area}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, area: e.target.value }))
                }
                placeholder="Area"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              Set a new password for this staff.
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetSaving || !resetPassword}
              >
                {resetSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="text-sm text-muted-foreground">
              This action cannot be undone.
            </div>
            <div className="font-medium">
              {staffList.find((s) => s.id === deleteStaffId)?.full_name ||
                "This staff member"}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteSaving}
              >
                {deleteSaving ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

