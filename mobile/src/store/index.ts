/**
 * store/index.ts
 * The root Redux store configuration.
 *
 * Combines all feature slices into a single root reducer and configures
 * the Redux Toolkit store. This file is the single entry point for
 * store-level setup — slices are added here as they are created.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import taskReducer from './slices/taskSlice';

/**
 * The centrally configured Redux store.
 *
 * Reducer map:
 *  - auth:  Manages user session, authentication state, and sync operations.
 *  - tasks: Manages the task list, filtering, sorting, and CRUD operations.
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    tasks: taskReducer,
  },
});

/**
 * RootState — The inferred type of the entire Redux state tree.
 * Use this type with `useAppSelector` for full type safety.
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * AppDispatch — The inferred dispatch type of the Redux store.
 * Use this type with `useAppDispatch` to enable dispatching async thunks.
 */
export type AppDispatch = typeof store.dispatch;
