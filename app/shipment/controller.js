const Shipment = require("./model");

module.exports = {
   createShipment: async (req, res) => {
      try {
         const newShipment = await Shipment.create(req.body);
         res.status(201).send({
            status: 201,
            message: "Shipment created successfully",
            payload: newShipment,
         });
      } catch (error) {
         res.status(400).send({
            status: 400,
            message: "Failed to create shipment",
            errorDetail: error,
         });
      }
   },
};
