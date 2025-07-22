import React from "react";
import { motion } from 'framer-motion';
import './features.css';

const Features = () => {
  const features = [
    {
      title: "⚡ Интеллектуальное планирование",
      description: "Наш алгоритм подбирает оптимальные маршруты на основе реальных данных и анализа ситуации на дорогах."
    },
    {
      title: "🔒 Безопасные маршруты",
      description: "Учитываем зоны повышенного риска и дорожную обстановку для максимально безопасного движения."
    },
    {
      title: "⏱️ Оптимизация времени",
      description: "Сократите время в пути благодаря точному анализу пробок и динамике дорожного движения."
    },
    {
      title: "💡 Персональные рекомендации",
      description: "Настройте маршрут под свои предпочтения: комфорт, быстрота или экономия топлива – выбор за вами."
    },
    {
      title: "📍 Интеграция с геолокацией",
      description: "Автоматически подбираем маршруты, исходя из вашего текущего местоположения."
    },
    {
      title: "📊 Глубокая аналитика",
      description: "Детализированные отчеты по каждому маршруту: от дорожной ситуации до погодных условий."
    }
  ];

  return (
    <motion.section 
      className="features"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="features-container">
        <h3>Ключевые особенности</h3>
        <div className="features-list">
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="feature"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="feature-icon">{}💡</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default Features;
