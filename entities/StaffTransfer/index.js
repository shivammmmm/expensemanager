export default {
  name: "StaffTransfer",
  type: "object",
  properties: {
    id: { type: "string", description: "Unique ID" },
    staff_id: { type: "string", description: "Staff user id" },
    staff_name: { type: "string", description: "Staff name" },
    amount: { type: "number", description: "Transfer amount" },
    remark: { type: "string", description: "Remark" },
    transfer_date: { type: "string", description: "Transfer date (YYYY-MM-DD)" },
    created_by: { type: "string", description: "Admin user id" },
    created_at: { type: "string", description: "Created at ISO string" },
  },
  required: ["staff_id", "amount", "transfer_date", "created_by", "created_at"],
};

