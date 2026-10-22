require('dotenv').config();
const mysql = require('mysql2/promise');

const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;

const db = mysql.createPool({
    host: DB_HOST,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = db;
