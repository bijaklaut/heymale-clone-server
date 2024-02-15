const mongoose = require("mongoose");

const shipmentSchema = mongoose.Schema({
   order_id: {
      type: String,
   },
   shipper: {
      name: {
         type: String,
      },
      email: {
         type: String,
      },
      phone: {
         type: String,
      },
      organization: {
         type: String,
      },
   },
   origin: {
      contact_name: {
         type: String,
      },
      contact_phone: {
         type: String,
      },
      contact_email: {
         type: String,
      },
      address: {
         type: String,
      },
      note: {
         type: String,
      },
      postal_code: {
         type: String,
      },
      coordinate: {
         latitude: {
            type: Number,
         },
         longitude: {
            type: Number,
         },
      },
   },
   destination: {
      contact_name: {
         type: String,
      },
      contact_phone: {
         type: String,
      },
      contact_email: {
         type: String,
      },
      address: {
         type: String,
      },
      note: {
         type: String,
      },
      postal_code: {
         type: String,
      },
      coordinate: {
         latitude: {
            type: Number,
         },
         longitude: {
            type: Number,
         },
      },
      proof_of_delivery: {
         use: {
            type: Boolean,
            default: false,
         },
         fee: {
            type: Number,
         },
         note: {
            type: String,
         },
         link: {
            type: String,
         },
      },
      cash_on_delivery: {
         id: {
            type: String,
         },
         amount: {
            type: Number,
         },
         fee: {
            type: Number,
         },
         note: {
            type: String,
         },
         type: {
            type: String,
         },
      },
   },
   courier: {
      tracking_id: {
         type: String,
      },
      waybill_id: {
         type: String,
      },
      company: {
         type: String,
      },
      name: {
         type: String,
      },
      phone: {
         type: String,
      },
      type: {
         type: String,
      },
      link: {
         type: String,
      },
      insurance: {
         amount: {
            type: Number,
         },
         fee: {
            type: Number,
         },
         note: {
            type: String,
         },
      },
      routing_code: {
         type: String,
      },
   },
   delivery: {
      datetime: {
         type: String,
      },
      note: {
         type: String,
      },
      type: {
         type: String,
      },
      distance: {
         type: Number,
      },
      distance_unit: {
         type: String,
      },
   },
   reference_id: {
      type: String,
   },
   items: [
      {
         name: {
            type: String,
         },
         description: {
            type: String,
         },
         sku: {
            type: String,
         },
         value: {
            type: Number,
         },
         quantity: {
            type: Number,
         },
         length: {
            type: Number,
         },
         width: {
            type: Number,
         },
         height: {
            type: Number,
         },
         weight: {
            type: Number,
         },
      },
   ],
   extra: [
      {
         type: mongoose.Schema.Types.Mixed,
      },
   ],
   price: {
      type: Number,
   },
   metadata: { type: mongoose.Schema.Types.Mixed },
   note: {
      type: String,
   },
   status: {
      type: String,
   },
});

module.exports = mongoose.model("Shipment", shipmentSchema);
