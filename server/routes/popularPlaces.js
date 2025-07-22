const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { city_id } = req.query; 
    
    let query = `
      SELECT 
        pp.id AS popular_place_id,
        p.id AS place_id,
        p.name AS place_name,
        p.address,
        c.id AS city_id,
        c.name AS city_name,
        pp.avg_rating,
        pp.review_count
      FROM popular_places pp
      JOIN places p ON pp.place_id = p.id
      JOIN cities c ON p.city_id = c.id
    `;

    const queryParams = [];

    if (city_id) {
      query += ` WHERE c.id = ?`;
      queryParams.push(city_id);
    }

    query += ` ORDER BY pp.avg_rating DESC`; 

    const [results] = await db.query(query, queryParams);
    res.json(results);
  } catch (error) {
    console.error("Ошибка получения популярных мест:", error);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

module.exports = router;
