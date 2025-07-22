import React from "react";
import { motion } from 'framer-motion';
import './examples.css';

const Examples = () => {
  const examples = [
    {
      title: "🔒 Безопасное городское движение",
      description: "Планирование маршрута с учетом данных о пробках, авариях и безопасных пересечениях для максимальной защиты."
    },
    {
      title: "⏱️ Экспресс-маршруты",
      description: "Оптимизация времени в пути за счет анализа дорожной ситуации и оперативного реагирования на изменения."
    },
    {
      title: "🚶 Персональная пешеходная навигация",
      description: "Маршруты для пешеходов с учетом удобных переходов, освещенности и пешеходных зон."
    },
    {
      title: "🚴 Интеллектуальные велосипедные маршруты",
      description: "Безопасные и комфортные пути для велосипедистов, учитывающие инфраструктуру и особенности маршрута."
    },
    {
      title: "💡 Персонализированные рекомендации",
      description: "Индивидуальный подбор маршрута с учетом ваших предпочтений: комфорт, экономия и скорость."
    },
    {
      title: "📊 Глубокий анализ маршрутов",
      description: "Детализированные отчеты с аналитикой дорожной ситуации, погодными условиями и вариантами оптимизации."
    }
  ];

  return (
    <motion.section 
      className="examples"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <h3>Примеры использования</h3>
      <div className="example-cards">
        {examples.map((example, index) => (
          <motion.div 
            key={index} 
            className="example-card"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="example-icon">{}🚗</div>
            <h3>{example.title}</h3>
            <p>{example.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default Examples;
