const express = require("express");
const db = require("../db");

const router = express.Router();

// Получение всех городов
router.get("/", async (req, res) => {
  try {
    const [cities] = await db.query("SELECT * FROM cities ORDER BY name");
    res.status(200).json(cities);
  } catch (err) {
    console.error("Ошибка получения городов:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Проверка существования города и его добавление при необходимости
router.post("/check-and-add", async (req, res) => {
  const { cityName } = req.body;

  if (!cityName) {
    return res.status(400).json({ message: "Не указано название города" });
  }

  try {
    // Проверяем существование города
    const [existingCities] = await db.query("SELECT * FROM cities WHERE name = ?", [cityName]);

    if (existingCities.length > 0) {
      // Город уже существует, возвращаем его ID
      return res.status(200).json({ 
        id: existingCities[0].id,
        name: existingCities[0].name,
        isNew: false,
        latitude: existingCities[0].latitude,
        longitude: existingCities[0].longitude
      });
    }

    // Город не существует, добавляем его
    const [result] = await db.query("INSERT INTO cities (name) VALUES (?)", [cityName]);
    
    res.status(201).json({ 
      id: result.insertId,
      name: cityName,
      isNew: true,
      latitude: null,
      longitude: null
    });
  } catch (err) {
    console.error("Ошибка при работе с городом:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Обновление координат города
router.put("/update-coordinates/:cityId", async (req, res) => {
  const { cityId } = req.params;
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ message: "Не указаны координаты" });
  }

  try {
    // Проверяем существование города
    const [city] = await db.query("SELECT * FROM cities WHERE id = ?", [cityId]);
    
    if (city.length === 0) {
      return res.status(404).json({ message: "Город не найден" });
    }

    // Обновляем координаты
    await db.query(
      "UPDATE cities SET latitude = ?, longitude = ? WHERE id = ?",
      [latitude, longitude, cityId]
    );

    // Получаем обновленный город
    const [updatedCity] = await db.query("SELECT * FROM cities WHERE id = ?", [cityId]);

    res.status(200).json({ 
      message: "Координаты обновлены",
      city: updatedCity[0]
    });
  } catch (err) {
    console.error("Ошибка обновления координат:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

// Получение города по ID
router.get("/:id", async (req, res) => {
  try {
    const [cities] = await db.query("SELECT * FROM cities WHERE id = ?", [req.params.id]);
    if (cities.length === 0) {
      return res.status(404).json({ message: "Город не найден" });
    }
    res.status(200).json(cities[0]);
  } catch (err) {
    console.error("Ошибка получения города:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;
