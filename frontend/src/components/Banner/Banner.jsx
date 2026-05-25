import { useEffect, useState } from "react";
import "./Banner.css";

const slides = [
  {
    id: 1,
    kicker: "GIẢM ĐẾN 4.000.000Đ",
    title: "Hàng Chọn Lọc\nLaptop &\nPC Hoặc\nĐiện Thoại",
    desc: "Số lượng có hạn. Áp dụng ngay",
    cta: "Mua Ngay",
    image:
      "https://cdn.tgdd.vn/Files/2016/10/27/905695/imac-macbook_800x450.jpg",
  },
  {
    id: 2,
    kicker: "CƠ HỘI CÓ 1 KHÔNG 2",
    title: "Nâng Cấp\nGóc Làm Việc\nNgay Hôm Nay",
    desc: "Miễn phí vận chuyển tận nơi 100%",
    cta: "Khám Phá",
    image:
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?q=80&w=2000&auto=format&fit=crop",
  },
];

const Banner = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const go = (dir) => {
    setIndex((prev) => {
      if (dir === "prev") return (prev - 1 + slides.length) % slides.length;
      return (prev + 1) % slides.length;
    });
  };

  return (
    <section className="banner">
      <div className="banner-container">
        {/* LEFT: Carousel */}
        <div className="banner-carousel">
          {slides.map((s, i) => (
            <div
              key={s.id}
              className={`banner-slide ${i === index ? "active" : ""}`}
            >
              <div className="slide-image-wrap">
                <img className="slide-image" src={s.image} alt="slide" />
                <div className="slide-overlay" />
              </div>
              <div className="slide-text">
                <div className="slide-kicker">{s.kicker}</div>
                <h2 className="slide-title">
                  {s.title.split("\n").map((line, idx) => (
                    <span key={idx}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <div className="slide-desc">{s.desc}</div>
                <button className="cta-btn">{s.cta}</button>
              </div>
            </div>
          ))}
          <div className="carousel-nav">
            <button className="nav-btn" onClick={() => go("prev")}>
              ‹
            </button>
            <button className="nav-btn" onClick={() => go("next")}>
              ›
            </button>
          </div>
        </div>

        {/* RIGHT: Ad */}
        <aside className="banner-ad">
          <img
            className="ad-image"
            alt="ad"
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"
          />
          <div className="ad-overlay" />
          <div className="ad-tag">Deal Độc Quyền</div>
          <div className="ad-content">
            <div style={{ opacity: 0.85, fontSize: 14 }}>Máy Tính Bảng</div>
            <h3 className="ad-title">Apple iPad Mini 6</h3>
            <div className="ad-price">
              <s style={{ opacity: 0.6, marginRight: 8 }}>14.990.000đ</s>
              <strong>12.490.000đ</strong>
            </div>
            <button className="ad-btn">
              <span>🛒</span> Thêm Giỏ Hàng
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Banner;
