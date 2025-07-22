import React from 'react';
import './footer.css'; 
import vkIcon from '../../assets/icon/vk.svg';
import instIcon from '../../assets/icon/inst.svg';
import telegramIcon from '../../assets/icon/telegram.svg';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* О компании */}
        <div className="footer-section">
          <h3>О компании</h3>
          <nav className="footer-nav">
            <a href="#">О нас</a>
            <a href="#">Карьера</a>
            <a href="#">Блог</a>
            <a href="#">Контакты</a>
          </nav>
        </div>

        {/* Ресурсы */}
        <div className="footer-section">
          <h3>Ресурсы</h3>
          <nav className="footer-nav">
            <a href="#">Центр поддержки</a>
            <a href="#">Политика конфиденциальности</a>
            <a href="#">Условия использования</a>
          </nav>
        </div>

        {/* Соцсети */}
        <div className="footer-section">
          <h3>Мы в соцсетях</h3>
          <div className="footer-socials">
            <a href="#" target="_blank">
              <img src={vkIcon} alt="VK" />
            </a>
            <a href="#" target="_blank">
              <img src={instIcon} alt="Instagram" />
            </a>
            <a href="#" target="_blank">
              <img src={telegramIcon} alt="Telegram" />
            </a>
          </div>
        </div>
      </div>

      {/* Копирайт */}
      <div className="footer-bottom">
        <p>© {currentYear} QGN. Все права защищены.</p>
      </div>
    </footer>
  );
};

export default Footer;
