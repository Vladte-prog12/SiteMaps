
const API_URL = "http://localhost:5000/api";

export const getCities = async () => {
  try {
    const response = await fetch(`${API_URL}/cities`);
    if (!response.ok) throw new Error("Ошибка загрузки городов");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getPopularPlaces = async (cityId = null) => {
  try {
    const url = cityId ? `${API_URL}/popular_places?city_id=${cityId}` : `${API_URL}/popular_places`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Ошибка загрузки популярных мест");
    return await response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};
