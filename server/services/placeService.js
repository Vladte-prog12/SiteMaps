const db = require('../db');

// Глобальный массив для хранения уникальных категорий
let uniqueCategories = new Set();

// Helper function for normalization
const normalize = (value, min, max) => {
  if (max - min === 0) return 0; // Avoid division by zero
  return (value - min) / (max - min);
};

const getPlaceReviewInfo = async (name, address) => {
  console.log('\n=== Бэкенд: Получение информации об отзывах места ===');
  console.log('Параметры поиска:', { name, address });

  try {
    // Поиск места в базе данных
    const [places] = await db.query(
      'SELECT * FROM places WHERE name LIKE ? AND address LIKE ?',
      [`%${name}%`, `%${address}%`]
    );

    console.log('Бэкенд: Найдены потенциальные места:', places);

    if (places.length === 0) {
      console.log('Бэкенд: Место не найдено в базе данных');
      return { found: false };
    }

    const place = places[0];
    console.log(`Бэкенд: Выбрано место: ${place.name} (ID: ${place.id})`);

    // Получаем информацию о категории
    const [categoryResult] = await db.query(
      'SELECT name FROM categories WHERE id = ?',
      [place.category_id]
    );
    const categoryName = categoryResult[0]?.name || 'Неизвестная категория';

    // Добавляем категорию в список уникальных категорий
    uniqueCategories.add(categoryName);

    // Получение мин/макс рейтингов и количества отзывов для категории и города
    const [categoryRatings] = await db.query(
      `SELECT 
         p.id,
         p.name,
         p.address,
         CAST(AVG(r.rating) AS DECIMAL(10,2)) as avg_rating,
         COUNT(r.id) as reviews_count
       FROM places p
       LEFT JOIN reviews r ON p.id = r.place_id
       WHERE p.category_id = ? AND p.city_id = ?
       GROUP BY p.id
       HAVING AVG(r.rating) IS NOT NULL
       ORDER BY avg_rating ASC`,
      [place.category_id, place.city_id]
    );

    console.log('\nБэкенд: Все места в категории с рейтингами:');
    categoryRatings.forEach(p => {
      console.log(`- ${p.name} (${p.address}): рейтинг ${parseFloat(p.avg_rating).toFixed(2)}, отзывов: ${p.reviews_count}`);
    });

    if (categoryRatings.length > 0) {
      const minPlace = categoryRatings[0];
      const maxPlace = categoryRatings[categoryRatings.length - 1];
      const minRating = parseFloat(minPlace.avg_rating);
      const maxRating = parseFloat(maxPlace.avg_rating);

      // Находим мин/макс количество отзывов
      const minReviews = Math.min(...categoryRatings.map(p => p.reviews_count));
      const maxReviews = Math.max(...categoryRatings.map(p => p.reviews_count));

      console.log('\nБэкенд: Мин/макс рейтинги в категории:');
      console.log(`- Минимальный рейтинг ${minRating.toFixed(2)} у "${minPlace.name}"`);
      console.log(`- Максимальный рейтинг ${maxRating.toFixed(2)} у "${maxPlace.name}"`);

      console.log('\nБэкенд: Мин/макс количество отзывов в категории:');
      console.log(`- Минимальное количество отзывов: ${minReviews}`);
      console.log(`- Максимальное количество отзывов: ${maxReviews}`);

      // Получение отзывов для места
      const [reviews] = await db.query(
        'SELECT * FROM reviews WHERE place_id = ?',
        [place.id]
      );

      console.log(`\nБэкенд: Найдено отзывов для места: ${reviews.length}`);

      if (reviews.length === 0) {
        console.log('Бэкенд: У места нет отзывов');
        return {
          found: true,
          hasReviews: false,
          place: place
        };
      }

      // Расчет среднего рейтинга
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Расчет нормализованного рейтинга
      const normalizedRating = normalize(averageRating, minRating, maxRating);

      // Расчет нормализованного количества отзывов
      const normalizedReviewsCount = normalize(reviews.length, minReviews, maxReviews);

      console.log(`\nБэкенд: Расчет нормализованного рейтинга:`);
      console.log(`- Текущий рейтинг: ${averageRating.toFixed(2)}`);
      console.log(`- Минимальный рейтинг в категории: ${minRating.toFixed(2)}`);
      console.log(`- Максимальный рейтинг в категории: ${maxRating.toFixed(2)}`);
      console.log(`- Формула: (${averageRating.toFixed(2)} - ${minRating.toFixed(2)}) / (${maxRating.toFixed(2)} - ${minRating.toFixed(2)})`);
      console.log(`- Нормализованный рейтинг: ${normalizedRating.toFixed(4)}`);

      console.log(`\nБэкенд: Расчет нормализованного количества отзывов:`);
      console.log(`- Текущее количество отзывов: ${reviews.length}`);
      console.log(`- Минимальное количество отзывов в категории: ${minReviews}`);
      console.log(`- Максимальное количество отзывов в категории: ${maxReviews}`);
      console.log(`- Формула: (${reviews.length} - ${minReviews}) / (${maxReviews} - ${minReviews})`);
      console.log(`- Нормализованное количество отзывов: ${normalizedReviewsCount.toFixed(4)}`);

      console.log('Бэкенд: Детали отзывов:', reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment?.substring(0, 50) + '...'
      })));

      console.log(`\nБэкенд: Информация о месте "${place.name}":`);
      console.log(`- ID: ${place.id}`);
      console.log(`- Адрес: ${place.address}`);
      console.log(`- Категория: ${categoryName} (ID: ${place.category_id})`);
      console.log(`- Город: ${place.city_id}`);
      console.log(`- Координаты: ${place.latitude}, ${place.longitude}`);

      console.log(`\nБэкенд: Информация об отзывах:`);
      console.log(`- Количество отзывов: ${reviews.length}`);
      console.log(`- Средний рейтинг: ${averageRating.toFixed(2)}`);

      // Логируем текущий список уникальных категорий
      console.log('\nБэкенд: Список уникальных категорий в текущей сессии:');
      console.log(Array.from(uniqueCategories).map((cat, index) => `${index + 1}. ${cat}`).join('\n'));

      return {
        found: true,
        hasReviews: true,
        averageRating: averageRating,
        normalizedRating: normalizedRating,
        reviewsCount: reviews.length,
        normalizedReviewsCount: normalizedReviewsCount,
        place: {
          ...place,
          category_name: categoryName
        },
        minRating: minRating,
        maxRating: maxRating
      };
    }

    return {
      found: true,
      hasReviews: false,
      place: place
    };

  } catch (error) {
    console.error('Бэкенд: Ошибка при получении информации об отзывах:', error);
    throw error;
  }
};

const getUniqueCategories = () => {
  return Array.from(uniqueCategories);
};

module.exports = {
  getPlaceReviewInfo,
  getUniqueCategories
}; 