// DEMO PRODUCT LIST COMPONENT (for Shop page)
const ProductList = () => {
  return (
    <div
      style={{
        background: "#007bff",
        color: "white",
        padding: "40px 20px",
        textAlign: "center",
        margin: "20px 0",
        borderRadius: "10px",
      }}
    >
      <h2>🛒 PRODUCT LIST COMPONENT</h2>
      <p>Tôi là ProductList - được render từ Shop.jsx</p>
      <p>Tôi KHÁC hoàn toàn với Banner và Features ở Home!</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "15px",
          marginTop: "20px",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              padding: "15px",
              background: "rgba(255,255,255,0.2)",
              borderRadius: "5px",
            }}
          >
            Product {i}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;
