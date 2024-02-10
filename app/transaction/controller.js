const generateInvoice = () => {
   const today = new Date();
   const date = today.toISOString().split("T")[0].split("-").join("");
   const hours =
      today.getHours() < 10 ? `0${today.getHours()}` : today.getHours();
   const minutes =
      today.getMinutes() < 10 ? `0${today.getMinutes()}` : today.getMinutes();
   const seconds =
      today.getSeconds() < 10 ? `0${today.getSeconds()}` : today.getSeconds();

   return `HYML${date}${hours}${minutes}${seconds}`;
};

module.exports = {
   createTransaction: async (req, res) => {
      const { user, orderItem, shippingAddress, voucher, price } = req.body;
      let invoice = generateInvoice();

      res.status(200).send({
         invoice: generateInvoice(),
      });
   },
};
