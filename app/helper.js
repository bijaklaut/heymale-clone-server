const axios = require("axios").default;
const { midBaseURLDev, midServerDev } = require("../config");
const Transaction = require("./transaction/model");

const getTodayDate = () => {
   const today = new Date();
   const date = today.getDate() < 10 ? `0${today.getDate()}` : today.getDate();
   const month =
      today.getMonth() + 1 < 10
         ? `0${today.getMonth() + 1}`
         : today.getMonth() + 1;
   const year = today.getFullYear();

   return `${year}-${month}-${date}`;
};
const generateInvoice = async () => {
   const today = new Date();
   const fullDate = getTodayDate().split("-").join("");
   const hours =
      today.getHours() < 10 ? `0${today.getHours()}` : today.getHours();
   const minutes =
      today.getMinutes() < 10 ? `0${today.getMinutes()}` : today.getMinutes();
   const seconds =
      today.getSeconds() < 10 ? `0${today.getSeconds()}` : today.getSeconds();
   let newInvoice = `HYML${fullDate}${hours}${minutes}${seconds}`;

   const checkInvoice = await Transaction.find({
      invoice: { $regex: newInvoice },
   });

   if (checkInvoice.length) {
      return `${newInvoice}${checkInvoice.length}`;
   }

   return newInvoice;
};
const getItemPrice = (total, item) => {
   let itemQty = 0;

   for (const size in item.variants) {
      itemQty += item.variants[size];
   }

   return total + item.price * itemQty;
};
const orderItemsAction = (orderItems) => {
   let newOrderItems = [];
   let transactionItems = [];
   let bulkOperations = [];
   let shippingItems = [];

   orderItems.map((item) => {
      let itemQty = 0;

      for (const size in item.variants) {
         itemQty += item.variants[size];

         if (item.variants[size] > 0) {
            let newData = {
               productName: `${item.item_name} - ${size.toUpperCase()}`,
               price: item.price,
               quantity: item.variants[size],
               thumbnail: item.thumbnail,
            };

            newOrderItems.push(newData);
         }
      }

      let dataTrx = {
         name: item.item_name,
         price: item.price,
         quantity: itemQty,
      };

      let dataDlv = {
         name: item.item_name,
         description: "Clothes",
         value: item.price,
         quantity: itemQty,
         weight: 200,
      };

      let operation = {
         updateOne: {
            filter: { _id: item._id },
            update: {
               $inc: {
                  "variant.s": item.variants.s ? item.variants.s * -1 : 0,
                  "variant.m": item.variants.m ? item.variants.m * -1 : 0,
                  "variant.l": item.variants.l ? item.variants.l * -1 : 0,
                  "variant.xl": item.variants.xl ? item.variants.xl * -1 : 0,
               },
            },
         },
      };

      shippingItems.push(dataDlv);
      transactionItems.push(dataTrx);
      bulkOperations.push(operation);
   });

   return { newOrderItems, transactionItems, bulkOperations, shippingItems };
};
const generatePaymentData = (
   customer,
   transactionItems,
   invoice,
   itemsPrice,
   reqbody
) => {
   const { shipping, payment, voucher } = reqbody;
   const voucherValue = voucher ? voucher.value : 0;
   const totalPrice = itemsPrice + shipping.price - voucherValue;

   let miscFee = {
      name: "Misc Fee",
      price: shipping.price - voucherValue,
      quantity: 1,
      id: "MISC",
   };

   let paymentData = {
      payment_type: payment.payment_type,
      transaction_details: {
         order_id: invoice,
         gross_amount: totalPrice,
      },
      customer_details: {
         first_name: customer.name,
         phone: customer.phoneNumber,
         shipping_address: {
            first_name: shipping.address.destination_contact_name,
            phone: shipping.address.destination_contact_phone,
            address: shipping.address.destination_address,
            city: shipping.address.destination_city,
            postal_code: shipping.address.destination_postal_code,
            country_code: "IDN",
         },
      },
      item_details: [...transactionItems, miscFee],
   };

   if (paymentData.payment_type == "bank_transfer") {
      paymentData = {
         ...paymentData,
         bank_transfer: {
            bank: payment.bank,
         },
      };
   }

   if (paymentData.payment_type == "echannel") {
      paymentData = {
         ...paymentData,
         echannel: {
            bill_info1: "Payment:",
            bill_info2: "Purchase at HeymaleClone",
         },
      };
   }

   return paymentData;
};
const generateShippingData = (shipping, invoice, shippingItems) => {
   const data = {
      order_id: null,
      shipper: {
         name: "Grok Bambrok",
         phone: "081277882932",
         email: "grok@bambrok.com",
         organization: "Heymale Clone",
      },
      origin: {
         contact_name: "Grok Bambrok",
         contact_phone: "081277882932",
         address: "Jl. Kenangan Manis 212",
         note: "Deket pintu masuk STC",
         postal_code: 13320,
      },
      destination: {
         contact_name: shipping.address.destination_contact_name,
         contact_phone: shipping.address.destination_contact_phone,
         address: shipping.address.destination_address,
         postal_code: shipping.address.destination_postal_code,
         area_id: shipping.address.destination_area_id,
         note: shipping.address.destination_note,
      },
      courier: {
         company: shipping.courier_company,
         type: shipping.courier_type,
         insurance: {
            fee: 0,
         },
      },
      delivery: {
         type: "later",
         date: getTodayDate(),
         time: "9:00",
      },
      order_note: "Please be careful",
      metadata: {},
      items: shippingItems,
      reference_id: invoice,
   };

   return data;
};
const generateOrderData = (
   newOrderItems,
   newTransaction,
   reqbody,
   shipping_id
) => {
   const { user, voucher, shipping } = reqbody;

   const orderData = {
      invoice: newTransaction.order_id,
      user: user,
      orderItem: newOrderItems,
      shippingDetail: shipping_id,
      transaction: newTransaction._id,
      voucher: voucher._id,
      price: newTransaction.gross_amount - shipping.price + voucher.value,
      totalPrice: newTransaction.gross_amount,
   };

   return orderData;
};
const cancelPayment = async (order_id) => {
   console.log("INI ORDER ID: ", order_id);

   const encodedKey = Buffer.from(midServerDev).toString("base64");
   const checkPayment = await axios({
      method: "GET",
      url: `${midBaseURLDev}/v2/${order_id}/status`,
      headers: {
         accept: "application/json",
         Authorization: `Basic ${encodedKey}`,
      },
      // auth: { username: midServerDev, password: "" },
   });

   if (checkPayment.data.status_code == 200) {
      const result = await axios({
         method: "POST",
         url: `${midBaseURLDev}/v2/${order_id}/cancel`,
         headers: {
            accept: "application/json",
            Authorization: `Basic ${encodedKey}`,
         },
         // auth: { username: midServerDev, password: "" },
      });
      return result.data;
   }

   return checkPayment.data;
};

module.exports = {
   getTodayDate,
   generateInvoice,
   getItemPrice,
   orderItemsAction,
   generatePaymentData,
   generateShippingData,
   generateOrderData,
   cancelPayment,
};
