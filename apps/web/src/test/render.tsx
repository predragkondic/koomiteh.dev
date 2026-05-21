import type { ReactElement } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderResult } from '@testing-library/react';
import { interviewApi } from '@/api/interviewApi';
import { authApi } from '@/api/authApi';
import { favoritesApi } from '@/api/favoritesApi';
import { adminApi } from '@/api/adminApi';
import { usersApi } from '@/api/usersApi';
import { ConfirmProvider } from '@/components/ConfirmProvider';

export function makeStore() {
  const store = configureStore({
    reducer: {
      [interviewApi.reducerPath]: interviewApi.reducer,
      [authApi.reducerPath]: authApi.reducer,
      [favoritesApi.reducerPath]: favoritesApi.reducer,
      [adminApi.reducerPath]: adminApi.reducer,
      [usersApi.reducerPath]: usersApi.reducer,
    },
    middleware: (getDefault) =>
      getDefault().concat(
        interviewApi.middleware,
        authApi.middleware,
        favoritesApi.middleware,
        adminApi.middleware,
        usersApi.middleware,
      ),
  });
  setupListeners(store.dispatch);
  return store;
}

interface Options {
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  { initialEntries = ['/'] }: Options = {},
): RenderResult {
  return render(
    <Provider store={makeStore()}>
      <ConfirmProvider>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </ConfirmProvider>
    </Provider>,
  );
}
