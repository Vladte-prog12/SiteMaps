import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../../services/authService";
import { getUserReviewCount } from "../../services/reviewsService";
import { motion } from "framer-motion";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import RouteIcon from '@mui/icons-material/Route';
import "./profile.css";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [reviewCount, setReviewCount] = useState(0);
  const navigate = useNavigate();

  const stats = {
    favorites: 8,
    routes: 5,
    rating: 4.8
  };

  useEffect(() => {
    const fetchedUser = getCurrentUser(); 
    if (!fetchedUser) {
      navigate("/login"); 
    } else {
      setUser(fetchedUser);
      // Fetch review count for the user
      getUserReviewCount(fetchedUser.id)
        .then(count => setReviewCount(count))
        .catch(error => console.error("Error fetching user review count:", error));
    }
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  if (!user) {
    return (
      <div className="profile-loading">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 360]
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
          className="loading-circle"
        />
      </div>
    );
  }

  return (
    <motion.div 
      className="profile-page"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="profile-container">
        <motion.div className="profile-header" variants={itemVariants}>
          <div className="profile-avatar">
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">
                {user.username ? user.username[0].toUpperCase() : "U"}
              </div>
            )}
          </div>
          <div className="profile-title">
            <h1>{user.username}</h1>
            <p className="profile-status">Активный пользователь</p>
          </div>
        </motion.div>

        <div className="profile-content">
          <motion.div className="profile-section info-section" variants={itemVariants}>
            <h2>Личная информация</h2>
            <div className="info-grid">
              <div className="info-item">
                <PersonIcon />
                <div>
                  <h3>Имя</h3>
                  <p>{user.username}</p>
                </div>
              </div>
              <div className="info-item">
                <EmailIcon />
                <div>
                  <h3>Email</h3>
                  <p>{user.email}</p>
                </div>
              </div>
              <div className="info-item">
                <LocationOnIcon />
                <div>
                  <h3>Локация</h3>
                  <p>{user.city}, {user.country}</p>
                </div>
              </div>
            </div>
            <motion.button
              className="edit-button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <EditIcon /> Редактировать профиль
            </motion.button>
          </motion.div>

          <motion.div className="profile-section stats-section" variants={itemVariants}>
            <h2>Статистика</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon reviews">
                  <StarIcon />
                </div>
                <div className="stat-info">
                  <h3>Отзывы</h3>
                  <p>{reviewCount}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon favorites">
                  <FavoriteIcon />
                </div>
                <div className="stat-info">
                  <h3>Избранное</h3>
                  <p>{stats.favorites}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon routes">
                  <RouteIcon />
                </div>
                <div className="stat-info">
                  <h3>Маршруты</h3>
                  <p>{stats.routes}</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon rating">
                  <StarIcon />
                </div>
                <div className="stat-info">
                  <h3>Рейтинг</h3>
                  <p>{stats.rating}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="logout-container" 
            variants={itemVariants}
          >
            <motion.button
              className="logout-button"
              onClick={handleLogout}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogoutIcon /> Выйти из аккаунта
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
