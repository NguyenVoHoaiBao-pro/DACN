import React, { useState } from 'react';
import './FAQ.css';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';

const AccordionItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="support-accordion">
      <div 
        className="support-accordion-header" 
        onClick={() => setIsOpen(!isOpen)}
      >
        <h4 className="support-question">{question}</h4>
        <KeyboardArrowDownIcon 
          fontSize="small"
          className={`support-accordion-icon ${isOpen ? 'open' : ''}`} 
        />
      </div>
      <div className={`support-accordion-body ${isOpen ? 'open' : ''}`}>
        <p className="support-answer">{answer}</p>
      </div>
    </div>
  );
};

const FAQ = () => {
  const faqs = [
    {
      question: "Thời gian giao hàng mất bao lâu?",
      answer: "Thông thường, thời gian giao hàng tại khu vực nội thành là 1-2 ngày làm việc. Đối với các tỉnh thành khác, thời gian vận chuyển dao động từ 3-5 ngày làm việc tùy thuộc vào đơn vị vận chuyển."
    },
    {
      question: "Chính sách bảo hành như thế nào?",
      answer: "Tất cả sản phẩm chính hãng đều được bảo hành từ 12 đến 24 tháng theo đúng tiêu chuẩn của nhà sản xuất. Bạn có thể mang thiết bị đến bất kỳ cửa hàng Electro Store nào để được hỗ trợ bảo hành."
    },
    {
      question: "Tôi có thể thanh toán bằng hình thức nào?",
      answer: "Chúng tôi hỗ trợ đa dạng phương thức thanh toán: Thanh toán tiền mặt khi nhận hàng (COD), Thẻ tín dụng/ghi nợ, Chuyển khoản ngân hàng và các ví điện tử phổ biến như MoMo, ZaloPay, VNPay."
    }
  ];

  return (
    <div className="support-center">
      
      {/* Header & Search */}
      <div className="support-header">
        <h1>Trung tâm Hỗ trợ</h1>
        <div className="support-search">
          <SearchIcon className="support-search-icon" />
          <input 
            type="text" 
            placeholder="Tìm kiếm câu hỏi..." 
          />
        </div>
      </div>

      {/* Categories */}
      <div className="support-categories-wrapper">
        <div className="support-categories">
          <div className="support-category-card">
            <div className="support-category-icon">
              <LocalShippingOutlinedIcon />
            </div>
            <div className="support-category-title">Đơn hàng</div>
          </div>
          <div className="support-category-card">
            <div className="support-category-icon">
              <Inventory2OutlinedIcon />
            </div>
            <div className="support-category-title">Giao hàng</div>
          </div>
          <div className="support-category-card">
            <div className="support-category-icon">
              <VerifiedUserOutlinedIcon />
            </div>
            <div className="support-category-title">Bảo hành</div>
          </div>
          <div className="support-category-card">
            <div className="support-category-icon">
              <PersonOutlineOutlinedIcon />
            </div>
            <div className="support-category-title">Tài khoản</div>
          </div>
        </div>
      </div>

      {/* FAQ Accordions */}
      <div className="support-faq-section">
        <h2 className="support-faq-title">Câu hỏi thường gặp</h2>
        {faqs.map((faq, index) => (
          <AccordionItem 
            key={index}
            question={faq.question}
            answer={faq.answer}
          />
        ))}
      </div>

      {/* Contact Support */}
      <div className="support-contact">
        <h3>Vẫn cần hỗ trợ thêm?</h3>
        <p>Đội ngũ kỹ thuật của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.</p>
        <button className="btn-contact">
          <SupportAgentIcon fontSize="small" /> Liên hệ hỗ trợ
        </button>
      </div>

    </div>
  );
};

export default FAQ;
