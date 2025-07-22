const express = require("express");
const db = require("../db");
const reviewsService = require("../services/reviewsService");

const router = express.Router();

router.put("/:id", async (req, res) => {
    const userId = req.params.id;
    const { name, email, city, country, avatar_url } = req.body;
  
    try {
      await db.query(
        `UPDATE users 
         SET name = ?, email = ?, city = ?, country = ?, avatar_url = ?
         WHERE user_id = ?`,
        [name, email, city, country, avatar_url, userId]
      );
  
      const [updatedUser] = await db.query(
        `SELECT user_id AS id, name AS username, email, city, country, avatar_url AS avatar
         FROM users
         WHERE user_id = ?`,
        [userId]
      );
  
      res.json(updatedUser[0]);
    } catch (error) {
      console.error("Ошибка обновления профиля:", error);
      res.status(500).json({ error: "Ошибка сервера при обновлении профиля" });
    }
  });
  
router.get("/:id/reviews/count", async (req, res) => {
    const userId = req.params.id;
  
    try {
      const reviewCount = await reviewsService.getUserReviewCount(userId);
      res.json({ reviewCount });
    } catch (error) {
      console.error("Error fetching user review count:", error);
      res.status(500).json({ error: "Server error fetching user review count" });
    }
  });

module.exports = router;
