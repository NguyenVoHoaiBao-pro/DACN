import React, { useState } from 'react';
import './Terms.css';

const Terms = () => {
  const [activeTab, setActiveTab] = useState('bao-mat');

  const handleScrollToSection = (e, id) => {
    e.preventDefault();
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
      });
    }
  }

  return (
    <div className="terms-page">
      <div className="terms-header">
        <h1>Điều Khoản & Chính Sách</h1>
        <p>Electro Store cam kết bảo vệ quyền lợi của khách hàng bằng những chính sách minh bạch, rõ ràng và tuân thủ tuyệt đối quy định pháp luật.</p>
      </div>

      <div className="terms-container">
        {/* Sidebar */}
        <aside className="terms-sidebar">
          <a href="#bao-mat" className={`terms-nav-item ${activeTab === 'bao-mat' ? 'active' : ''}`} onClick={(e) => handleScrollToSection(e, 'bao-mat')}>
            Chính sách bảo mật
          </a>
          <a href="#doi-tra" className={`terms-nav-item ${activeTab === 'doi-tra' ? 'active' : ''}`} onClick={(e) => handleScrollToSection(e, 'doi-tra')}>
            Chính sách đổi trả
          </a>
          <a href="#bao-hanh" className={`terms-nav-item ${activeTab === 'bao-hanh' ? 'active' : ''}`} onClick={(e) => handleScrollToSection(e, 'bao-hanh')}>
            Chính sách bảo hành
          </a>
          <a href="#van-chuyen" className={`terms-nav-item ${activeTab === 'van-chuyen' ? 'active' : ''}`} onClick={(e) => handleScrollToSection(e, 'van-chuyen')}>
            Chính sách vận chuyển
          </a>
        </aside>

        {/* Content */}
        <main className="terms-content">
          <section id="bao-mat" className="terms-section">
            <h2>Chính sách bảo mật thông tin</h2>
            <p>Sự riêng tư của bạn là ưu tiên hàng đầu tại Electro Store. Chúng tôi cam kết bảo vệ thông tin cá nhân của bạn một cách an toàn tuyệt đối.</p>
            
            <h3>1. Mục đích thu thập thông tin</h3>
            <p>Chúng tôi chỉ thu thập thông tin của bạn khi bạn tạo tài khoản, đặt hàng hoặc đăng ký nhận bản tin. Mục đích chính là:</p>
            <ul>
              <li>Xử lý đơn hàng và giao hàng nhanh chóng.</li>
              <li>Cung cấp dịch vụ hỗ trợ kỹ thuật và hậu mãi.</li>
              <li>Gửi thông báo về các chương trình khuyến mãi (chỉ khi có sự đồng ý của bạn).</li>
            </ul>

            <h3>2. Cam kết bảo mật</h3>
            <p>Electro Store tuyệt đối không mua bán, trao đổi thông tin khách hàng cho bên thứ ba vì mục đích thương mại. Mọi giao dịch thanh toán đều được mã hóa theo tiêu chuẩn SSL quốc tế.</p>
          </section>

          <section id="doi-tra" className="terms-section">
            <h2>Chính sách đổi trả sản phẩm</h2>
            <p>Khách hàng có quyền an tâm mua sắm với chính sách đổi trả minh bạch, đảm bảo tối đa quyền lợi khi gặp sự cố ngoài ý muốn.</p>

            <h3>1. Điều kiện áp dụng</h3>
            <ul>
              <li>Sản phẩm mắc lỗi kỹ thuật từ nhà sản xuất (như lỗi phần cứng, bo mạch).</li>
              <li>Sản phẩm chưa qua sử dụng, còn nguyên tem mác, hộp và đầy đủ phụ kiện đi kèm.</li>
              <li>Thời gian yêu cầu đổi trả không quá 30 ngày kể từ ngày nhận hàng.</li>
            </ul>

            <h3>2. Trường hợp từ chối đổi trả</h3>
            <p>Chúng tôi không chấp nhận đổi trả đối với các trường hợp: Rơi vỡ, cấn móp do quá trình sử dụng; sản phẩm bị vào nước (trừ thiết bị có chuẩn chống nước); hoặc khách hàng tự ý thay đổi phần mềm hệ điều hành (Root/Jailbreak).</p>
          </section>

          <section id="bao-hanh" className="terms-section">
            <h2>Chính sách bảo hành</h2>
            
            <h3>1. Thời gian bảo hành</h3>
            <p>Tất cả sản phẩm điện tử, công nghệ mua tại Electro Store đều được hưởng chế độ bảo hành chính hãng từ 12 đến 24 tháng tùy từng danh mục. Riêng phụ kiện (cáp, sạc, ốp lưng) bảo hành từ 3-6 tháng.</p>

            <h3>2. Quy trình tiếp nhận</h3>
            <p>Khách hàng có thể mang thiết bị đến bất kỳ showroom nào thuộc hệ thống Electro Store toàn quốc. Nhân viên kỹ thuật sẽ tiếp nhận, kiểm tra và phản hồi tình trạng trong vòng 24 giờ. Trường hợp cần gửi về hãng, thời gian xử lý tối đa là 15 ngày làm việc.</p>
          </section>

          <section id="van-chuyen" className="terms-section">
            <h2>Chính sách vận chuyển</h2>
            
            <h3>1. Phí giao hàng</h3>
            <p>Miễn phí giao hàng (Freeship) cho toàn bộ đơn hàng có giá trị từ 500.000 VNĐ. Với đơn hàng dưới mức này, phí giao hàng đồng giá 30.000 VNĐ trên toàn quốc.</p>

            <h3>2. Thời gian nhận hàng</h3>
            <ul>
              <li><strong>Nội thành TP.HCM và Hà Nội:</strong> Giao hàng hỏa tốc trong vòng 2 giờ.</li>
              <li><strong>Các tỉnh thành phố lớn:</strong> Từ 1 đến 2 ngày làm việc.</li>
              <li><strong>Vùng sâu vùng xa:</strong> Từ 3 đến 5 ngày làm việc.</li>
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Terms;
