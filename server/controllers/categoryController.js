const db = require('../db');

const categoryController = {
  // Проверка существования категории
  checkCategory: async (req, res) => {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ message: 'Не указано название категории' });
    }

    try {
      const [categories] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
      
      if (categories.length > 0) {
        return res.status(200).json({
          exists: true,
          categoryId: categories[0].id
        });
      }

      return res.status(200).json({
        exists: false
      });
    } catch (error) {
      console.error('Ошибка при проверке категории:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  },

  // Добавление новой категории
  addCategory: async (req, res) => {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Не указано название категории' });
    }

    try {
      // Проверяем, не существует ли уже такая категория
      const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
      
      if (existing.length > 0) {
        return res.status(200).json(existing[0]);
      }

      // Добавляем новую категорию
      const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
      
      const [newCategory] = await db.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
      
      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error('Ошибка при добавлении категории:', error);
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  }
};

module.exports = categoryController; 