const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const methodOverride = require("method-override");
const app = express();

// Router Import
const categoryRouter = require("./app/category/router");
const paymentRouter = require("./app/payment/router");
const productRouter = require("./app/product/router");
const userRouter = require("./app/user/router");
const addressRouter = require("./app/address/router");
const voucherRouter = require("./app/voucher/router");

const apiVer = "/api/v1";

app.use(cors());
app.use(methodOverride("_method"));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use;

app.use(`${apiVer}/category`, categoryRouter);
app.use(`${apiVer}/payment`, paymentRouter);
app.use(`${apiVer}/product`, productRouter);
app.use(`${apiVer}/user`, userRouter);
app.use(`${apiVer}/address`, addressRouter);
app.use(`${apiVer}/voucher`, voucherRouter);

app.use((req, res, next) => {
   res.status(404).send({
      status: 404,
      message: `Failed to handle request`,
   });
});

module.exports = app;
