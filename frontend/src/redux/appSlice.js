import { createSlice } from "@reduxjs/toolkit";

// Khôi phục auth state từ localStorage (giữ đăng nhập khi reload trang)
const persistedUser = (() => {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
})();
const persistedToken = localStorage.getItem("token");

// Ví dụ về một slice thông thường (không phải API slice)
const initialState = {
  user: persistedUser,
  theme: "light",
  cart: [],
  wishlist: [],
  isLoggedIn: !!persistedToken && !!persistedUser,
};

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    // Action để set user info
    setUser: (state, action) => {
      state.user = action.payload;
      state.isLoggedIn = !!action.payload;
    },

    // Action để logout
    logout: (state) => {
      state.user = null;
      state.isLoggedIn = false;
      state.cart = [];
    },

    // Action để thay đổi theme
    toggleTheme: (state) => {
      state.theme = state.theme === "light" ? "dark" : "light";
    },

    loginSuccess: (state, action) => {
      state.isLoggedIn = true;
      state.user = action.payload;
    },

    // Actions để quản lý cart
    addToCart: (state, action) => {
      const item = action.payload;
      const existingItem = state.cart.find(
        (cartItem) => cartItem.id === item.id,
      );

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.cart.push({ ...item, quantity: 1 });
      }
    },

    removeFromCart: (state, action) => {
      const itemId = action.payload;
      state.cart = state.cart.filter((item) => item.id !== itemId);
    },

    updateCartQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.cart.find((cartItem) => cartItem.id === id);

      if (item) {
        if (quantity <= 0) {
          state.cart = state.cart.filter((cartItem) => cartItem.id !== id);
        } else {
          item.quantity = quantity;
        }
      }
    },

    clearCart: (state) => {
      state.cart = [];
    },

    // Set toàn bộ cart từ API response (dùng khi fetch/sync cart từ backend)
    setCart: (state, action) => {
      state.cart = action.payload;
    },

    addToWishlist: (state, action) => {
      const productToAdd = action.payload;
      const existingItem = state.wishlist.find(
        (item) => item.id === productToAdd.id,
      );

      if (!existingItem) {
        state.wishlist.push(productToAdd);
      }
    },

    removeFromWishlist: (state, action) => {
      const idToRemove = action.payload;
      state.wishlist = state.wishlist.filter((item) => item.id !== idToRemove);
    },
  },
});

// Export action creators
export const {
  setUser,
  logout,
  toggleTheme,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  clearCart,
  setCart,
  addToWishlist,
  removeFromWishlist,
  loginSuccess,
} = appSlice.actions;

// Selector functions
export const selectUser = (state) => state.app.user;
export const selectIsLoggedIn = (state) => state.app.isLoggedIn;
export const selectTheme = (state) => state.app.theme;
export const selectCart = (state) => state.app.cart;
export const selectCartTotal = (state) =>
  state.app.cart.reduce((total, item) => {
    // API format: item.unitPrice * item.quantity hoặc item.subtotal
    // Guest format: item.price * item.quantity
    const price = item.unitPrice ?? item.price ?? 0;
    return total + price * (item.quantity || 0);
  }, 0);
export const selectCartItemCount = (state) =>
  state.app.cart.reduce((count, item) => count + (item.quantity || 0), 0);
export const selectWishlist = (state) => state.app.wishlist;
export const selectWishlistCount = (state) => state.app.wishlist.length;
export default appSlice.reducer;
