const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./db"); // Подключаем БД

dotenv.config(); // Загружаем переменные окружения

const app = express();
app.use(cors()); // Разрешаем запросы с фронта
app.use(express.json()); // Позволяет работать с JSON

const PORT = process.env.PORT || 5000;

// Импортируем маршруты
const authRoutes = require("./routes/auth");
const popularPlacesRoutes = require("./routes/popularPlaces");
const citiesRouter = require("./routes/cities");
const reviewsRoute = require("./routes/reviews");
const placesRouter = require('./routes/places');
const categoriesRouter = require('./routes/categories');

app.use(express.json());

// Основные маршруты
app.use("/auth", authRoutes);
app.use("/api/popular_places", popularPlacesRoutes);
app.use("/api/cities", citiesRouter);
app.use("/api/reviews", reviewsRoute);
app.use('/api/places', placesRouter);
app.use('/api/categories', categoriesRouter);

// 🚀 Запускаем сервер
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
