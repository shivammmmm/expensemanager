export default {
  "name": "SentPayment",
  "type": "object",
  "properties": {
    "sent_to": {
      "type": "string",
      "description": "Who the payment was given to"
    },
    "amount": {
      "type": "number",
      "description": "Amount sent"
    },
    "date": {
      "type": "string",
      "format": "date",
      "description": "Date of payment"
    },
    "remark": {
      "type": "string",
      "description": "Reason / remark for the payment"
    },
    "staff_id": {
      "type": "string",
      "description": "ID of the staff"
    },
    "staff_name": {
      "type": "string",
      "description": "Name of the staff"
    }
  },
  "required": [
    "amount",
    "date"
  ]
}