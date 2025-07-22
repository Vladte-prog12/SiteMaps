const API_URL = 'http://localhost:5000/api/reviews';
const PROFILE_API_URL = 'http://localhost:5000/api/profile';

export const createReview = async ({ user_id, rating, comment, place_id }) => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, rating, comment, place_id })
  });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Ошибка при отправке отзыва');
  }
  
  const data = await response.json();
  return data;
};

export const getReviews = async () => {
  const response = await fetch(API_URL);
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Ошибка при получении отзывов');
  }
  const data = await response.json();
  return data;
};

export const getUserReviewCount = async (userId) => {
  const response = await fetch(`${PROFILE_API_URL}/${userId}/reviews/count`);
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Ошибка при получении количества отзывов пользователя');
  }
  
  const data = await response.json();
  return data.reviewCount;
};
