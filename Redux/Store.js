import { configureStore } from "@reduxjs/toolkit";
import reducer from "./Slice";

const Store = configureStore({
  reducer: {
    authOperations: reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allow non-serializable values if needed during dev
    }),
});

export default Store;