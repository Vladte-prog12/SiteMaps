import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { register } from "../../services/authService";
import './register.css'

const Register = () => {
  const [formData, setFormData] = useState({ name: "", email: "", password: "", city: "", country: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register({
        username: formData.name, 
        email: formData.email,
        password: formData.password,
        city: formData.city,
        country: formData.country
      });
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };
  

  return (
    <div className="auth-container">
      <div className="auth-box">
      <h2>Регистрация</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <label>Имя</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} required />

        <label>Email</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />

        <label>Пароль</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />

        <label>Город</label>
        <input type="text" name="city" value={formData.city} onChange={handleChange} required />

        <label>Страна</label>
        <input type="text" name="country" value={formData.country} onChange={handleChange} required />

        <button type="submit">Зарегистрироваться</button>
      </form>
      <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
    </div>
      </div>
      
  );
};

export default Register;
