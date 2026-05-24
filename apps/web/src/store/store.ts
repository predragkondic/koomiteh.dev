import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { postApi } from '@/api/postApi';
import { authApi } from '@/api/authApi';
import { favoritesApi } from '@/api/favoritesApi';
import { adminApi } from '@/api/adminApi';
import { usersApi } from '@/api/usersApi';
import { commentsApi } from '@/api/commentsApi';

export const store = configureStore({
  reducer: {
    [postApi.reducerPath]: postApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [favoritesApi.reducerPath]: favoritesApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
    [commentsApi.reducerPath]: commentsApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(
      postApi.middleware,
      authApi.middleware,
      favoritesApi.middleware,
      adminApi.middleware,
      usersApi.middleware,
      commentsApi.middleware,
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
