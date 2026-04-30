import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider as ReduxProvider } from 'react-redux';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { store } from '@/store/store';
import { AppThemeProvider } from '@/theme/ThemeContext';
import { App } from '@/App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <AppThemeProvider>
        <App />
      </AppThemeProvider>
    </ReduxProvider>
  </StrictMode>,
);
