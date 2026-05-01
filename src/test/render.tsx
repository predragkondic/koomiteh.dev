import type { ReactElement } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderResult } from '@testing-library/react';
import { interviewApi } from '@/api/interviewApi';

export function makeStore() {
  const store = configureStore({
    reducer: {
      [interviewApi.reducerPath]: interviewApi.reducer,
    },
    middleware: (getDefault) => getDefault().concat(interviewApi.middleware),
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
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </Provider>,
  );
}
