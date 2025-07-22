import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.jsx'
import { LocationProvider } from "./context/LocationContext.jsx";
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'JetBrains Mono, sans-serif',
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
    <LocationProvider>
    <App />
      </LocationProvider>
    </ThemeProvider>
  </StrictMode>,
)
