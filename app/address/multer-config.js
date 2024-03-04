const multer = require("multer");
const { ROOT_PATH } = require("../../config");
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, `${ROOT_PATH}/public/upload/user`);
   },
   filename: (req, file, cb) => {
      const split = file.originalname.split(".");
      const ext = split[split.length - 1];

      cb(null, `${Date.now()}.${ext}`);
   },
});
const fileFilter = (req, file, callback) => {
   const split = file.originalname.split(".");
   const ext = split[split.length - 1];
   let type = ["jpg", "jpeg", "png"];

   if (!type.includes(ext)) {
      const eRes = {
         status: 409,
         payload: null,
         message: `Uploaded file extension invalid`,
         errorDetail: {
            [file.fieldname]: {
               message: `Only images are allowed, received .${ext}`,
            },
         },
      };
      return callback(new Error(JSON.stringify(eRes)), false);
   }

   callback(null, true);
};
const upload = multer({ storage, fileFilter });

const multerMiddleware = (multerUpload) => {
   return function (req, res, next) {
      multerUpload(req, res, function (err) {
         if (err) {
            const eRes = err.message;
            res.status(409).send(JSON.parse(eRes));

            next(err);
         }
         next();
      });
   };
};

module.exports = { upload, multerMiddleware };
