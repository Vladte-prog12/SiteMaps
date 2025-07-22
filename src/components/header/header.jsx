import React, { useState, useCallback } from "react";
import { AppBar, Toolbar, Button, IconButton, Menu, MenuItem, Drawer, List, ListItem, ListItemText, Divider } from "@mui/material";
import { Language, AccountCircle, Login, Menu as MenuIcon, Close } from "@mui/icons-material";
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { logout, isAuthenticated } from "../../services/authService";
import icon from "../../assets/icon/icon.svg";
import "./header.css";
import { useLocation as useLocationContext } from '../../context/LocationContext';

const Header = () => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { getCurrentLocation } = useLocationContext();

  // Подсветка курсора
  const [highlightStyle, setHighlightStyle] = useState({
    top: "0px",
    left: "0px",
    width: "0px",
    height: "0px",
  });

  const [preciseCursorX, setPreciseCursorX] = useState(0);
  const [preciseCursorY, setPreciseCursorY] = useState(0);

  const handleMenuOpen = (event) => setMenuAnchor(event.currentTarget);
  const handleMenuClose = () => setMenuAnchor(null);
  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate("/login");
  };

  const onMouseMove = useCallback((event) => {
    const toolbar = document.querySelector(".nav_menu");
    const appBar = toolbar ? toolbar.closest('.appbar') : null; // Находим родительский AppBar
    const toolbarElement = appBar ? appBar.querySelector('.MuiToolbar-root') : null; // Находим элемент Toolbar внутри AppBar

    // Проверяем, находится ли курсор над элементом Toolbar
    if (toolbarElement && toolbarElement.contains(event.target)) {
      // Если курсор в области Toolbar (включая nav_menu и padding), убираем подсветку
      setHighlightStyle({
        top: "0px",
        left: "0px",
        width: "0px",
        height: "0px",
      });
      return;
    }

    const factor = 0.97991;
    setPreciseCursorX(event.clientX * factor);
    setPreciseCursorY(event.clientY * factor);

    // Обновляем позицию подсветки без задержек
    requestAnimationFrame(() => {
      setHighlightStyle({
        top: `${event.clientY}px`,
        left: `${event.clientX}px`,
        width: "18rem",
        height: "18rem",
      });
    });
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlightStyle({
      top: "0px",
      left: "0px",
      width: "0px",
      height: "0px",
    });
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
      {/* Подсветка с координатами */}
      <div className="highlight" style={highlightStyle}>
        <div className="coordinates">
          {preciseCursorX.toFixed(6)} <br />
          {preciseCursorY.toFixed(6)}
        </div>
      </div>

      <AppBar position="static" className="appbar">
        <Toolbar className="nav_menu">
          <div className="nav_left">
            <Link to="/" className="named_logo">
              <img src={icon} alt="icon_site" className="icon_image" />
              <span className="logo">QGN</span>
            </Link>
            <h1 className="named_site">Сайт Навигации</h1>
          </div>

          {/* Мобильная кнопка меню */}
          <div className="mobile-menu-button">
            <IconButton 
              color="inherit" 
              aria-label="menu" 
              onClick={toggleMobileMenu}
              className="menu-icon-button"
            >
              <MenuIcon />
            </IconButton>
          </div>

          {/* Десктопное меню */}
          <div className="nav_center desktop-menu">
            <Button 
              color="inherit" 
              component={Link} 
              to="/" 
              className={isActive('/') ? 'active' : ''}
            >
              Главная
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to="/reviews" 
              className={isActive('/reviews') ? 'active' : ''}
            >
              Отзывы
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to="/popular-places" 
              className={isActive('/popular-places') ? 'active' : ''}
            >
              Популярные места
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to="/yandex-map" 
              className={isActive('/yandex-map') ? 'active' : ''}
            >
              Маршрут
            </Button>
            <Button 
              color="inherit" 
              component={Link} 
              to="/contact" 
              className={isActive('/contact') ? 'active' : ''}
            >
              Контакты
            </Button>
          </div>

          <div className="nav_right">
            {/* Кнопка геолокации для десктопа */}
            <IconButton
              color="inherit"
              aria-label="geolocate"
              onClick={getCurrentLocation}
              className="desktop-geolocate-button"
            >
              <LocationOnIcon />
            </IconButton>

            {isAuthenticated() ? (
              <>
                <IconButton
                  color="inherit"
                  aria-label="account"
                  onClick={handleMenuOpen}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={handleMenuClose}
                  className="profile-menu"
                >
                  <MenuItem component={Link} to="/profile" onClick={handleMenuClose}>
                    Профиль
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>Выйти</MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                color="inherit"
                component={Link}
                to="/login"
                startIcon={<Login />}
              >
                Войти
              </Button>
            )}
          </div>
        </Toolbar>
      </AppBar>

      {/* Мобильное меню */}
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={toggleMobileMenu}
        className="mobile-drawer"
      >
        <div className="mobile-drawer-header">
          <IconButton onClick={toggleMobileMenu} className="close-button">
            <Close />
          </IconButton>
        </div>
        <Divider />
        <List className="mobile-menu-list">
          <ListItem 
            button 
            onClick={() => handleNavigation('/')}
            className={isActive('/') ? 'active' : ''}
          >
            <ListItemText primary="Главная" />
          </ListItem>
          <ListItem 
            button 
            onClick={() => handleNavigation('/reviews')}
            className={isActive('/reviews') ? 'active' : ''}
          >
            <ListItemText primary="Отзывы" />
          </ListItem>
          <ListItem 
            button 
            onClick={() => handleNavigation('/popular-places')}
            className={isActive('/popular-places') ? 'active' : ''}
          >
            <ListItemText primary="Популярные места" />
          </ListItem>
          <ListItem 
            button 
            onClick={() => handleNavigation('/yandex-map')}
            className={isActive('/yandex-map') ? 'active' : ''}
          >
            <ListItemText primary="Маршрут" />
          </ListItem>
          <ListItem 
            button 
            onClick={() => handleNavigation('/contact')}
            className={isActive('/contact') ? 'active' : ''}
          >
            <ListItemText primary="Контакты" />
          </ListItem>
          {/* Кнопка определения геолокации в мобильном меню */}
          <ListItem 
            button 
            onClick={() => {
              getCurrentLocation();
              toggleMobileMenu();
            }}
          >
            <ListItemText primary="Определить геолокацию" />
          </ListItem>
        </List>
        <Divider />
        <div className="mobile-auth-section">
          {isAuthenticated() ? (
            <>
              <ListItem 
                button 
                onClick={() => handleNavigation('/profile')}
                className={isActive('/profile') ? 'active' : ''}
              >
                <ListItemText primary="Профиль" />
              </ListItem>
              <ListItem button onClick={handleLogout}>
                <ListItemText primary="Выйти" />
              </ListItem>
            </>
          ) : (
            <ListItem 
              button 
              onClick={() => handleNavigation('/login')}
              className={isActive('/login') ? 'active' : ''}
            >
              <ListItemText primary="Войти" />
            </ListItem>
          )}
        </div>
      </Drawer>
    </header>
  );
};

export default Header;
