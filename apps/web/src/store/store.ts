import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { interviewApi } from '@/api/interviewApi';
import { authApi } from '@/api/authApi';

export const store = configureStore({
  reducer: {
    [interviewApi.reducerPath]: interviewApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(interviewApi.middleware, authApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
