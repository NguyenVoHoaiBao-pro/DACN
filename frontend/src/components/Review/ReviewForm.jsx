import React, { useState, useEffect } from 'react';
import './ReviewStyles.css';
import { FaStar, FaRegStar, FaTimes } from 'react-icons/fa';
import { createReview, updateReview, uploadReviewImage } from '../../services/reviewService';
import { trackInteraction } from '../../utils/analytics';
import { toast } from 'react-toastify';
import { FaPaperclip, FaSpinner } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { selectUser } from '../../redux/appSlice';

const ReviewForm = ({ productId, initialData, onClose, onSuccess, orderId, variantId }) => {
  const currentUser = useSelector(selectUser);
  const [rating, setRating] = useState(initialData?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [pros, setPros] = useState(initialData?.pros || '');
  const [cons, setCons] = useState(initialData?.cons || '');
  const [images, setImages] = useState(initialData?.images || []);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.warning(`File ${file.name} vượt quá 10MB!`);
          return null;
        }
        const res = await uploadReviewImage(file);
        return res.success ? res.url : null;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null);

      if (validUrls.length > 0) {
        setImages((prev) => [...prev, ...validUrls]);
        toast.success(`Đã tải lên thành công ${validUrls.length} ảnh!`);
      }
    } catch (err) {
      toast.error("Tải ảnh lên thất bại. Vui lòng thử lại!");
    } finally {
      setUploading(false);
      e.target.value = ""; // Clear file input
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.warning("Vui lòng chọn số sao đánh giá!");
      return;
    }
    if (content.length < 10) {
      toast.warning("Nội dung đánh giá cần ít nhất 10 ký tự!");
      return;
    }

    setLoading(true);
    try {
      const reviewData = {
        productId,
        rating,
        title,
        content,
        pros,
        cons,
        images,
        orderId,
        variantId: variantId || initialData?.variantId
      };

      let res;
      if (initialData?.id) {
        res = await updateReview(initialData.id, reviewData);
      } else {
        res = await createReview(reviewData);
      }

      if (res.success) {
        // 🧠 AI Tracking: Ghi lại RATED
        if (!initialData?.id) {
          trackInteraction({
            userId: currentUser?.id || null,
            productId: Number(productId),
            actionType: 'RATED',
            rating: Number(rating)
          });
        }
        toast.success(initialData?.id ? "Cập nhật đánh giá thành công!" : "Gửi đánh giá thành công!");
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || "Có lỗi xảy ra khi gửi đánh giá";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="review-form-overlay">
      <div className="review-form">
        <button className="btn-close" onClick={onClose}><FaTimes /></button>
        <h3 className="form-title">
          {initialData?.id ? "Chỉnh sửa đánh giá" : "Viết đánh giá sản phẩm"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map((star) => (
              <span 
                key={star}
                className={`star ${(hoverRating || rating) >= star ? 'active' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                {(hoverRating || rating) >= star ? <FaStar /> : <FaRegStar />}
              </span>
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
            {rating === 1 && "Rất không hài lòng"}
            {rating === 2 && "Không hài lòng"}
            {rating === 3 && "Bình thường"}
            {rating === 4 && "Hài lòng"}
            {rating === 5 && "Cực kỳ hài lòng"}
          </div>

          <div className="form-group">
            <label>Tiêu đề (Tùy chọn)</label>
            <input 
              type="text" 
              placeholder="VD: Sản phẩm rất tốt, Giao hàng nhanh..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nội dung chi tiết</label>
            <textarea 
              rows="4" 
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này (Tối thiểu 10 ký tự)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="pros-cons-inputs">
            <div className="form-group">
              <label>Ưu điểm (Tùy chọn)</label>
              <input 
                type="text" 
                placeholder="VD: Thiết kế đẹp, Pin trâu..." 
                value={pros}
                onChange={(e) => setPros(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Nhược điểm (Tùy chọn)</label>
              <input 
                type="text" 
                placeholder="VD: Giá hơi cao, Loa nhỏ..." 
                value={cons}
                onChange={(e) => setCons(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Hình ảnh đánh giá sản phẩm (Tối đa 10MB/ảnh)</span>
              <span style={{ color: 'var(--review-text-light)', fontWeight: 'normal' }}>{images.length} đã chọn</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
              <input 
                 type="file" 
                 accept="image/*" 
                 multiple 
                 onChange={handleFileChange} 
                 style={{ display: 'none' }} 
                 id="review-image-upload" 
                 disabled={uploading}
              />
              <label 
                htmlFor="review-image-upload"
                style={{ 
                  background: uploading ? '#cbd5e1' : 'linear-gradient(135deg, #ea580c 0%, #ff9f1a 100%)', 
                  color: 'white', 
                  padding: '0.85rem 1.5rem', 
                  borderRadius: '0.75rem',
                  fontWeight: '700',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.15)'
                }}
              >
                {uploading ? <FaSpinner className="fa-spin" style={{ fontSize: '1.2rem' }} /> : <FaPaperclip style={{ fontSize: '1rem' }} />}
                {uploading ? "Đang tải ảnh..." : "📁 Tải ảnh lên từ thiết bị"}
              </label>
            </div>
            
            {images.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {images.map((img, index) => (
                  <div key={index} style={{ position: 'relative', width: '70px', height: '70px' }}>
                    <img 
                      src={img} 
                      alt={`Review thumbnail ${index + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }} 
                      onError={(e) => { e.target.src = "https://via.placeholder.com/70?text=Error"; }}
                    />
                    <button 
                      type="button" 
                      style={{ 
                        position: 'absolute', 
                        top: '-6px', 
                        right: '-6px', 
                        background: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '50%', 
                        width: '20px', 
                        height: '20px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontSize: '12px', 
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                      }}
                      onClick={() => setImages(images.filter((_, i) => i !== index))}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            className="btn-submit"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : (initialData?.id ? "Cập nhật đánh giá" : "Gửi đánh giá ngay")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
