const express = require("express");
const db = require("../db");
const categoryController = require("../controllers/categoryController");

const router = express.Router();

// Получение всех категорий
router.get("/", async (req, res) => {
  try {
    const [categories] = await db.query("SELECT * FROM categories ORDER BY name");
    res.status(200).json(categories);
  } catch (err) {
    console.error("Ошибка получения категорий:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Проверка существования категории
router.get("/check", categoryController.checkCategory);

// Получение названия категории по ID
router.get("/get-name", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: "ID категории не указан" });
    }

    console.log('Запрос названия категории для ID:', id);
    const [category] = await db.query("SELECT name FROM categories WHERE id = ?", [id]);
    console.log('Результат запроса:', category);
    if (category.length === 0) {
      console.log('Категория не найдена');
      return res.status(404).json({ message: "Категория не найдена" });
    }
    console.log('Отправляем название категории:', category[0].name);
    res.status(200).json({ name: category[0].name });
  } catch (err) {
    console.error("Ошибка получения названия категории:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Добавление новой категории
router.post("/", categoryController.addCategory);

module.exports = router; 