export default {
  "name": "CashLedger",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique ID"
    },
    "amount": {
      "type": "number",
      "description": "Cash amount added"
    },
    "remark": {
      "type": "string",
      "description": "Remark"
    },
    "entry_date": {
      "type": "string",
      "description": "Entry date (YYYY-MM-DD)"
    },
    "created_by": {
      "type": "string",
      "description": "Admin user id"
    },
    "created_at": {
      "type": "string",
      "description": "Created at ISO string"
    }
  },
  "required": ["amount", "entry_date", "created_by", "created_at"]
};


