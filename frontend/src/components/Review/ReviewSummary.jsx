import React from 'react';
import './ReviewStyles.css';
import { FaStar, FaStarHalfAlt, FaRegStar, FaPen } from 'react-icons/fa';

const ReviewSummary = ({ summary, onWriteReview, isAuthenticated }) => {
  const { 
    averageRating = 0, 
    totalReviews = 0, 
    ratingDistribution = {} 
  } = summary || {};

  // Render stars based on rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        stars.push(<FaStar key={i} />);
      } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
        stars.push(<FaStarHalfAlt key={i} />);
      } else {
        stars.push(<FaRegStar key={i} />);
      }
    }
    return stars;
  };

  // Convert distribution to array of 5 for easier mapping (5 to 1 star)
  const distributionArray = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: ratingDistribution[star] || 0,
    percent: totalReviews > 0 ? (ratingDistribution[star] || 0) / totalReviews * 100 : 0
  }));

  return (
    <div className="review-summary-grid">
      <div className="summary-score">
        <span className="score-num">{averageRating?.toFixed(1) || 0}</span>
        <div className="score-stars">
          {renderStars(averageRating || 0)}
        </div>
        <span className="score-total">{totalReviews || 0} nhận xét</span>
      </div>

      <div className="summary-bars">
        {distributionArray.map((item) => (
          <div key={item.star} className="rating-bar-item">
            <span className="bar-label">{item.star} sao</span>
            <div className="bar-container">
              <div 
                className="bar-fill" 
                style={{ width: `${item.percent}%` }}
              ></div>
            </div>
            <span className="bar-percent">{item.count}</span>
          </div>
        ))}
      </div>

      <div className="summary-action">
        <p style={{ fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.5rem', color: '#6b7280' }}>
          Bạn đã dùng sản phẩm này? Hãy chia sẻ cảm nhận với mọi người nhé!
        </p>
        <button className="btn-write-review" onClick={onWriteReview}>
          <FaPen style={{ marginRight: '8px' }} />
          Viết đánh giá
        </button>
        {!isAuthenticated && (
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#ef4444' }}>
            * Vui lòng đăng nhập để gửi nhận xét
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewSummary;
