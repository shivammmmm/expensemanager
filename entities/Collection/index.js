export default {
  "name": "Collection",
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "description": "Who the payment came from"
    },
    "amount": {
      "type": "number",
      "description": "Amount received"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Date of receipt"
    },
    "time": {
      "type": "string",
      "description": "Time of receipt"
    },
    "payment_mode": {
      "type": "string",
      "enum": [
        "cash",
        "cheque",
        "upi",
        "bank_transfer",
        "other"
      ],
      "description": "Mode of payment"
    },
    "reference_number": {
      "type": "string",
      "description": "Cheque number or transaction reference"
    },
    "staff_id": {
      "type": "string",
      "description": "ID of the staff"
    },
    "staff_name": {
      "type": "string",
      "description": "Name of the staff"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    }
  },
  "required": [
    "amount",
    "date"
  ]
}