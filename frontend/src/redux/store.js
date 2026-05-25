import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { apiSlice } from "./apiSlice";
import appReducer from "./appSlice";

export const store = configureStore({
  reducer: {
    // Thêm API slice reducer vào store
    api: apiSlice.reducer,
    // Thêm app slice reducer để quản lý state cục bộ
    app: appReducer,
  },
  // Thêm api middleware để RTK Query hoạt động tốt (caching, invalidation, polling, etc.)
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

// Setup listeners cho việc refetchOnFocus/refetchOnReconnect
setupListeners(store.dispatch);
