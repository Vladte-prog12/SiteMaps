const placeService = require('../services/placeService');

const checkPlaceReviews = async (req, res) => {
  console.log('\n=== Бэкенд: Проверка отзывов места ===');
  console.log('Получен запрос:', req.body);

  const { name, address } = req.body;
  if (!name || !address) {
    console.log('Бэкенд: Отсутствуют обязательные поля (name или address)');
    return res.status(400).json({ message: 'Name and address are required' });
  }

  try {
    console.log(`\nБэкенд: Поиск места "${name}" по адресу "${address}"`);
    const reviewInfo = await placeService.getPlaceReviewInfo(name, address);
    
    if (!reviewInfo.found) {
      console.log('Бэкенд: Место не найдено в базе данных');
    } else if (!reviewInfo.hasReviews) {
      console.log(`Бэкенд: Место "${reviewInfo.place.name}" найдено, но нет отзывов`);
    }

    res.status(200).json(reviewInfo);
  } catch (error) {
    console.error('Бэкенд: Ошибка при проверке отзывов:', error);
    res.status(500).json({ message: 'Error checking place reviews', error: error.message });
  }
};

const getUniqueCategories = async (req, res) => {
  try {
    const categories = await placeService.getUniqueCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error('Бэкенд: Ошибка при получении списка категорий:', error);
    res.status(500).json({ message: 'Error getting categories', error: error.message });
  }
};

module.exports = { checkPlaceReviews, getUniqueCategories }; 