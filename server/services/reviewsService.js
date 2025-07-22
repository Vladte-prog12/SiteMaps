const db = require('../db');

const createReview = async ({ user_id, rating, comment, place_id }) => {
  try {
    // Ваша логика для добавления отзыва в базу данных
    // Пример: await db.execute('INSERT INTO reviews (user_id, rating, comment, place_id) VALUES (?, ?, ?, ?)', [user_id, rating, comment, place_id]);
    console.log("Функция createReview на бэкенде вызвана с данными:", { user_id, rating, comment, place_id });
    // Предполагается, что после успешного добавления отзыва возвращается объект с информацией о новом отзыве или статус успеха
    return { message: "Отзыв успешно добавлен (заглушка бэкенда)" };
  } catch (error) {
    console.error('Ошибка на бэкенде при создании отзыва:', error);
    throw error;
  }
};

const getReviews = async () => {
  try {
    // Ваша логика для получения всех отзывов из базы данных
    // Пример: const [rows] = await db.execute('SELECT * FROM reviews');
    console.log("Функция getReviews на бэкенде вызвана (заглушка)");
    // Предполагается, что возвращается массив объектов отзывов
    return []; // Пустой массив как заглушка
  } catch (error) {
    console.error('Ошибка на бэкенде при получении отзывов:', error);
    throw error;
  }
};

const getUserReviewCount = async (userId) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS review_count FROM reviews WHERE user_id = ?',
      [userId]
    );
    return rows[0].review_count;
  } catch (error) {
    console.error('Error fetching user review count:', error);
    throw error;
  }
};

module.exports = { createReview, getReviews, getUserReviewCount }; 