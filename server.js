const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const forgotpassword = require("./auth/forgotpassword");
const login = require("./auth/login");
const signup = require("./auth/signup");
const PORT = process.env.PORT || 5001;

const app = express();
app.use(express.json());
app.use(cors());
app.use(cookieParser());

app.use("/login", login);
app.use("/signup", signup);
app.use("/forgotpassword", forgotpassword);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
