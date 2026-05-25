import React, { useState } from 'react';
import './ReviewStyles.css';
import { FaStar, FaRegStar, FaThumbsUp, FaCheckCircle } from 'react-icons/fa';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { markReviewHelpful } from '../../services/reviewService';
import { toast } from 'react-toastify';

const ReviewItem = ({ review }) => {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);
  const [isHelpfulPressed, setIsHelpfulPressed] = useState(false);

  const {
    id,
    rating,
    title,
    content,
    pros,
    cons,
    isVerifiedPurchase,
    replyContent,
    repliedAt,
    user,
    images,
    createdAt,
    variantName
  } = review;

  const handleHelpful = async () => {
    if (isHelpfulPressed) return;
    try {
      const res = await markReviewHelpful(id);
      if (res.success) {
        setHelpfulCount(prev => prev + 1);
        setIsHelpfulPressed(true);
        toast.success("Cảm ơn bạn đã phản hồi!");
      }
    } catch (err) {
      toast.error("Không thể gửi phản hồi");
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<FaStar key={i} />);
      } else {
        stars.push(<FaRegStar key={i} />);
      }
    }
    return stars;
  };

  return (
    <div className="review-item">
      <div className="review-header">
        <div className="user-info">
          <div className="user-avatar">
            {user?.name?.charAt(0) || user?.username?.charAt(0) || '?'}
          </div>
          <div className="user-details">
            <h4>
              {user?.name || user?.username}
              {isVerifiedPurchase && (
                <span className="verified-badge">
                  <FaCheckCircle /> Đã mua tại cửa hàng
                </span>
              )}
            </h4>
            {variantName && (
              <span className="variant-label" style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '2px' }}>
                Phân loại: {variantName}
              </span>
            )}
            <span className="review-date">
              {dayjs(createdAt).locale('vi').format('DD [tháng] MM, YYYY')}
            </span>
          </div>
        </div>
        <div className="star-rating">
          {renderStars(rating)}
        </div>
      </div>

      <div className="review-body">
        {title && <h3 className="review-title">{title}</h3>}
        <p className="review-content">{content}</p>

        {(pros || cons) && (
          <div className="pros-cons">
            {pros && (
              <div className="pros-box">
                <span className="box-label">Ưu điểm:</span>
                {pros}
              </div>
            )}
            {cons && (
              <div className="cons-box">
                <span className="box-label">Nhược điểm:</span>
                {cons}
              </div>
            )}
          </div>
        )}

        {images && images.length > 0 && (
          <div className="review-images">
            {images.map((img, idx) => (
              <img key={idx} src={img} alt={`Review ${idx}`} className="review-img" />
            ))}
          </div>
        )}
      </div>

      {replyContent && (
        <div className="shop-reply">
          <div className="reply-header">
            <span className="reply-badge">Phản hồi từ Chủ Shop</span>
            <span className="review-date">
              {dayjs(repliedAt).locale('vi').format('DD/MM/YYYY')}
            </span>
          </div>
          <p className="reply-content">{replyContent}</p>
        </div>
      )}

      <div className="review-footer">
        <button 
          className={`btn-helpful ${isHelpfulPressed ? 'active' : ''}`}
          onClick={handleHelpful}
          disabled={isHelpfulPressed}
        >
          <FaThumbsUp />
          {helpfulCount > 0 ? `Hữu ích (${helpfulCount})` : 'Hữu ích'}
        </button>
      </div>
    </div>
  );
};

export default ReviewItem;
