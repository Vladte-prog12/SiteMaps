const API_URL = "http://localhost:5000/auth";

export const register = async (userData) => {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка регистрации");
  return data;
};

export const login = async (credentials) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Ошибка входа");

  // Сохраняем токен и пользователя
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));

  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getCurrentUser = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return null;
  
  // Преобразуем user_id → id (если нужно)
  return {
    ...user,
    id: user.id || user.user_id // поддерживаем оба варианта
  };
};


export const isAuthenticated = () => {
  return !!localStorage.getItem("token");
};
