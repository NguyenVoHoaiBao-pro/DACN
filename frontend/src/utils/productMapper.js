import { PLACEHOLDER_IMG } from "../services/masterService";

export const mapProductForCard = (p) => {
  const imageUrl =
    p.images && p.images.length > 0 ? p.images[0].linkImage : PLACEHOLDER_IMG;

  let oldPrice = null;
  if (p.coupon && p.coupon.percentDiscount > 0) {
    oldPrice = p.price / (1 - p.coupon.percentDiscount / 100);
  } else if (p.variants?.[0]?.originalPrice) {
    oldPrice = p.variants[0].originalPrice;
  } else if (p.price) {
    oldPrice = p.price * 1.15;
  }

  return {
    id: p.id,
    name: p.name,
    price: p.price,
    oldPrice,
    badge: p.isFeatured ? "Nổi bật" : null,
    category: p.productType?.name || p.categoryName || "Thiết bị",
    image: imageUrl,
    soldCount: p.soldQuantity || 0,
    averageRating: p.averageRating || 0,
    originalData: p,
  };
};
