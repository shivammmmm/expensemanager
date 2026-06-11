import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Download, Receipt, Search, Image, Check, X } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { formatCurrency, exportToCSV } from "@/lib/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "petrol", label: "Petrol" },
  { value: "toll", label: "Toll" },
  { value: "hotel", label: "Hotel" },
  { value: "other", label: "Other" },
];

export default function Expenses({ user }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    category: "food",
    amount: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    bill_image: "",
  });
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const [selectedStaffId, setSelectedStaffId] = useState("");

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: expenses = [], isLoading } = useQuery({
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Expense.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const filtered = expenses.filter((e) => {
    const matchesCat =
      categoryFilter === "all" || e.category === categoryFilter;
    const matchesSearch =
      !search ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.category?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const totalExpenses = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, bill_image: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.amount) return;
    if (isAdmin && !selectedStaffId) return;

    const staff = isAdmin
      ? {
          id: selectedStaffId,
          full_name: staffList.find((s) => s.id === selectedStaffId)?.full_name,
        }
      : { id: user.id, full_name: user.full_name };

    if (isAdmin && !staff.full_name) return;

    setSaving(true);
    await base44.entities.Expense.create({
      category: form.category,
      amount: parseFloat(form.amount),
      expense_date: form.expense_date,
      description: form.description,
      bill_image: form.bill_image,
      staff_id: staff.id,
      staff_name: staff.full_name,
      status: "pending",
    });

    setSaving(false);
    setDialogOpen(false);
    setForm({
      category: "food",
      amount: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      bill_image: "",
    });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  };

  const handleExport = () => {
    exportToCSV(
      filtered.map((e) => ({
        Category: e.category,
        Amount: e.amount,
        Date: e.expense_date,
        Description: e.description,
        Staff: e.staff_name,
        Status: e.status,
      })),
      "expenses"
    );
  };

  const statusColors = {
    pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    approved: "bg-accent/10 text-accent border-accent/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Expenses"
        subtitle={`Total: ${formatCurrency(totalExpenses)}`}
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
          Add Expense
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="food">Food</SelectItem>
            <SelectItem value="petrol">Petrol</SelectItem>
            <SelectItem value="toll">Toll</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses"
          description="Add your daily expenses"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <Card key={e.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm capitalize">
                        {e.category}
                      </h3>
                      <Badge
                        variant="outline"
                        className={statusColors[e.status] + " text-[10px]"}
                      >
                        {e.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{e.expense_date}</span>
                      {isAdmin && e.staff_name && <span>• {e.staff_name}</span>}
                      {e.description && (
                        <span className="truncate">• {e.description}</span>
                      )}
                    </div>
                  </div>
 c                 <div className="flex items-center gap-2 shrink-0">
                    {e.bill_image && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setImagePreview(e.bill_image)}
                      >
                        <Image className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && e.status === "pending" && (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-accent hover:text-accent"
                          onClick={() =>
                            updateMutation.mutate({
                              id: e.id,
                              data: { status: "approved" },
                            })
                          }
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() =>
                            updateMutation.mutate({
                              id: e.id,
                              data: { status: "rejected" },
                            })
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <p className="font-heading font-bold text-lg whitespace-nowrap">
                      {formatCurrency(e.amount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, amount: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expense_date: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                placeholder="What was this for?"
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
              <Label>Bill Image</Label>
              <div className="mt-1">
                {form.bill_image ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={form.bill_image}
                      alt="Bill"
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2 h-7 text-xs"
                      onClick={() => setForm((f) => ({ ...f, bill_image: "" }))}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Image className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {uploading ? "Uploading..." : "Upload bill"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
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

      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-lg p-2">
          {imagePreview && (
            <img src={imagePreview} alt="Bill" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
