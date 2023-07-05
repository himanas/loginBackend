const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateOTP = require("./Service/generateOTP");
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
      console.log("Mail sent successfully");
      console.log(info);
    }
  });
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get("/:email_id_or_username", async (req, res) => {
  try {
    const { email_id_or_username } = req.params;
    console.log(email_id_or_username);
    const [rows, fields] = await connection.execute(
      "SELECT username, email_id FROM users WHERE username = ? OR email_id = ?",
      [email_id_or_username, email_id_or_username]
    );
    if (rows.length !== 1) {
      return res
        .status(400)
        .send({ message: "Username or email does not exist" });
    } else {
      const OTP = generateOTP();
      const expireAt = new Date(Date.now() + 3 * 60000);
      await connection.execute(
        "UPDATE otp_table SET otp = ?, otp_expires_at = ? WHERE username = ?",
        [OTP, expireAt, rows[0].username]
      );
      await sendMail(
        rows[0].email_id,
        "Password reset OTP",
        `OTP for resetting your password is: ${OTP}`
      );
      return res.status(200).send({ message: "OTP sent to email" });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { username, otp, new_password } = req.body;
    const [rows, fields] = await connection.execute(
      "SELECT username, otp, otp_expires_at FROM otp_table WHERE otp = ? AND username = ?",
      [otp, username]
    );

    if (rows.length === 1) {
      const otpRecord = rows[0];
      const currentTime = new Date();

      // Check if the OTP has expired
      if (otpRecord.otp_expires_at && otpRecord.otp_expires_at > currentTime) {
        const saltRounds = 5;
        const salt = bcrypt.genSaltSync(saltRounds);
        const hashedPassword = bcrypt.hashSync(new_password, salt);

        await connection.execute(
          "UPDATE users SET password = ? WHERE username = ?",
          [hashedPassword, username]
        );

        await connection.execute(
          "UPDATE otp_table SET otp = ?, otp_expires_at = ? WHERE username = ?",
          [null, null, username]
        );

        return res.status(200).send({ message: "Password updated" });
      } else {
        return res.status(400).send({ error: "OTP has expired" });
      }
    }
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }
});

module.exports = router;
