const mysql = require("mysql2");
require("dotenv").config(); // Загружаем переменные из .env

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10, // Максимальное число подключений
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Ошибка подключения к БД:", err);
  } else {
    console.log("✅ Успешное подключение к MySQL");
    connection.release(); // Освобождаем соединение
  }
});

module.exports = pool.promise(); // Используем промисы для удобства
