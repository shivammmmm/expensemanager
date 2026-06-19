## Dashboard Cash Delete Audit

- [ ] Update `src/pages/Dashboard.jsx`
  - [ ] Ensure only Delete button exists (remove any Edit UI)
  - [ ] Wire delete state: `deleteCashId`, `deleteOpen`
  - [ ] Delete button sets `setDeleteCashId(entry.id)` and `setDeleteOpen(true)`
  - [ ] Add confirmation dialog (title/message/cancel+delete)
  - [ ] On confirm: `await base44.entities.CashLedger.delete(deleteCashId)`
  - [ ] After success: `queryClient.invalidateQueries(["cash-ledger"])`
  - [ ] Show toast: `Cash entry deleted successfully`
  - [ ] Close dialog after success
  - [ ] Do not modify any formulas / calculations

