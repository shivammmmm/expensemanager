// Dynamic balance calculations used by Dashboard.

export function sumAmount(items) {
  return (items || []).reduce((s, x) => s + (x?.amount || 0), 0);
}

export function byStaffSummary({ received, sent, expenses, staffTransfers }) {
  const staffIds = new Set();
  const addFrom = (items, key) => {
    (items || []).forEach((it) => {
      const sid = it?.[key];
      if (sid) staffIds.add(sid);
    });
  };

  addFrom(received, "staff_id");
  addFrom(sent, "staff_id");
  addFrom(expenses, "staff_id");
  addFrom(staffTransfers, "staff_id");

  const summaries = [];
  for (const sid of staffIds) {
    const staff_name =
      received.find((r) => r.staff_id === sid)?.staff_name ||
      sent.find((p) => p.staff_id === sid)?.staff_name ||
      expenses.find((e) => e.staff_id === sid)?.staff_name ||
      staffTransfers.find((t) => t.staff_id === sid)?.staff_name ||
      "Unknown";

    const totalReceived = sumAmount(received.filter((r) => r.staff_id === sid));
    const totalSent = sumAmount(sent.filter((p) => p.staff_id === sid));
    const totalExpenses = sumAmount(expenses.filter((e) => e.staff_id === sid));
    const totalStaffTransfers = sumAmount(
      staffTransfers.filter((t) => t.staff_id === sid)
    );

    // Requirement-formula:
    // Staff Balance = StaffTransfers received by staff + Collection(Received)
    //                - SentPayment(amount) - Expense(amount)
    const balance = totalStaffTransfers + totalReceived - totalSent - totalExpenses;

    summaries.push({ id: sid, name: staff_name || "Unknown", balance });
  }

  return summaries;
}

