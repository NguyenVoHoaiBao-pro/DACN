/**
 * Giai đoạn 0 — Bộ phận Thu mua: Tạo & theo dõi Đơn mua hàng (PO)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, IconButton, Paper, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, TextField, Typography,
} from "@mui/material";
import {
  Add as AddIcon, Delete as DeleteIcon, Refresh as RefreshIcon, Save as SaveIcon,
} from "@mui/icons-material";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import { selectUser } from "../../redux/appSlice";
import { searchVariants } from "../../services/inventoryService";
import { fetchSuppliers } from "../../services/supplierService";
import { createPurchaseOrder, fetchAdminPoList } from "../../services/purchaseOrderService";
import { isApiSuccess } from "../../utils/apiResponse";
import { toast } from "react-toastify";

const emptyLine = () => ({
  key: Date.now() + Math.random(),
  variant: null,
  quantityOrdered: "",
  unitCost: "",
});

const STATUS_COLOR = {
  PENDING: "warning",
  IN_TRANSIT: "primary",
  APPROVED: "info",
  RECEIVING: "secondary",
  RECEIVED: "success",
  COMPLETED: "success",
  CANCELLED: "error",
};

const PurchaseOrderProcurementPage = () => {
  const user = useSelector(selectUser);
  const [tab, setTab] = useState(0);
  const [suppliers, setSuppliers] = useState([]);
  const [supplier, setSupplier] = useState(null);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [variantSearch, setVariantSearch] = useState({});
  const [variantOptions, setVariantOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [poList, setPoList] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers()
      .then((res) => { if (isApiSuccess(res)) setSuppliers(res.data || []); })
      .catch(() => toast.error("Không tải được danh sách NCC."));
  }, []);

  const loadPoList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetchAdminPoList();
      if (isApiSuccess(res)) setPoList(res.data || []);
    } catch {
      toast.error("Không tải được danh sách PO.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1) loadPoList();
  }, [tab, loadPoList]);

  const totalAmount = useMemo(() => lines.reduce((sum, line) => {
    const q = Number(line.quantityOrdered) || 0;
    const c = Number(line.unitCost) || 0;
    return sum + q * c;
  }, 0), [lines]);

  const searchVariantForLine = async (lineKey, keyword) => {
    setVariantSearch((p) => ({ ...p, [lineKey]: keyword }));
    if (!keyword || keyword.length < 2) {
      setVariantOptions((p) => ({ ...p, [lineKey]: [] }));
      return;
    }
    try {
      const res = await searchVariants(keyword);
      if (res.success) setVariantOptions((p) => ({ ...p, [lineKey]: res.data || [] }));
    } catch {
      setVariantOptions((p) => ({ ...p, [lineKey]: [] }));
    }
  };

  const updateLine = (key, patch) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const handleSave = async () => {
    if (!supplier) {
      toast.warning("Vui lòng chọn Nhà cung cấp.");
      return;
    }
    const items = lines
      .filter((l) => l.variant && Number(l.quantityOrdered) > 0)
      .map((l) => ({
        variantId: l.variant.id,
        quantityOrdered: Number(l.quantityOrdered),
        unitCost: Number(l.unitCost) || 0,
      }));
    if (items.length === 0) {
      toast.warning("Thêm ít nhất một sản phẩm với số lượng > 0.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        supplierId: supplier.id,
        createdByUserId: user?.id ?? user?.userId ?? 1,
        items,
        notes: notes || undefined,
        expectedDate: expectedDate || undefined,
      };
      const res = await createPurchaseOrder(payload);
      if (isApiSuccess(res)) {
        const po = res.data;
        toast.success(`Đã tạo PO ${po?.poNumber || ""} — trạng thái Chờ duyệt.`);
        setSupplier(null);
        setExpectedDate("");
        setNotes("");
        setLines([emptyLine()]);
        setTab(1);
        loadPoList();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "Tạo PO thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout currentPage="Quản lý mua hàng">
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Quản lý mua hàng (Thu mua)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tạo đơn PO gửi Admin duyệt. Sau khi duyệt, đơn tự chuyển xuống Nhân viên Kho.
        </Typography>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Tạo đơn PO mới" />
          <Tab label="Danh sách PO" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, maxWidth: 960 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Thông tin đơn mua
              </Typography>

              <Autocomplete
                options={suppliers}
                getOptionLabel={(o) => `${o.name} (${o.code || "—"})`}
                value={supplier}
                onChange={(_, v) => setSupplier(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Nhà cung cấp *" size="small" sx={{ mb: 2 }} />
                )}
              />

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <TextField
                  label="Ngày dự kiến xe hàng đến kho"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
                <TextField
                  label="Ghi chú"
                  size="small"
                  fullWidth
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Box>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Sản phẩm đặt mua
              </Typography>

              {lines.map((line, idx) => (
                <Box key={line.key} sx={{ display: "flex", gap: 1, mb: 2, alignItems: "flex-start" }}>
                  <Typography sx={{ pt: 1, minWidth: 24, color: "text.secondary" }}>{idx + 1}.</Typography>
                  <Autocomplete
                    sx={{ flex: 2 }}
                    size="small"
                    options={variantOptions[line.key] || []}
                    getOptionLabel={(o) => `${o.productName} — ${o.variantName} (${o.skuCode})`}
                    value={line.variant}
                    onChange={(_, v) => updateLine(line.key, { variant: v })}
                    inputValue={variantSearch[line.key] || ""}
                    onInputChange={(_, v) => searchVariantForLine(line.key, v)}
                    renderInput={(params) => <TextField {...params} placeholder="Tìm sản phẩm (SKU, tên)..." />}
                  />
                  <TextField
                    size="small"
                    label="SL"
                    type="number"
                    sx={{ width: 90 }}
                    value={line.quantityOrdered}
                    onChange={(e) => updateLine(line.key, { quantityOrdered: e.target.value })}
                  />
                  <TextField
                    size="small"
                    label="Đơn giá"
                    type="number"
                    sx={{ width: 130 }}
                    value={line.unitCost}
                    onChange={(e) => updateLine(line.key, { unitCost: e.target.value })}
                  />
                  <IconButton
                    color="error"
                    disabled={lines.length === 1}
                    onClick={() => setLines((p) => p.filter((l) => l.key !== line.key))}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              <Button startIcon={<AddIcon />} onClick={() => setLines((p) => [...p, emptyLine()])} sx={{ mb: 2 }}>
                Thêm dòng sản phẩm
              </Button>

              <Alert severity="info" sx={{ mb: 2 }}>
                Tổng giá trị ước tính: <strong>{totalAmount.toLocaleString("vi-VN")} ₫</strong>
                {" · "}Sau khi Lưu, PO hiển thị nhãn <Chip label="Chờ duyệt" color="warning" size="small" sx={{ verticalAlign: "middle" }} />
              </Alert>

              <Button
                variant="contained"
                size="large"
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                disabled={saving}
                onClick={handleSave}
                sx={{ bgcolor: "#ff9f1a", "&:hover": { bgcolor: "#e68a00" }, fontWeight: 700 }}
              >
                Lưu đơn PO (Chờ duyệt)
              </Button>
            </CardContent>
          </Card>
        )}

        {tab === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
              <IconButton onClick={loadPoList}><RefreshIcon /></IconButton>
            </Box>
            {listLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#fafafa" }}>
                      <TableCell sx={{ fontWeight: 700 }}>Mã PO</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>NCC</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Trạng thái</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SL</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Hẹn giao</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {poList.map((po) => (
                      <TableRow key={po.id} hover>
                        <TableCell><strong>{po.poNumber}</strong></TableCell>
                        <TableCell>{po.supplierName}</TableCell>
                        <TableCell>
                          <Chip label={po.statusLabel} color={STATUS_COLOR[po.status] || "default"} size="small" />
                        </TableCell>
                        <TableCell>{po.totalQuantityOrdered}</TableCell>
                        <TableCell>
                          {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("vi-VN") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {poList.length === 0 && (
                      <TableRow><TableCell colSpan={5} align="center">Chưa có PO.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
};

export default PurchaseOrderProcurementPage;
