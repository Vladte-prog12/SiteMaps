const API_URL = 'http://localhost:5000/api/places';

export const createPlaceFromSuggestion = async (suggestion, options) => {
  const payload = {
    name: suggestion.name,               
    address: suggestion.address_name,   
    city_id: options.city_id || 1,         
    category_name: options.category_name,  
  };

  console.log('Payload для создания места:', payload);

  const response = await fetch(`${API_URL}/from-suggestion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Ошибка при создании места');
  }

  const data = await response.json();
  console.log('Ответ от сервера о заведении:', data);

  return data;
};

export const getCategoryById = async (categoryId) => {
  try {
    const response = await fetch(`${API_URL}/places/category/${categoryId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch category');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching category:', error);
    throw error;
  }
};
