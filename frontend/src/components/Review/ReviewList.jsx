import React, { useState, useEffect, useCallback } from 'react';
import './ReviewStyles.css';
import { getReviewSummary, getProductReviews } from '../../services/reviewService';
import ReviewSummary from './ReviewSummary';
import ReviewItem from './ReviewItem';
import ReviewForm from './ReviewForm';
import { FaCommentAlt, FaSpinner, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { selectIsLoggedIn, selectUser } from '../../redux/appSlice';

const ReviewList = ({ productId }) => {
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [showForm, setShowForm] = useState(false);
  
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsLoggedIn);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, reviewsRes] = await Promise.all([
        getReviewSummary(productId),
        getProductReviews(productId, page, 5)
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (reviewsRes.success) {
        setReviews(reviewsRes.data.content);
        setTotalPages(reviewsRes.data.totalPages);
      }
    } catch (err) {
      console.error("Lỗi khi tải đánh giá:", err);
    } finally {
      setLoading(false);
    }
  }, [productId, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setPage(newPage);
    }
  };

  const onWriteReviewClick = () => {
    if (!isAuthenticated) {
      // In a real app, redirection to login might be better
      alert("Vui lòng đăng nhập để thực hiện chức năng này!");
      return;
    }
    setShowForm(true);
  };

  return (
    <div className="review-section" id="reviews">
      <h2>
        <FaCommentAlt />
        Đánh giá & Nhận xét
      </h2>

      {loading && page === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <FaSpinner className="fa-spin" style={{ fontSize: '2rem', color: '#ff9f1a' }} />
        </div>
      ) : (
        <>
          <ReviewSummary 
            summary={summary} 
            onWriteReview={onWriteReviewClick} 
            isAuthenticated={isAuthenticated}
          />

          <div className="review-list">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '1rem' }}>
                <p style={{ color: '#64748b' }}>Chưa có đánh giá nào cho sản phẩm này.</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                <FaChevronLeft />
              </button>
              
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i}
                  className={`pagination-btn ${page === i ? 'active' : ''}`}
                  onClick={() => handlePageChange(i)}
                >
                  {i + 1}
                </button>
              ))}

              <button 
                className="pagination-btn"
                disabled={page === totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ReviewForm 
          productId={productId} 
          onClose={() => setShowForm(false)} 
          onSuccess={fetchData}
        />
      )}
    </div>
  );
};

export default ReviewList;
