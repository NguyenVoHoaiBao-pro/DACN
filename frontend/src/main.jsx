import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import "./index.css";
import { setCart } from "./redux/appSlice";
import { store } from "./redux/store";
import { fetchCart } from "./services/cartService";

const token = localStorage.getItem("token");
if (token) {
  fetchCart()
    .then((cart) => {
      store.dispatch(setCart(cart?.items || []));
    })
    .catch(() => {
      /* 401 = token het han, httpClient da xoa session */
    });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
