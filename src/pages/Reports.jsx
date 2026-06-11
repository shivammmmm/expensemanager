import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, Users } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { formatCurrency, exportToCSV } from "@/lib/exportUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [staffFilter, setStaffFilter] = useState("all");

  const { data: received = [] } = useQuery({
    queryKey: ["all-collections"],
    queryFn: () => base44.entities.Collection.list("-date", 2000),
  });

  const { data: sentPayments = [] } = useQuery({
    queryKey: ["all-sent-payments"],
    queryFn: () => base44.entities.SentPayment.list("-date", 2000),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["all-expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 2000),
  });

  const { data: staffList = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.User.list(),
  });

  const filterByDate = (items, dateField) =>
    items.filter(item => {
      const d = item[dateField];
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (staffFilter !== "all" && item.staff_id !== staffFilter) return false;
      return true;
    });

  const filteredReceived = filterByDate(received, "date");
  const filteredSent = filterByDate(sentPayments, "date");
  const filteredExpenses = filterByDate(expenses, "expense_date");

  const staffWiseData = staffList.map(s => {
    const sr = filteredReceived.filter(r => r.staff_id === s.id);
    const sp = filteredSent.filter(p => p.staff_id === s.id);
    const se = filteredExpenses.filter(e => e.staff_id === s.id);
    return {
      name: s.full_name || "Unknown",
      received: sr.reduce((sum, r) => sum + (r.amount || 0), 0),
      sent: sp.reduce((sum, p) => sum + (p.amount || 0), 0),
      expenses: se.reduce((sum, e) => sum + (e.amount || 0), 0),
    };
  }).filter(d => d.received > 0 || d.sent > 0 || d.expenses > 0);

  const dailyReport = () => {
    const dateMap = {};
    filteredReceived.forEach(r => {
      if (!dateMap[r.date]) dateMap[r.date] = { date: r.date, received: 0, sent: 0, expenses: 0 };
      dateMap[r.date].received += r.amount || 0;
    });
    filteredSent.forEach(p => {
      if (!dateMap[p.date]) dateMap[p.date] = { date: p.date, received: 0, sent: 0, expenses: 0 };
      dateMap[p.date].sent += p.amount || 0;
    });
    filteredExpenses.forEach(e => {
      if (!dateMap[e.expense_date]) dateMap[e.expense_date] = { date: e.expense_date, received: 0, sent: 0, expenses: 0 };
      dateMap[e.expense_date].expenses += e.amount || 0;
    });
    return Object.values(dateMap).sort((a, b) => b.date.localeCompare(a.date));
  };

  const handleExport = () => {
    exportToCSV(staffWiseData.map(d => ({
      Staff: d.name, Received: d.received, Sent: d.sent, Expenses: d.expenses, Balance: d.received - d.sent - d.expenses,
    })), "report");
  };

  const totalReceived = filteredReceived.reduce((s, r) => s + (r.amount || 0), 0);
  const totalSent = filteredSent.reduce((s, p) => s + (p.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle={`Balance: ${formatCurrency(totalReceived - totalSent - totalExpenses)}`} />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">Staff</Label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setStaffFilter("all"); }}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Received</p>
            <p className="text-xl font-heading font-bold text-accent">{formatCurrency(totalReceived)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Sent</p>
            <p className="text-xl font-heading font-bold text-destructive">{formatCurrency(totalSent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
            <p className="text-xl font-heading font-bold text-chart-3">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Balance</p>
            <p className={`text-xl font-heading font-bold ${totalReceived - totalSent - totalExpenses >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(totalReceived - totalSent - totalExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff">
        <TabsList className="bg-muted">
          <TabsTrigger value="staff"><Users className="w-4 h-4 mr-1.5" />Staff-wise</TabsTrigger>
          <TabsTrigger value="daily"><FileText className="w-4 h-4 mr-1.5" />Daily</TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="space-y-4 pt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-3.5 h-3.5 mr-1.5" />Export</Button>
          </div>
          {staffWiseData.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffWiseData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(val) => formatCurrency(val)} />
                      <Legend />
                      <Bar dataKey="received" fill="hsl(168,60%,42%)" name="Received" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="sent" fill="hsl(0,72%,51%)" name="Sent" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" fill="hsl(40,90%,55%)" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Staff</th>
                      <th className="text-right p-3 font-medium">Received</th>
                      <th className="text-right p-3 font-medium">Sent</th>
                      <th className="text-right p-3 font-medium">Expenses</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffWiseData.map(d => (
                      <tr key={d.name} className="border-b last:border-0">
                        <td className="p-3 font-medium">{d.name}</td>
                        <td className="p-3 text-right text-accent font-semibold">{formatCurrency(d.received)}</td>
                        <td className="p-3 text-right text-destructive font-semibold">{formatCurrency(d.sent)}</td>
                        <td className="p-3 text-right text-chart-3 font-semibold">{formatCurrency(d.expenses)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(d.received - d.sent - d.expenses)}</td>
                      </tr>
                    ))}
                    {staffWiseData.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4 pt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Received</th>
                      <th className="text-right p-3 font-medium">Sent</th>
                      <th className="text-right p-3 font-medium">Expenses</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReport().map(d => (
                      <tr key={d.date} className="border-b last:border-0">
                        <td className="p-3 font-medium">{d.date}</td>
                        <td className="p-3 text-right text-accent font-semibold">{formatCurrency(d.received)}</td>
                        <td className="p-3 text-right text-destructive font-semibold">{formatCurrency(d.sent)}</td>
                        <td className="p-3 text-right text-chart-3 font-semibold">{formatCurrency(d.expenses)}</td>
                        <td className="p-3 text-right font-bold">{formatCurrency(d.received - d.sent - d.expenses)}</td>
                      </tr>
                    ))}
                    {dailyReport().length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}