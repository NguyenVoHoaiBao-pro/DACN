import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Pagination,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Edit as EditIcon,
  CheckCircle as ConfirmIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  ShoppingBag as OrderIcon,
  Shield as WarrantyIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import AdminOrderDetailDialog from "../Admin-Orders/AdminOrderDetailDialog";
import SalesDeliveryEditDialog from "../Admin-Orders/SalesDeliveryEditDialog";
import { adminGetCustomers, adminGetUserById } from "../../services/userService";
import { adminGetOrderDetail, adminGetOrders, adminUpdateOrderStatus } from "../../services/orderService";
import { getWarrantyTickets } from "../../services/warrantyService";
import { isApiSuccess } from "../../utils/apiResponse";
import { usePermissions } from "../../hooks/usePermissions";
import { canSalesEditDelivery, ORDER_STATUS_LABELS } from "../../utils/orderDeliveryEdit";

const STATUS_COLORS = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  PROCESSING: "#8b5cf6",
  SHIPPING: "#06b6d4",
  DELIVERED: "#10b981",
  COMPLETED: "#16a34a",
  CANCELLED: "#ef4444",
};

const CustomerProfilesPage = () => {
  const { hasAnyPermission } = usePermissions();
  const isFullAdmin = hasAnyPermission(["USER_MANAGE", "ADMIN", "ROLE_ADMIN"]);
  const canEditDelivery = hasAnyPermission(["ORDER_EDIT_DELIVERY", "ORDER_CONFIRM"]);
  const canConfirmOrder = hasAnyPermission(["ORDER_CONFIRM"]);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchVal, setSearchVal] = useState("");
  const [keyword, setKeyword] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState(0);
  const [orders, setOrders] = useState([]);
  const [warrantyTickets, setWarrantyTickets] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deliveryEditOpen, setDeliveryEditOpen] = useState(false);
  const [deliveryEditOrder, setDeliveryEditOrder] = useState(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [orderDetailId, setOrderDetailId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, [page, keyword]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await adminGetCustomers({ page, size: 10, keyword, sortBy: "createdAt", sortDir: "desc" });
      if (isApiSuccess(res) && res.data?.content) {
        setCustomers(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tải được danh sách khách hàng");
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (customer) => {
    setDetailOpen(true);
    setTab(0);
    setDetailLoading(true);
    setOrders([]);
    setWarrantyTickets([]);
    try {
      const res = await adminGetUserById(customer.id);
      if (isApiSuccess(res)) {
        setSelected(res.data);
      } else {
        setSelected(customer);
      }
      const orderRes = await adminGetOrders(0, 20, null, null, "orderDate", "desc", customer.id);
      if (orderRes?.content) setOrders(orderRes.content);

      const phone = res?.data?.phone || customer.phone;
      if (phone) {
        const wRes = await getWarrantyTickets({ page: 0, size: 10, keyword: phone });
        if (isApiSuccess(wRes) && wRes.data?.content) {
          setWarrantyTickets(wRes.data.content);
        }
      }
    } catch (err) {
      toast.error("Không tải được chi tiết khách hàng");
      setSelected(customer);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");

  const refreshCustomerOrders = async (customerId) => {
    const orderRes = await adminGetOrders(0, 20, null, null, "orderDate", "desc", customerId);
    if (orderRes?.content) setOrders(orderRes.content);
  };

  const openDeliveryEdit = async (orderId) => {
    try {
      const detail = await adminGetOrderDetail(orderId);
      setDeliveryEditOrder(detail);
      setDeliveryEditOpen(true);
    } catch {
      toast.error("Không tải được chi tiết đơn");
    }
  };

  const handleConfirmOrder = async (order) => {
    if (order.status !== "PENDING") return;
    setConfirmingId(order.id);
    try {
      await adminUpdateOrderStatus(order.id, { status: "CONFIRMED", adminNote: order.adminNote || "" });
      toast.success(`Đã xác nhận đơn ${order.orderCode}`);
      if (selected?.id) await refreshCustomerOrders(selected.id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không xác nhận được đơn");
    } finally {
      setConfirmingId(null);
    }
  };

  const canActOnOrder = (status) =>
    isFullAdmin || canSalesEditDelivery(status);

  return (
    <AdminLayout currentPage="Hồ sơ khách hàng">
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Hồ sơ khách hàng
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Tra cứu khách hàng; với đơn <strong>Chờ xác nhận / Đã xác nhận</strong> có thể sửa giao hàng hoặc xác nhận đơn.
        </Typography>

        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Gợi ý: tìm theo <strong>số điện thoại</strong>, email hoặc tên — giống khi khách gọi hotline hỏi đơn.
        </Alert>

        <Card sx={{ mb: 3, borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <CardContent>
            <TextField
              fullWidth
              size="small"
              placeholder="Số điện thoại, email, tên khách... (Enter)"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setKeyword(searchVal);
                  setPage(0);
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2, border: "1px solid #e2e8f0" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Khách hàng</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Điện thoại</TableCell>
                  <TableCell>Trạng thái</TableCell>
                  <TableCell align="right">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={32} />
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      Không tìm thấy khách hàng
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <Typography fontWeight={600}>{c.name || c.fullName || c.username}</Typography>
                        <Typography variant="caption" color="text.secondary">ID: {c.id}</Typography>
                      </TableCell>
                      <TableCell>{c.email}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status === 1 ? "Hoạt động" : "Khóa"}
                          color={c.status === 1 ? "success" : "default"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => openProfile(c)}>
                          Xem hồ sơ
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {totalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <Pagination count={totalPages} page={page + 1} onChange={(_, p) => setPage(p - 1)} color="primary" />
            </Box>
          )}
        </Card>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
          Tổng {totalElements} khách hàng
        </Typography>
      </Box>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon color="primary" />
            Hồ sơ khách hàng
          </Box>
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <CircularProgress />
            </Box>
          ) : selected ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">
                  {selected.name || selected.fullName || selected.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selected.email} · {selected.phone || "Chưa có SĐT"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Đăng ký: {formatDate(selected.createdAt)} · Đăng nhập gần nhất: {formatDate(selected.lastLoginAt)}
                </Typography>
              </Box>

              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Thông tin" />
                <Tab icon={<OrderIcon fontSize="small" />} iconPosition="start" label={`Đơn hàng (${orders.length})`} />
                <Tab icon={<WarrantyIcon fontSize="small" />} iconPosition="start" label={`Bảo hành (${warrantyTickets.length})`} />
              </Tabs>

              {tab === 0 && (
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Typography variant="body2"><strong>Username:</strong> {selected.username}</Typography>
                  <Typography variant="body2"><strong>Giới tính:</strong> {selected.gender || "—"}</Typography>
                  <Typography variant="body2" sx={{ gridColumn: "1 / -1" }}><strong>Địa chỉ:</strong> {selected.address || "—"}</Typography>
                </Box>
              )}

              {tab === 1 && (
                orders.length === 0 ? (
                  <Typography color="text.secondary">Chưa có đơn hàng</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mã đơn</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell align="right">Tổng tiền</TableCell>
                        <TableCell>Ngày đặt</TableCell>
                        <TableCell align="right">Thao tác</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orders.map((o) => {
                        const editable = canEditDelivery && canActOnOrder(o.status);
                        const showConfirm = canConfirmOrder && o.status === "PENDING";
                        return (
                          <TableRow key={o.id} hover>
                            <TableCell>
                              <Typography
                                variant="body2"
                                color="primary"
                                sx={{ cursor: "pointer", fontWeight: 600 }}
                                onClick={() => {
                                  setOrderDetailId(o.id);
                                  setOrderDetailOpen(true);
                                }}
                              >
                                {o.orderCode}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={ORDER_STATUS_LABELS[o.status] || o.statusDisplay || o.status}
                                sx={{ bgcolor: STATUS_COLORS[o.status] || "#94a3b8", color: "#fff" }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {Number(o.totalAmount || 0).toLocaleString("vi-VN")}đ
                            </TableCell>
                            <TableCell>{formatDate(o.orderDate)}</TableCell>
                            <TableCell align="right">
                              <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <Button
                                  size="small"
                                  variant="text"
                                  startIcon={<ViewIcon fontSize="small" />}
                                  onClick={() => {
                                    setOrderDetailId(o.id);
                                    setOrderDetailOpen(true);
                                  }}
                                >
                                  Chi tiết
                                </Button>
                                {showConfirm && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    disabled={confirmingId === o.id}
                                    startIcon={<ConfirmIcon fontSize="small" />}
                                    onClick={() => handleConfirmOrder(o)}
                                  >
                                    {confirmingId === o.id ? "..." : "Xác nhận"}
                                  </Button>
                                )}
                                {editable && (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<EditIcon fontSize="small" />}
                                    onClick={() => openDeliveryEdit(o.id)}
                                  >
                                    Sửa giao hàng
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )
              )}

              {tab === 2 && (
                warrantyTickets.length === 0 ? (
                  <Typography color="text.secondary">Không có phiếu bảo hành theo SĐT này</Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Mã phiếu</TableCell>
                        <TableCell>Trạng thái</TableCell>
                        <TableCell>IMEI/Serial</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {warrantyTickets.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.ticketCode}</TableCell>
                          <TableCell>{t.status}</TableCell>
                          <TableCell>{t.imeiOrSerial}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <SalesDeliveryEditDialog
        open={deliveryEditOpen}
        order={deliveryEditOrder}
        onClose={() => {
          setDeliveryEditOpen(false);
          setDeliveryEditOrder(null);
        }}
        onSaved={async () => {
          toast.success("Đã cập nhật thông tin giao hàng");
          if (selected?.id) await refreshCustomerOrders(selected.id);
        }}
      />

      <AdminOrderDetailDialog
        open={orderDetailOpen}
        orderId={orderDetailId}
        onClose={() => {
          setOrderDetailOpen(false);
          setOrderDetailId(null);
          if (selected?.id) refreshCustomerOrders(selected.id);
        }}
      />
    </AdminLayout>
  );
};

export default CustomerProfilesPage;
