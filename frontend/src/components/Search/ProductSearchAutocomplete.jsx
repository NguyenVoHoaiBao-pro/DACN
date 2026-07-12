import {
  Autocomplete,
  Box,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "../../hooks/useDebounce";
import { suggestProducts } from "../../services/productService";
import { PLACEHOLDER_IMG } from "../../services/masterService";
import { isApiSuccess } from "../../utils/apiResponse";

/**
 * Tìm kiếm sản phẩm thông minh — gợi ý realtime khi gõ (≥ 2 ký tự).
 */
const ProductSearchAutocomplete = ({
  value,
  onChange,
  categoryId = null,
  placeholder = "Bạn đang tìm kiếm gì?",
  onSubmit,
  sx = {},
}) => {
  const navigate = useNavigate();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);

  const debouncedQuery = useDebounce(value, 300);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setOptions([]);
      return undefined;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await suggestProducts(debouncedQuery.trim(), categoryId, 8, {
          signal: controller.signal,
        });
        if (isApiSuccess(res) && Array.isArray(res.data)) {
          setOptions(res.data);
        } else if (Array.isArray(res?.data)) {
          setOptions(res.data);
        } else {
          setOptions([]);
        }
      } catch (err) {
        if (err?.code !== "ERR_CANCELED") {
          setOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSuggestions();
    return () => controller.abort();
  }, [debouncedQuery, categoryId]);

  const goToShop = (keyword) => {
    const params = new URLSearchParams();
    if (keyword?.trim()) params.set("keyword", keyword.trim());
    if (categoryId) params.set("category", String(categoryId));
    navigate(`/shop?${params.toString()}`);
  };

  const handleSelect = (_, item) => {
    if (!item) return;
    if (item.id) {
      navigate(`/product/${item.id}`);
      onChange?.("");
      setOpen(false);
      return;
    }
    goToShop(item.name || value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onSubmit) {
        onSubmit(e);
      } else {
        goToShop(value);
      }
      setOpen(false);
    }
  };

  return (
    <Autocomplete
      freeSolo
      open={open && debouncedQuery.trim().length >= 2}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(opt) => (typeof opt === "string" ? opt : opt.name || "")}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      inputValue={value}
      onInputChange={(_, v, reason) => {
        if (reason === "input" || reason === "clear") {
          onChange?.(v);
        }
      }}
      onChange={handleSelect}
      noOptionsText={
        debouncedQuery.trim().length < 2
          ? "Gõ ít nhất 2 ký tự..."
          : "Không tìm thấy sản phẩm"
      }
      slotProps={{
        popper: { sx: { zIndex: 1400 } },
        paper: { sx: { mt: 0.5, borderRadius: 2, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" } },
      }}
      renderOption={(props, option) => (
        <Box
          component="li"
          {...props}
          key={option.id}
          sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}
        >
          <Box
            component="img"
            src={option.imageUrl || PLACEHOLDER_IMG}
            alt=""
            sx={{
              width: 44,
              height: 44,
              objectFit: "cover",
              borderRadius: 1,
              flexShrink: 0,
              bgcolor: "#f5f5f5",
            }}
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER_IMG;
            }}
          />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
              {option.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {option.categoryName || "Sản phẩm"}
              {option.price != null && ` · ${Number(option.price).toLocaleString("vi-VN")}đ`}
            </Typography>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          variant="outlined"
          onKeyDown={handleKeyDown}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={sx}
        />
      )}
      sx={{ flex: 1 }}
    />
  );
};

export default ProductSearchAutocomplete;
