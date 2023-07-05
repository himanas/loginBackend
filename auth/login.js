const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
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

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!(username && password)) {
      return res
        .status(400)
        .send({ message: "Please fill all the required fields!" });
    }

    const [rows, fields] = await connection.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (rows.length !== 0) {
      const user = rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        const secretKey = process.env.SECRET_JWT;
        const token = jwt.sign({ username }, secretKey, { expiresIn: "20m" });

        res.status(200).send({
          message: `Successfully logged in as ${username}`,
          token: token,
        });
      } else {
        return res.status(400).send({ error: "Invalid Password!!!" });
      }
    } else {
      res.status(400).send({ error: `Username/email is Invalid!` });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).send({ error: error.message });
  }
});

module.exports = router;
