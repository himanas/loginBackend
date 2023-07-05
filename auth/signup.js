const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();
require("dotenv").config();

let connection;

async function createConnection() {
  connection = await mysql.createConnection({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    database: process.env.SQL_DATABASE,
    password: process.env.SQL_PASSWORD,
  });
}
createConnection();

async function validation(username, email_id) {
  const [rows, fields] = await connection.execute(
    "SELECT username FROM users WHERE username = ? OR email_id = ?",
    [username, email_id]
  );
}

async function insertion(username, name, password, email_id) {
  const [rows, fields] = await connection.execute(
    "INSERT INTO users VALUES (?, ?, ?, ?)",
    [username, email_id, name, password]
  );

  await connection.execute("INSERT INTO otp_table VALUES ( ?, ?, ?,? );", [
    username,
    email_id,
    null,
    null,
  ]);

  await sendMail(
    email_id,
    "Account created",
    `Dear, ${username}, you have successfully created your account`
  );
}

async function sendMail(receiver, subject, text) {
  const transporter = nodemailer.createTransport({
    service: process.env.MAIL_SERVICE,
    auth: {
      user: process.env.NODEMAIL_USER,
      pass: process.env.NODEMAIL_PASS,
    },
  });

  const option = {
    from: process.env.NODEMAIL_USER,
    to: receiver,
    subject: subject,
    text: text,
  };

  transporter.sendMail(option, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log("Message sent successfully");
      console.log(info);
    }
  });
}

router.post("/", async (req, res) => {
  try {
    const { username, name, email_id, password } = req.body;
    if (username === "" || email_id === "" || password === "" || name === "") {
      throw new Error("Please fill all the fields properly!");
    }

    const saltRound = 5;
    const salt = bcrypt.genSaltSync(saltRound);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Validation
    await validation(username, email_id);
    // Insertion
    await insertion(username, name, hashedPassword, email_id);

    res.status(200).send({ message: "Successfully Registered!" });
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: error.message });
  }
});

module.exports = router;
