import React from 'react';
import './About.css';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';

const About = () => {
  return (
    <div className="about-page-light">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-frame" aria-hidden="true" />
        <div className="hero-content">
          <span className="hero-badge">CÂU CHUYỆN CỦA CHÚNG TÔI</span>
          <h1>
            Khám Phá <span className="highlight-text">Electro Store</span>
          </h1>
          <p>
            Mang công nghệ đỉnh cao đến gần hơn với cuộc sống. Chúng tôi không chỉ bán
            thiết bị, chúng tôi kiến tạo hệ sinh thái công nghệ của tương lai.
          </p>
        </div>
      </section>

      <div className="about-container">
        {/* Vision & Mission */}
        <section className="vision-mission-grid">
          <div className="vm-card">
            <div className="icon-wrapper">
              <VisibilityOutlinedIcon fontSize="large" />
            </div>
            <h2>Tầm nhìn</h2>
            <p>
              Trở thành hệ sinh thái công nghệ hàng đầu, nơi mọi giải pháp phần cứng đến phần mềm hội tụ. Chúng tôi khao khát xây dựng một nền tảng mua sắm không giới hạn, định hình xu hướng và tiêu chuẩn công nghệ cho tương lai.
            </p>
          </div>

          <div className="vm-card">
            <div className="icon-wrapper">
              <RocketLaunchOutlinedIcon fontSize="large" />
            </div>
            <h2>Sứ mệnh</h2>
            <p>
              Cung cấp các sản phẩm công nghệ chất lượng cao, minh bạch nguồn gốc với dịch vụ hậu mãi chuẩn mực. Electro Store cam kết đồng hành cùng khách hàng trong hành trình nâng tầm trải nghiệm số, tối ưu hóa cuộc sống bằng công nghệ.
            </p>
          </div>
        </section>

        {/* Reasons to Choose Us */}
        <section className="reasons-section">
          <div className="section-header">
            <h2>Lý do chọn chúng tôi</h2>
            <p>
              Cam kết mang lại giá trị thực và trải nghiệm mua sắm không rủi ro cho mọi
              khách hàng với tiêu chuẩn dịch vụ vượt trội.
            </p>
          </div>
          <div className="reasons-grid">
            <div className="reason-card">
              <div className="icon-wrapper" style={{ width: '60px', height: '60px' }}>
                <LocalShippingOutlinedIcon />
              </div>
              <h3>Giao hàng hỏa tốc</h3>
              <p>
                Nhận hàng trong vòng 2 giờ tại khu vực nội thành, đảm bảo an
                toàn tuyệt đối với quy trình đóng gói tiêu chuẩn cao.
              </p>
            </div>
            <div className="reason-card">
              <div className="icon-wrapper" style={{ width: '60px', height: '60px' }}>
                <VerifiedUserOutlinedIcon />
              </div>
              <h3>Bảo hành 24 tháng</h3>
              <p>
                Cam kết bảo hành chính hãng 1 đổi 1, hỗ trợ kỹ thuật trọn đời
                sản phẩm bởi đội ngũ chuyên gia giàu kinh nghiệm.
              </p>
            </div>
            <div className="reason-card">
              <div className="icon-wrapper" style={{ width: '60px', height: '60px' }}>
                <PaymentsOutlinedIcon />
              </div>
              <h3>Trả góp 0%</h3>
              <p>
                Thủ tục nhanh chóng, xét duyệt online 5 phút, liên kết đa dạng
                ngân hàng mang lại sự linh hoạt tối đa cho tài chính của bạn.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="team-section">
          <div className="section-header">
            <span className="team-subtitle">NĂNG LỰC CỐT LÕI</span>
            <h2>Đội ngũ lãnh đạo</h2>
          </div>
          <div className="team-grid">
            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=600&auto=format&fit=crop" alt="Trần Anh Khoa" />
              </div>
              <h3>Trần Anh Khoa</h3>
              <span className="member-role">Founder & CEO</span>
              <p className="member-desc">
                Tầm nhìn chiến lược và đam mê công nghệ là động lực đưa Electro vươn xa.
              </p>
            </div>
            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=600&auto=format&fit=crop" alt="Nguyễn Lê Vân" />
              </div>
              <h3>Nguyễn Lê Vân</h3>
              <span className="member-role">Chief Technology Officer</span>
              <p className="member-desc">
                Kiến trúc sư trưởng đứng sau hệ thống nền tảng vững chắc của toàn hệ sinh thái.
              </p>
            </div>
            <div className="team-member">
              <div className="member-image">
                <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=600&auto=format&fit=crop" alt="Lê Hoàng Nam" />
              </div>
              <h3>Lê Hoàng Nam</h3>
              <span className="member-role">Head of Product</span>
              <p className="member-desc">
                Tối ưu hóa trải nghiệm người dùng, mang công nghệ phức tạp trở nên đơn giản.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
