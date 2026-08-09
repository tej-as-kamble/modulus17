/**
 * store/hooks.ts
 * Typed Redux hooks for use throughout the application.
 *
 * Rather than importing `useDispatch` and `useSelector` directly from
 * `react-redux`, components should use these pre-typed versions to benefit
 * from full TypeScript inference on the RootState and AppDispatch types.
 *
 * Usage:
 *   import { useAppDispatch, useAppSelector } from '../store/hooks';
 *
 *   const dispatch = useAppDispatch();
 *   const user = useAppSelector(state => state.auth.user);
 */

import {useDispatch, useSelector} from 'react-redux';
import type {AppDispatch, RootState} from './index';

/**
 * useAppDispatch
 * A pre-typed wrapper around `useDispatch` that correctly types the dispatch
 * function to accept async thunks (created with `createAsyncThunk`).
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * useAppSelector
 * A pre-typed wrapper around `useSelector` that provides full type inference
 * from the RootState, eliminating the need to manually annotate selector types.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
