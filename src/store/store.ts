import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { interviewApi } from '@/api/interviewApi';

export const store = configureStore({
  reducer: {
    [interviewApi.reducerPath]: interviewApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(interviewApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
