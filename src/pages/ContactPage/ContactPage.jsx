import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import emailjs from '@emailjs/browser';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Stack,
  IconButton,
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import './contactPage.css';

const ContactPage = () => {
  const form = useRef();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    user_name: '',
    user_email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const { username, email } = JSON.parse(userData);
        setFormData(prev => ({
          ...prev,
          user_name: username || '',
          user_email: email || ''
        }));
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await emailjs.sendForm(
        'SiteMaps',
        'SiteMapsTemp',
        form.current,
        'D7id9LUlyEFGAF548'
      );
      setSuccess(true);
      form.current.reset();
      setFormData({
        user_name: '',
        user_email: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте позже.');
      console.error('Ошибка отправки:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="contact-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="contact-content">
        <motion.div
          className="contact-info"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Typography variant="h4" className="contact-title">
            Свяжитесь с нами
          </Typography>
          <Typography variant="body1" className="contact-description">
            У вас есть вопросы или предложения? Мы будем рады помочь!
          </Typography>

          <div className="info-cards">
            <motion.div
              className="info-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <LocationOnIcon />
              <div>
                <Typography variant="subtitle1">Адрес</Typography>
                <Typography variant="body2">г. Белгород, ул. Технологическая, корпус ГУК 520</Typography>
              </div>
            </motion.div>

            <motion.div
              className="info-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PhoneIcon />
              <div>
                <Typography variant="subtitle1">Телефон</Typography>
                <Typography variant="body2">+7 (999) 123-45-67</Typography>
              </div>
            </motion.div>

            <motion.div
              className="info-card"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <EmailIcon />
              <div>
                <Typography variant="subtitle1">Email</Typography>
                <Typography variant="body2">vlad_teterin_2003@mail.ru</Typography>
              </div>
            </motion.div>
          </div>

          <div className="social-links">
            <motion.a
              href="#"
              className="social-link"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <FacebookIcon />
            </motion.a>
            <motion.a
              href="#"
              className="social-link"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <TwitterIcon />
            </motion.a>
            <motion.a
              href="#"
              className="social-link"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <InstagramIcon />
            </motion.a>
          </div>
        </motion.div>

        <motion.div
          className="contact-form"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Paper elevation={3} className="form-paper">
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Сообщение успешно отправлено! Мы свяжемся с вами в ближайшее время.
              </Alert>
            )}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <form ref={form} onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  name="user_name"
                  placeholder="Ваше имя *"
                  variant="outlined"
                  required
                  fullWidth
                  value={formData.user_name}
                  onChange={handleChange}
                  className="center-placeholder"
                />
                <TextField
                  name="user_email"
                  placeholder="Email *"
                  type="email"
                  variant="outlined"
                  required
                  fullWidth
                  value={formData.user_email}
                  onChange={handleChange}
                  className="center-placeholder"
                />
                <TextField
                  name="subject"
                  placeholder="Тема *"
                  variant="outlined"
                  required
                  fullWidth
                  value={formData.subject}
                  onChange={handleChange}
                  className="center-placeholder"
                />
                <TextField
                  name="message"
                  placeholder="Сообщение *"
                  variant="outlined"
                  multiline
                  rows={4}
                  required
                  fullWidth
                  value={formData.message}
                  onChange={handleChange}
                  className="center-placeholder"
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  className="submit-button"
                >
                  {loading ? 'Отправка...' : 'Отправить сообщение'}
                </Button>
              </Stack>
            </form>
          </Paper>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ContactPage; 