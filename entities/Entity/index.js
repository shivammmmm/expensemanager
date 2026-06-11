export default {
  "name": "Entity",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Client/Customer name"
    },
    "contact_person": {
      "type": "string",
      "description": "Contact person name"
    },
    "phone": {
      "type": "string",
      "description": "Phone number"
    },
    "email": {
      "type": "string",
      "description": "Email address"
    },
    "address": {
      "type": "string",
      "description": "Full address"
    },
    "total_outstanding": {
      "type": "number",
      "default": 0,
      "description": "Total outstanding amount"
    },
    "total_collected": {
      "type": "number",
      "default": 0,
      "description": "Total amount collected so far"
    },
    "assigned_staff_id": {
      "type": "string",
      "description": "ID of the assigned staff member"
    },
    "assigned_staff_name": {
      "type": "string",
      "description": "Name of the assigned staff member"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "inactive",
        "cleared"
      ],
      "default": "active",
      "description": "Entity status"
    },
    "notes": {
      "type": "string",
      "description": "Additional notes"
    }
  },
  "required": [
    "name",
    "total_outstanding"
  ]
}