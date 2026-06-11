export default {
  "name": "Expense",
  "type": "object",
  "properties": {
    "category": {
      "type": "string",
      "enum": [
        "food",
        "petrol",
        "toll",
        "hotel",
        "other"
      ],
      "description": "Expense category"
    },
    "amount": {
      "type": "number",
      "description": "Expense amount"
    },
    "expense_date": {
      "type": "string",
      "format": "date",
      "description": "Date of expense"
    },
    "description": {
      "type": "string",
      "description": "Description of expense"
    },
    "bill_image": {
      "type": "string",
      "description": "URL of uploaded bill image"
    },
    "staff_id": {
      "type": "string",
      "description": "ID of the staff"
    },
    "staff_name": {
      "type": "string",
      "description": "Name of the staff"
    },
    "status": {
      "type": "string",
      "enum": [
        "pending",
        "approved",
        "rejected"
      ],
      "default": "pending",
      "description": "Approval status"
    }
  },
  "required": [
    "category",
    "amount",
    "expense_date"
  ]
}