import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/exportUtils";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function ClientLedgerDialog({ clientName, isOpen, onClose }) {
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: () => base44.entities.Collection.list(),
  });

  const { data: sentPayments = [] } = useQuery({
    queryKey: ["sent-payments"],
    queryFn: () => base44.entities.SentPayment.list(),
  });

  const ledger = useMemo(() => {
    if (!clientName) return [];
    const nameLower = clientName.toLowerCase();

    const received = collections
      .filter((c) => c.source?.toLowerCase() === nameLower)
      .map((c) => ({
        id: c.id,
        type: "received",
        amount: c.amount,
        date: c.date,
        time: c.time,
        note: c.notes || c.reference_number || c.payment_mode,
      }));

    const sent = sentPayments
      .filter((s) => s.sent_to?.toLowerCase() === nameLower)
      .map((s) => ({
        id: s.id,
        type: "sent",
        amount: s.amount,
        date: s.date,
        time: "",
        note: s.remark,
      }));

    const all = [...received, ...sent];
    all.sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0; // fallback if dates are same
    });

    return all;
  }, [clientName, collections, sentPayments]);

  const totalReceived = ledger.filter((l) => l.type === "received").reduce((sum, l) => sum + l.amount, 0);
  const totalSent = ledger.filter((l) => l.type === "sent").reduce((sum, l) => sum + l.amount, 0);
  const balance = totalReceived - totalSent; // positive means we received more, negative means we sent more

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-4 md:p-6 border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            Ledger: <span className="text-primary">{clientName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Given</p>
              <p className="font-bold text-destructive">{formatCurrency(totalSent)}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Received</p>
              <p className="font-bold text-accent">{formatCurrency(totalReceived)}</p>
            </div>
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
              <p className={`font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {ledger.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No transactions found.</p>
            ) : (
              ledger.map((item) => (
                <div key={item.id} className="flex items-start justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {item.type === "received" ? (
                        <div className="bg-accent/10 p-1.5 rounded-full">
                          <ArrowDownLeft className="w-4 h-4 text-accent" />
                        </div>
                      ) : (
                        <div className="bg-destructive/10 p-1.5 rounded-full">
                          <ArrowUpRight className="w-4 h-4 text-destructive" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm capitalize">{item.type}</span>
                        <span className="text-xs text-muted-foreground">{item.date} {item.time}</span>
                      </div>
                      {item.note && <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold font-heading ${item.type === "received" ? "text-accent" : "text-destructive"}`}>
                      {item.type === "received" ? "+" : "-"}{formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
