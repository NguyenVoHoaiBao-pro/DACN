import { useEffect, useState } from "react";
import { getCategoryTree } from "../../services/masterService";
import "./Navigation.css";

const Navigation = () => {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const data = await getCategoryTree();
        setCategories(data || []);
      } catch (error) {
        console.error("Navigation: Failed to load category tree", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, []);

  const mainMenuItems = [
    { name: "Trang Chủ", path: "/" },
    { name: "Cửa Hàng", path: "/shop" },
    { name: "Khuyến Mãi", path: "/single" },
    {
      name: "Thông Tin",
      path: "/pages",
      hasDropdown: true,
      subItems: [
        { name: "Về Chúng Tôi", path: "/about" },
        { name: "Tra Cứu Bảo Hành", path: "/warranty-check" },
        { name: "Hỏi Đáp", path: "/faq" },
        { name: "Tin Tức", path: "/blog" },
        { name: "Điều Khoản", path: "/terms" },
      ],
    },
    { name: "Liên Hệ", path: "/contact" },
  ];

  return (
    <nav className="navigation">
      <div className="navigation-container">
        {/* All Categories Section (Mega Menu) */}
        <div className="nav-categories">
          <button className="categories-btn">
            <svg
              className="hamburger-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M3 6H17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M3 12H17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M3 18H17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span>Danh Mục Sản Phẩm</span>
            <svg
              className="dropdown-arrow"
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
            >
              <path
                d="M1 1L6 6L11 1"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Hierarchical Categories Dropdown */}
          <div className="categories-dropdown">
            <ul className="categories-list">
              {loading ? (
                <li style={{ padding: '15px', color: '#888' }}>Đang tải danh mục...</li>
              ) : categories.length === 0 ? (
                <li style={{ padding: '15px', color: '#888' }}>Không có danh mục</li>
              ) : (
                categories.map((cat) => (
                  <li key={cat.id} className={`category-item ${cat.subCategories?.length > 0 ? 'has-sub' : ''}`}>
                    <a href={`/shop?category=${cat.id}`}>
                      {cat.name}
                      {cat.subCategories?.length > 0 && (
                        <svg className="sub-arrow" width="6" height="10" viewBox="0 0 6 10">
                          <path d="M1 1L5 5L1 9" stroke="currentColor" fill="none" strokeWidth="1.5" />
                        </svg>
                      )}
                    </a>
                    
                    {/* Render Subcategories (Level 2) */}
                    {cat.subCategories?.length > 0 && (
                      <div className="sub-categories-flyout">
                        <ul className="sub-categories-list">
                          {cat.subCategories.map((sub) => (
                            <li key={sub.id} className="sub-category-item">
                              <a href={`/shop?category=${sub.id}`}>{sub.name}</a>
                              
                              {/* Support Level 3 if exists */}
                              {sub.subCategories?.length > 0 && (
                                <ul className="nested-categories">
                                  {sub.subCategories.map(inner => (
                                    <li key={inner.id}>
                                      <a href={`/shop?category=${inner.id}`}>{inner.name}</a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Main Navigation Menu */}
        <div className="nav-menu">
          <ul className="menu-list">
            {mainMenuItems.map((item, index) => (
              <li
                key={index}
                className={`menu-item ${item.hasDropdown ? "has-dropdown" : ""
                  }`}
              >
                <a
                  href={item.path}
                  className={`menu-link ${currentPath === item.path ? "active" : ""}`}
                >
                  {item.name}
                  {item.hasDropdown && (
                    <svg
                      className="dropdown-arrow"
                      width="10"
                      height="6"
                      viewBox="0 0 10 6"
                      fill="none"
                    >
                      <path
                        d="M1 1L5 5L9 1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </a>

                {/* Sub Menu */}
                {item.hasDropdown && (
                  <ul className="sub-menu">
                    {item.subItems.map((subItem, subIndex) => (
                      <li key={subIndex} className="sub-menu-item">
                        <a href={subItem.path} className="sub-menu-link">
                          {subItem.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div className="nav-contact">
          <div className="contact-info">
            <svg
              className="phone-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M18.3 15.92L16.04 13.66C15.34 12.96 14.22 12.96 13.52 13.66L12.21 14.97C11.96 15.22 11.59 15.3 11.26 15.18C10.25 14.82 8.52 13.69 7.02 12.19C5.52 10.69 4.39 8.96 4.03 7.95C3.91 7.62 3.99 7.25 4.24 7L5.55 5.69C6.25 4.99 6.25 3.87 5.55 3.17L3.29 0.91C2.59 0.21 1.47 0.21 0.77 0.91L0.02 1.66C-0.74 2.42 -1.08 3.49 -0.91 4.56C-0.38 7.56 1.12 11.61 4.41 14.9C7.7 18.19 11.75 19.69 14.75 20.22C15.82 20.39 16.89 20.05 17.65 19.29L18.4 18.54C19.1 17.84 19.1 16.72 18.4 16.02L18.3 15.92Z"
                fill="currentColor"
              />
            </svg>
            <span className="phone-number">1900 1234 5678</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
