import React from 'react';
import './Blog.css';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';

const Blog = () => {
  // Dữ liệu mẫu (Mock Data) - Trong thực tế sẽ fetch từ API
  const featuredArticle = {
    title: "Đánh giá chi tiết iPhone 15 Pro Max: Titan nhẹ hơn, Camera mạnh hơn",
    excerpt: "Năm nay Apple mang đến một sự thay đổi lớn về chất liệu, đồng thời nâng cấp camera tele lên 5x. Liệu những điều này có đủ sức thuyết phục người dùng nâng cấp?",
    date: "12 Tháng 10, 2023",
    category: "Đánh Giá",
    image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?q=80&w=1200&auto=format&fit=crop"
  };

  const newsList = [
    {
      id: 1,
      title: "Top 5 Laptop Gaming đáng mua nhất trong tầm giá dưới 25 triệu",
      excerpt: "Năm học mới sắp đến, cùng điểm mặt những cỗ máy chiến game vừa học vừa chơi lý tưởng nhất cho sinh viên.",
      date: "05/10/2023",
      category: "Tư Vấn Mua Sắm",
      image: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 2,
      title: "Mẹo kéo dài tuổi thọ pin điện thoại Android mà bạn chưa biết",
      excerpt: "Những thói quen sạc pin sai lầm có thể giết chết viên pin của bạn. Hãy cùng xem cách tối ưu hóa pin hiệu quả.",
      date: "02/10/2023",
      category: "Thủ Thuật",
      image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 3,
      title: "Chương trình Khuyến mãi: Giảm giá sốc cho toàn bộ Smarthome",
      excerpt: "Cơ hội sở hữu nhà thông minh với mức giá chưa từng có. Xem ngay các deal khủng độc quyền tại Electro Store.",
      date: "28/09/2023",
      category: "Khuyến Mãi",
      image: "https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 4,
      title: "Xu hướng PC build Custom năm 2024: Kính cong và quạt tản nhiệt LCD",
      excerpt: "Case máy tính không chỉ để đựng linh kiện mà còn là góc decor thể hiện cá tính của game thủ.",
      date: "25/09/2023",
      category: "Tin Công Nghệ",
      image: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 5,
      title: "So sánh bàn phím cơ Switch Linear vs Tactile: Nên chọn loại nào?",
      excerpt: "Tiếng lách cách vui tai hay sự im lặng êm ái? Lựa chọn switch bàn phím phụ thuộc vào nhu cầu thực tế của bạn.",
      date: "20/09/2023",
      category: "Đánh Giá",
      image: "https://images.unsplash.com/photo-1595225476474-87563907a212?q=80&w=800&auto=format&fit=crop"
    },
    {
      id: 6,
      title: "Tai nghe chống ồn chủ động (ANC) hoạt động như thế nào?",
      excerpt: "Tìm hiểu công nghệ đằng sau sự im lặng tuyệt đối của những chiếc tai nghe cao cấp hiện nay.",
      date: "15/09/2023",
      category: "Kiến Thức",
      image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop"
    }
  ];

  const popularPosts = [
    { id: 10, title: "Hướng dẫn chọn mua thẻ nhớ cho Camera hành trình" },
    { id: 11, title: "Cảnh báo lừa đảo bán đồ công nghệ giả trên mạng xã hội" },
    { id: 12, title: "Làm thế nào để vệ sinh màn hình Laptop đúng cách?" },
    { id: 13, title: "Top 3 màn hình đồ họa màu chuẩn nhất cho Designer" },
    { id: 14, title: "Khắc phục lỗi laptop không nhận chuột quang Bluetooth" },
  ];

  return (
    <div className="blog-page">
      <div className="blog-container">
        
        {/* Banner / Tiêu đề trang */}
        <div className="blog-header-title">
          <h1>Tin Tức & <span className="highlight-text">Công Nghệ</span></h1>
          <p>Cập nhật những thông tin công nghệ mới nhất, thủ thuật hữu ích và xu hướng thị trường.</p>
        </div>

        {/* BÀI VIẾT NỔI BẬT (Hero Article) */}
        <section className="hero-article">
          <div className="hero-image-wrapper">
            <img src={featuredArticle.image} alt={featuredArticle.title} />
          </div>
          <div className="hero-content">
            <span className="category-badge hero-cat">{featuredArticle.category}</span>
            <h2>{featuredArticle.title}</h2>
            <p className="hero-excerpt">{featuredArticle.excerpt}</p>
            <div className="hero-meta">
              <span className="post-date">
                <AccessTimeIcon fontSize="small" /> {featuredArticle.date}
              </span>
              <button className="btn-read-more">
                Đọc tiếp <ArrowForwardIcon fontSize="small" />
              </button>
            </div>
          </div>
        </section>

        {/* KHUNG NỘI DUNG CHÍNH (Main Layout 70-30) */}
        <div className="blog-layout">
          
          {/* CỘT TRÁI: LƯỚI BÀI VIẾT (News Grid) */}
          <main className="main-content-area">
            <div className="section-heading">
              <h3>Bài viết mới nhất</h3>
            </div>
            
            <div className="news-grid">
              {newsList.map((post) => (
                <article key={post.id} className="news-card">
                  <div className="news-thumbnail">
                    <img src={post.image} alt={post.title} />
                    <span className="category-badge absolute-badge">{post.category}</span>
                  </div>
                  <div className="news-info">
                    <span className="post-date-small">{post.date}</span>
                    <h4 className="news-title">{post.title}</h4>
                    <p className="news-excerpt">{post.excerpt}</p>
                    <a href={`/blog/${post.id}`} className="link-read-more">Xem chi tiết</a>
                  </div>
                </article>
              ))}
            </div>
            
            <div className="pagination">
              <button className="page-btn active">1</button>
              <button className="page-btn">2</button>
              <button className="page-btn">3</button>
              <span>...</span>
              <button className="page-btn">10</button>
            </div>
          </main>

          {/* CỘT PHẢI: THANH BÊN (Sidebar) */}
          <aside className="sidebar">
            
            {/* Widget Tìm kiếm */}
            <div className="widget search-widget">
              <h4 className="widget-title">Tìm kiếm</h4>
              <div className="search-box">
                <input type="text" placeholder="Nhập từ khóa..." />
                <button aria-label="Tìm kiếm"><SearchIcon /></button>
              </div>
            </div>

            {/* Widget Chuyên mục */}
            <div className="widget categories-widget">
              <h4 className="widget-title">Chuyên mục</h4>
              <ul className="cat-list">
                <li><LocalOfferOutlinedIcon fontSize="small"/> Đánh Giá (24)</li>
                <li><LocalOfferOutlinedIcon fontSize="small"/> Thủ Thuật (15)</li>
                <li><LocalOfferOutlinedIcon fontSize="small"/> Tư Vấn Mua Sắm (42)</li>
                <li><LocalOfferOutlinedIcon fontSize="small"/> Khuyến Mãi (8)</li>
                <li><LocalOfferOutlinedIcon fontSize="small"/> Tin Công Nghệ (56)</li>
              </ul>
            </div>

            {/* Widget Top Bài viết */}
            <div className="widget popular-widget">
              <h4 className="widget-title">Xem nhiều nhất</h4>
              <ul className="popular-list">
                {popularPosts.map((post, index) => (
                  <li key={post.id}>
                    <span className="rank-number">{index + 1}</span>
                    <a href={`/blog/${post.id}`}>{post.title}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Widget Banner Quảng cáo */}
            <div className="widget banner-widget">
              <div className="promo-banner">
                <h4>Săn Deal Giờ Vàng</h4>
                <p>Giảm đến 50% cho màn hình máy tính</p>
                <button className="btn-promo">Mua Ngay</button>
              </div>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
};

export default Blog;
