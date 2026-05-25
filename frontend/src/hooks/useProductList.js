import { useCallback, useEffect, useState } from "react";
import {
  getBestSellers,
  getFeaturedProducts,
  getProducts,
  searchProducts,
} from "../services/productService";
import {
  getApiErrorMessage,
  isAbortError,
  unwrapPageContent,
} from "../utils/apiResponse";
import { mapProductForCard } from "../utils/productMapper";

/**
 * Hook tải danh sách sản phẩm — xử lý StrictMode, 503 retry (httpClient), map card.
 */
export function useProductList(fetcher, deps = []) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(signal);
      if (signal?.aborted) return;
      const content = unwrapPageContent(result);
      setProducts(content.map(mapProductForCard));
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) return;
      console.error("[useProductList]", err);
      setProducts([]);
      setError(getApiErrorMessage(err));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = () => {
    const controller = new AbortController();
    load(controller.signal);
  };

  return { products, loading, error, retry };
}

export const fetchBestSellersPage = (page = 0, size = 8) =>
  getBestSellers(page, size);

export const fetchFeaturedPage = (page = 0, size = 8) =>
  getFeaturedProducts(page, size);

export const fetchAllProductsPage = (page = 0, size = 10) =>
  getProducts(page, size);

export const fetchNewProductsPage = () =>
  searchProducts({ sort_by: "importdate", sort_dir: "desc", size: 8, page: 0 });
