import React from 'react';
import { Link } from 'react-router-dom';
import { LocationOn, Map, Directions, Star } from '@mui/icons-material';
import './home.css';

const Home = () => {
  return (
    <div className="home-container">
      <section className="hero-section">
        <h1 className="hero-title">Добро пожаловать в QGN</h1>
        <p className="hero-subtitle">
          Ваш надежный помощник в навигации по городу. Откройте для себя новые места,
          найдите лучшие маршруты и поделитесь своими впечатлениями с другими.
        </p>
      </section>

      <section className="features-section">
        <div className="feature-card">
          <LocationOn className="feature-icon" />
          <h2 className="feature-title">Популярные места</h2>
          <p className="feature-description">
            Исследуйте самые интересные и популярные места в вашем городе.
            Откройте для себя новые локации и получите подробную информацию о каждой из них.
          </p>
        </div>

        <div className="feature-card">
          <Map className="feature-icon" />
          <h2 className="feature-title">Интерактивная карта</h2>
          <p className="feature-description">
            Используйте нашу интерактивную карту для удобной навигации.
            Планируйте маршруты и находите оптимальные пути к нужным местам.
          </p>
        </div>

        <div className="feature-card">
          <Directions className="feature-icon" />
          <h2 className="feature-title">Построение маршрутов</h2>
          <p className="feature-description">
            Создавайте и сохраняйте маршруты для своих путешествий.
            Получайте пошаговые инструкции и рекомендации по пути.
          </p>
        </div>

        <div className="feature-card">
          <Star className="feature-icon" />
          <h2 className="feature-title">Отзывы и рейтинги</h2>
          <p className="feature-description">
            Читайте отзывы других пользователей и делитесь своими впечатлениями.
            Получайте актуальную информацию о местах из первых рук.
          </p>
        </div>
      </section>

      <section className="cta-section">
        <h2 className="cta-title">Начните исследовать город прямо сейчас</h2>
        <p className="cta-description">
          Присоединяйтесь к нашему сообществу и откройте для себя новые возможности
          для путешествий и исследований.
        </p>
        <Link to="/popular-places" className="cta-button">
          Начать исследование
        </Link>
      </section>
    </div>
  );
};

export default Home; 