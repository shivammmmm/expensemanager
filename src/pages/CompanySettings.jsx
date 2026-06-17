import React, { useEffect, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";



import PageHeader from "@/components/shared/PageHeader";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { base44 } from "@/api/base44Client";

import { useToast } from "@/hooks/use-toast";

export default function CompanySettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();






  const { data, isLoading } = useQuery({

    queryKey: ["company-settings"],
    queryFn: () => base44.settings.getCompanySettings(),
  });

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    company_phone: "",
    company_address: "",
  });

  useEffect(() => {
    if (!data) return;
    setForm({
      company_name: data.company_name || "",
      company_phone: data.company_phone || "",
      company_address: data.company_address || "",
    });
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.settings.saveCompanySettings(form);
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({
        queryKey: ["company-settings"],
      });
    } catch (e) {
      toast({ title: "Failed to save", description: e?.message || "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Company Settings" subtitle="Update your company details" />

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company_name: e.target.value }))
                  }
                  placeholder="Company name"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Phone</Label>
                <Input
                  value={form.company_phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company_phone: e.target.value }))
                  }
                  placeholder="9876543210"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Company Address</Label>
                <Input
                  value={form.company_address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company_address: e.target.value }))
                  }
                  placeholder="Company address"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

