const express = require("express");
const router = express.Router();
const db = require("../db");
const leoProfanity = require('leo-profanity');

leoProfanity.clearList();
leoProfanity.add(leoProfanity.getDictionary('ru')); 
leoProfanity.add(leoProfanity.getDictionary('en'));

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        r.*,
        u.name AS userName,
        p.name AS placeName,
        p.address AS placeAddress,
        c.name AS cityName
      FROM reviews r 
      JOIN users u ON r.user_id = u.user_id
      JOIN places p ON r.place_id = p.id
      JOIN cities c ON p.city_id = c.id
      ORDER BY r.created_at DESC
    `;
    
    const [reviews] = await db.query(query);
    res.status(200).json(reviews);
  } catch (err) {
    console.error("Ошибка получения отзывов:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

router.post("/", async (req, res) => {
  const { user_id, rating, comment, place_id } = req.body;

  if (!user_id || !rating || !place_id) {
    return res.status(400).json({ message: "Обязательные поля не заполнены" });
  }

  if (comment && leoProfanity.check(comment)) {
    return res.status(400).json({ message: "Комментарий содержит запрещённые выражения" });
  }
  

  try {
    await db.query(
      "INSERT INTO reviews (user_id, rating, comment, place_id) VALUES (?, ?, ?, ?)",
      [user_id, rating, comment, place_id]
    );

    const query = `
      SELECT 
        r.*,
        u.name AS userName,
        p.name AS placeName,
        p.address AS placeAddress,
        c.name AS cityName
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      JOIN places p ON r.place_id = p.id
      JOIN cities c ON p.city_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.id DESC
      LIMIT 1
    `;
    const [review] = await db.query(query, [user_id]);

    res.status(201).json({
      id: review[0].id,
      userName: review[0].userName,
      rating: review[0].rating,
      comment: review[0].comment,
      created_at: review[0].created_at,
      placeName: review[0].placeName,
      placeAddress: review[0].placeAddress,
      cityName: review[0].cityName,
    });
  } catch (err) {
    console.error("Ошибка добавления отзыва:", err);
    res.status(500).json({ message: "Ошибка сервера" });
  }
});

module.exports = router;
