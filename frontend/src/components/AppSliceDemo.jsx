import { useDispatch, useSelector } from "react-redux";
import {
  addToCart,
  clearCart,
  logout,
  removeFromCart,
  selectCart,
  selectCartItemCount,
  selectCartTotal,
  selectIsLoggedIn,
  selectTheme,
  selectUser,
  setUser,
  toggleTheme,
  updateCartQuantity,
} from "../redux/appSlice";

const AppSliceDemo = () => {
  const dispatch = useDispatch();

  // Sử dụng selectors để lấy data từ store
  const user = useSelector(selectUser);
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const theme = useSelector(selectTheme);
  const cart = useSelector(selectCart);
  const cartTotal = useSelector(selectCartTotal);
  const cartItemCount = useSelector(selectCartItemCount);

  // Sample products
  const sampleProducts = [
    { id: 1, name: "Laptop", price: 999.99 },
    { id: 2, name: "Phone", price: 599.99 },
    { id: 3, name: "Headphones", price: 199.99 },
  ];

  const handleLogin = () => {
    dispatch(
      setUser({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
      })
    );
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleAddToCart = (product) => {
    dispatch(addToCart(product));
  };

  const handleRemoveFromCart = (productId) => {
    dispatch(removeFromCart(productId));
  };

  const handleUpdateQuantity = (id, quantity) => {
    dispatch(updateCartQuantity({ id, quantity }));
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  const containerStyle = {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: theme === "dark" ? "#333" : "#fff",
    color: theme === "dark" ? "#fff" : "#333",
    minHeight: "100vh",
  };

  const buttonStyle = {
    padding: "8px 16px",
    margin: "5px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: theme === "dark" ? "#555" : "#007bff",
    color: "white",
  };

  return (
    <div style={containerStyle}>
      <h1>Redux Toolkit Slice Demo</h1>

      {/* Theme Toggle */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Theme: {theme}</h2>
        <button style={buttonStyle} onClick={handleThemeToggle}>
          Switch to {theme === "light" ? "Dark" : "Light"} Theme
        </button>
      </div>

      {/* User Authentication */}
      <div style={{ marginBottom: "20px" }}>
        <h2>User Authentication</h2>
        {isLoggedIn ? (
          <div>
            <p>
              Welcome, {user?.name}! ({user?.email})
            </p>
            <button style={buttonStyle} onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p>Not logged in</p>
            <button style={buttonStyle} onClick={handleLogin}>
              Login as John Doe
            </button>
          </div>
        )}
      </div>

      {/* Products */}
      <div style={{ marginBottom: "20px" }}>
        <h2>Products</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
          }}
        >
          {sampleProducts.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                borderRadius: "5px",
                backgroundColor: theme === "dark" ? "#444" : "#f9f9f9",
              }}
            >
              <h3>{product.name}</h3>
              <p>${product.price}</p>
              <button
                style={buttonStyle}
                onClick={() => handleAddToCart(product)}
              >
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Shopping Cart */}
      <div>
        <h2>Shopping Cart ({cartItemCount} items)</h2>
        {cart.length === 0 ? (
          <p>Your cart is empty</p>
        ) : (
          <div>
            <div style={{ marginBottom: "15px" }}>
              <strong>Total: ${cartTotal.toFixed(2)}</strong>
              <button
                style={{
                  ...buttonStyle,
                  backgroundColor: "#dc3545",
                  marginLeft: "10px",
                }}
                onClick={handleClearCart}
              >
                Clear Cart
              </button>
            </div>

            {cart.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px",
                  border: "1px solid #ddd",
                  marginBottom: "10px",
                  borderRadius: "5px",
                  backgroundColor: theme === "dark" ? "#444" : "#f9f9f9",
                }}
              >
                <div>
                  <strong>{item.name}</strong> - ${item.price}
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <button
                    style={buttonStyle}
                    onClick={() =>
                      handleUpdateQuantity(item.id, item.quantity - 1)
                    }
                  >
                    -
                  </button>

                  <span>Qty: {item.quantity}</span>

                  <button
                    style={buttonStyle}
                    onClick={() =>
                      handleUpdateQuantity(item.id, item.quantity + 1)
                    }
                  >
                    +
                  </button>

                  <button
                    style={{ ...buttonStyle, backgroundColor: "#dc3545" }}
                    onClick={() => handleRemoveFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppSliceDemo;
