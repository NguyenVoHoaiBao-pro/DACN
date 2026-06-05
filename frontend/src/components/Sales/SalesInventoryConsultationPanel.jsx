/**
 * Panel tư vấn tồn kho — nhúng trong /admin/inventory (tab Sales)
 */
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  Search as SearchIcon,
  QrCodeScanner as ScanIcon,
  Inventory as StockIcon,
  Memory as SpecIcon,
  VerifiedUser as WarrantyIcon,
  OpenInNew as OpenIcon,
} from "@mui/icons-material";
import { salesLookupProduct, salesGetConsultationDetail } from "../../services/salesConsultationService";
import { isApiSuccess } from "../../utils/apiResponse";

const fmtPrice = (n) =>
  n != null
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)
    : "—";

const MATCH_LABELS = { IMEI: "IMEI / Serial", SKU: "Mã SKU", NAME: "Tên sản phẩm" };

const SalesInventoryConsultationPanel = ({ showIntro = true }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const runLookup = useCallback(async (q) => {
    const trimmed = (q || "").trim();
    if (!trimmed) {
      setError("Nhập tên sản phẩm, mã SKU hoặc quét IMEI/Serial");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await salesLookupProduct(trimmed);
      if (isApiSuccess(res)) {
        setResult(res.data);
      } else {
        setError(res.message || "Không tìm thấy");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Tra cứu thất bại");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    runLookup(keyword);
  };

  const handleSelectProduct = async (id) => {
    setLoading(true);
    setError("");
    try {
      const res = await salesGetConsultationDetail(id);
      if (isApiSuccess(res)) {
        setResult({ matchType: "NAME", keyword: result?.keyword || keyword, product: res.data });
      } else {
        setError(res.message || "Không tải được chi tiết");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không tải được chi tiết");
    } finally {
      setLoading(false);
    }
  };

  const product = result?.product;
  const specs = product?.specifications || [];
  const variants = (product?.variants || []).filter((v) => v.isActive !== false);
  const totalAvailable = variants.reduce((s, v) => s + (v.availableQuantity ?? 0), 0);
  const coreSpecs = [
    ...variants.flatMap((v) => v.attributeValues || []),
    ...specs.filter(
      (s) =>
        ["WARRANTY", "BATTERY", "CHARGING_POWER", "BRAND"].includes(s.code) ||
        /chip|ram|cpu|pin|bảo hành/i.test(s.name || "")
    ),
  ];

  return (
    <Box sx={{ maxWidth: 1200, mx: showIntro ? "auto" : 0 }}>
      {showIntro && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tra cứu theo <strong>tên</strong>, <strong>mã SKU</strong> hoặc <strong>quét IMEI/Serial</strong> — xem tồn
          khả dụng và thông số để báo giá khách.
        </Typography>
      )}

      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              placeholder="VD: iPhone 15, SKU-LAP-001, IMEI_CON_HAN_001..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              sx={{ flex: 1, minWidth: 280 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              autoFocus
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
              sx={{ bgcolor: "#2563eb", px: 3, textTransform: "none", fontWeight: 700 }}
            >
              Tra cứu
            </Button>
            <Button
              variant="outlined"
              startIcon={<ScanIcon />}
              onClick={() => inputRef.current?.focus()}
              sx={{ textTransform: "none" }}
            >
              Sẵn sàng quét
            </Button>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Dán hoặc quét mã từ tem máy / hộp — hệ thống tự nhận diện IMEI, SKU hoặc tên.
          </Typography>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result?.products?.length > 0 && !product && (
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Tìm thấy {result.products.length} kết quả ({MATCH_LABELS[result.matchType] || result.matchType})
            </Typography>
            <List disablePadding>
              {result.products.map((p) => (
                <ListItemButton key={p.id} onClick={() => handleSelectProduct(p.id)} sx={{ borderRadius: 1, mb: 0.5 }}>
                  <Avatar src={p.imageUrl} variant="rounded" sx={{ mr: 2, width: 48, height: 48 }} />
                  <ListItemText
                    primary={p.name}
                    secondary={
                      <>
                        {p.matchedSku && <>SKU: {p.matchedSku} · </>}
                        Sẵn bán: <strong>{p.totalAvailableQuantity ?? 0}</strong> · BH: {p.warrantyPolicy || "—"} ·{" "}
                        {fmtPrice(p.basePrice)}
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {product && (
        <Stack spacing={3}>
          {result.matchType && (
            <Chip
              label={`Khớp theo: ${MATCH_LABELS[result.matchType] || result.matchType}`}
              color="primary"
              size="small"
              sx={{ alignSelf: "flex-start", fontWeight: 600 }}
            />
          )}

          {result.matchedItem && (
            <Alert severity={result.matchedItem.status === "AVAILABLE" ? "success" : "info"} icon={<ScanIcon />}>
              <strong>IMEI/Serial:</strong> {result.matchedItem.imei || result.matchedItem.serialNumber} —{" "}
              <strong>{result.matchedItem.statusLabel}</strong>
              {result.matchedItem.status !== "AVAILABLE" && <> (máy này không tính vào tồn sẵn bán)</>}
            </Alert>
          )}

          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" fontWeight={800}>
                    {product.name}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1, gap: 0.5 }}>
                    <Chip label={product.productType?.name || "—"} size="small" />
                    <Chip label={product.producer?.name || "—"} size="small" variant="outlined" />
                    <Chip label={fmtPrice(product.basePrice)} size="small" color="warning" />
                  </Stack>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <StockIcon color="success" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tồn khả dụng (sẵn bán)
                        </Typography>
                        <Typography variant="h4" fontWeight={800} color="#16a34a">
                          {totalAvailable}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tổng kho hệ thống: {variants.reduce((s, v) => s + (v.stockQuantity ?? 0), 0)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
              <Button
                size="small"
                endIcon={<OpenIcon />}
                onClick={() => navigate(`/admin/products/${product.id}`)}
                sx={{ mt: 2, textTransform: "none" }}
              >
                Xem đầy đủ trên catalog
              </Button>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <WarrantyIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Bảo hành &amp; thông số cốt lõi
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>Chính sách BH:</strong> {product.warrantyPolicy || "12 tháng (mặc định)"}
                  </Typography>
                  {coreSpecs.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Chưa có thông số cấu hình — xem mô tả sản phẩm bên dưới.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {coreSpecs.map((s, i) => (
                        <Box key={`${s.code || s.attributeName}-${i}`} sx={{ display: "flex", gap: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
                            {s.attributeName || s.name}:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {s.value}
                            {s.unit ? ` ${s.unit}` : ""}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, height: "100%" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <SpecIcon color="secondary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Biến thể &amp; tồn
                    </Typography>
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>SKU</TableCell>
                        <TableCell>Cấu hình</TableCell>
                        <TableCell align="right">Giá</TableCell>
                        <TableCell align="center">Sẵn bán</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {variants.map((v) => (
                        <TableRow
                          key={v.id}
                          sx={{ bgcolor: result.matchedVariant?.id === v.id ? "#eff6ff" : "inherit" }}
                        >
                          <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{v.skuCode}</TableCell>
                          <TableCell>
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                              {(v.attributeValues || []).map((a) => (
                                <Chip
                                  key={a.id}
                                  label={`${a.attributeName}: ${a.value}`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                              {!v.attributeValues?.length && (v.variantName || "—")}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{fmtPrice(v.price)}</TableCell>
                          <TableCell align="center">
                            <Typography
                              fontWeight={700}
                              color={(v.availableQuantity ?? 0) > 0 ? "success.main" : "error.main"}
                            >
                              {v.availableQuantity ?? 0}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {specs.length > 0 && (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Thông số kỹ thuật đầy đủ
                </Typography>
                <Grid container spacing={2}>
                  {specs.map((s) => (
                    <Grid item xs={12} sm={6} md={4} key={`${s.code}-${s.value}`}>
                      <Typography variant="caption" color="text.secondary">
                        {s.name}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {s.value}
                        {s.unit ? ` ${s.unit}` : ""}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}

          {product.description && (
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Mô tả tư vấn
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box
                  sx={{ fontSize: 14, color: "text.secondary", "& img": { maxWidth: "100%" } }}
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </CardContent>
            </Card>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default SalesInventoryConsultationPanel;
