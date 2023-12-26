const jwt = require("jsonwebtoken");
const config = require("../../config");

module.exports = {
   isLogin: async (req, res, next) => {
      try {
         // Catch token from request header
         const token = req.headers.authorization.split(" ")[1];

         if (token) {
            const verify = jwt.verify(token, config.jwtKey);

            if (verify) next();
         }
      } catch (error) {
         if (error.name == "TokenExpiredError") {
            res.status(440).send({
               status: 440,
               payload: null,
               message: "Session expired. Please login again",
               errorDetail: error,
            });
         } else if (error.name == "JsonWebTokenError") {
            res.status(401).send({
               status: 401,
               payload: null,
               message: "There is an error in JWT",
               errorDetail: error,
            });
         } else {
            res.status(401).send({
               status: 401,
               payload: null,
               message: "Unauthorized access to resources",
               errorDetail: error,
            });
         }

         next(error);
      }
   },
};
