import {
  BarChart as AnalyticsIcon,
  Article as ArticleIcon,
  Image as BannerIcon,
  Category as CategoryIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as OrdersIcon,
  People as PeopleIcon,
  ContactPage as CustomerProfileIcon,
  Settings as SettingsIcon,
  Store as StoreIcon,
  Warehouse as WarehouseIcon,
  Shield as ShieldIcon,
  Assignment as WarrantyClaimIcon,
  Forum as ForumIcon,
  ViewKanban as KanbanIcon,
  QrCode2 as QrCodeIcon,
  AccountBalance as BankIcon,
  Savings as FinanceIcon,
  AssignmentReturn as ReturnIcon,
  ReceiptLong as PoIcon,
  Style as StyleIcon,
  ConfirmationNumber as CouponIcon,
  Business as BusinessIcon,
  RateReview as ReviewIcon,
  FactCheck as FactCheckIcon,
} from "@mui/icons-material";
import { cloneElement, useCallback, useEffect, useState } from "react";

import {
  Avatar,
  Badge,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { usePermissions } from "../../hooks/usePermissions";
import { fetchWarehousePoQueue } from "../../services/purchaseOrderService";
import { isApiSuccess } from "../../utils/apiResponse";
import { getUnseenWarehousePos } from "../../utils/warehousePoAlerts";

/**
 * Sidebar Nhân viên Kho — chỉ nghiệp vụ nhập/xuất kho (không quản lý đơn bán CRUD).
 */
const WAREHOUSE_MENU_PATHS = new Set([
  "/admin",
  "/admin/purchase-orders",
  "/admin/warehouse-fulfillment",
  "/admin/inventory",
  "/admin/inventory-audit",
  "/admin/imei",
  "/admin/return",
  "/admin/warranty-inbound",
]);

const AdminSidebar = ({ currentPage, collapsed = false }) => {
  const navigate = useNavigate();
  const { hasAnyPermission, isWarehouseUser, isSalesUser, isAdminUser } = usePermissions();
  const warehouseOnly = isWarehouseUser && !isAdminUser && !isSalesUser;
  const [poBadge, setPoBadge] = useState(0);

  const refreshPoBadge = useCallback(async () => {
    if (!warehouseOnly && !hasAnyPermission(["STOCK_IMPORT"])) return;
    try {
      const res = await fetchWarehousePoQueue("");
      if (isApiSuccess(res) && Array.isArray(res.data)) {
        setPoBadge(getUnseenWarehousePos(res.data).length);
      }
    } catch {
      /* ignore */
    }
  }, [warehouseOnly, hasAnyPermission]);

  useEffect(() => {
    refreshPoBadge();
    const t = setInterval(refreshPoBadge, 60000);
    return () => clearInterval(t);
  }, [refreshPoBadge]);

  const allMenuItems = [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/admin", req: ["REPORT_REVENUE", "REPORT_SALES", "ORDER_VIEW_ALL"] },
    { text: "Sản phẩm", icon: <InventoryIcon />, path: "/admin/products", req: ["PRODUCT_VIEW", "PRODUCT_CREATE", "PRODUCT_MANAGE"] },
    { text: "Danh mục", icon: <CategoryIcon />, path: "/admin/categories", req: ["CATEGORY_VIEW"] },
    { text: "Thuộc tính", icon: <StyleIcon />, path: "/admin/attributes", req: ["CATEGORY_VIEW"] },
    { text: "Đơn hàng", icon: <OrdersIcon />, path: "/admin/orders", req: ["ORDER_VIEW_ALL"] },
    { text: "Chat đa kênh", icon: <ForumIcon />, path: "/admin/sales/chat", req: ["ORDER_VIEW_ALL", "CUSTOMER_VIEW"] },
    { text: "Pipeline & HH", icon: <KanbanIcon />, path: "/admin/sales/pipeline", req: ["ORDER_VIEW_ALL", "REPORT_SALES"] },
    { text: "Yêu cầu trả hàng", icon: <ReturnIcon />, path: "/admin/sales/return-requests", req: ["RETURN_REQUEST_REVIEW", "ORDER_VIEW_ALL"] },
    { text: "Cấu hình KPI", icon: <KanbanIcon />, path: "/admin/sales/kpi-config", req: ["USER_MANAGE"] },
    { text: "Quản lý mua hàng", icon: <PoIcon />, path: "/admin/procurement", req: ["PRODUCT_MANAGE"] },
    { text: "Duyệt chứng từ", icon: <PoIcon />, path: "/admin/po-management", req: ["PRODUCT_MANAGE"] },
    { text: "Đơn mua hàng", icon: <PoIcon />, path: "/admin/purchase-orders", req: ["STOCK_IMPORT"], badgeKey: "warehousePo" },
    { text: "Đơn hàng cần xuất", icon: <OrdersIcon />, path: "/admin/warehouse-fulfillment", req: ["ORDER_ASSIGN_SHIPPING"] },
    { text: "Tồn kho", icon: <WarehouseIcon />, path: "/admin/inventory", req: ["INVENTORY_STAT"] },
    { text: "Kiểm kê kho", icon: <WarehouseIcon />, path: "/admin/inventory-audit", req: ["STOCK_IMPORT"] },
    { text: "Duyệt phiếu kiểm kê", icon: <FactCheckIcon />, path: "/admin/inventory-audit-approval", req: ["PRODUCT_MANAGE", "USER_MANAGE"] },
    { text: "Quản lý hoàn tiền", icon: <BankIcon />, path: "/admin/refunds", req: ["REFUND_VIEW", "REFUND_BANK_INFO", "REFUND_APPROVE", "USER_MANAGE"] },
    { text: "Hồ sơ khách hàng", icon: <CustomerProfileIcon />, path: "/admin/customers", req: ["CUSTOMER_VIEW"] },
    { text: "Người dùng", icon: <PeopleIcon />, path: "/admin/users", req: ["USER_MANAGE"] },
    { text: "Banner", icon: <BannerIcon />, path: "/admin/banners", req: ["BANNER_MANAGE"] },
    { text: "Bài viết", icon: <ArticleIcon />, path: "/admin/posts", req: ["POST_MANAGE"] },
    { text: "Bảo hành", icon: <ShieldIcon />, path: "/admin/warranty", req: ["WARRANTY_MANAGE"] },
    { text: "Yêu cầu BH online", icon: <WarrantyClaimIcon />, path: "/admin/warranty-claims", req: ["WARRANTY_MANAGE", "CUSTOMER_VIEW"] },
    { text: "Nhập Serial", icon: <QrCodeIcon />, path: "/admin/imei", req: ["IMEI_MANAGE"] },
    { text: "Xử lý hàng hoàn", icon: <ReturnIcon />, path: "/admin/return", req: ["STOCK_RETURN"] },
    { text: "Tiếp nhận BH", icon: <WarrantyClaimIcon />, path: "/admin/warranty-inbound", req: ["STOCK_IMPORT", "IMEI_MANAGE"] },
    { text: "Mã giảm giá", icon: <CouponIcon />, path: "/admin/coupons", req: ["PRODUCT_MANAGE"] },
    { text: "Thương hiệu", icon: <BusinessIcon />, path: "/admin/producers", req: ["PRODUCT_MANAGE"] },
    { text: "Đánh giá", icon: <ReviewIcon />, path: "/admin/reviews", req: ["PRODUCT_MANAGE"] },

    { text: "Thống kê", icon: <AnalyticsIcon />, path: "/admin/analytics", req: ["REPORT_REVENUE"] },
    { text: "Sổ cái", icon: <FinanceIcon />, path: "/admin/finance", req: ["REPORT_REVENUE"] },

    { text: "Cài đặt", icon: <SettingsIcon />, path: "/admin/settings", req: ["ROLE_PERM_EDIT"] },
  ];

  const menuItems = allMenuItems.filter((i) => {
    if (i.req.length > 0 && !hasAnyPermission(i.req)) return false;
    if (warehouseOnly) return WAREHOUSE_MENU_PATHS.has(i.path);
    return true;
  });

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Brand Header — cố định phía trên */}
      <Box
        sx={{
          flexShrink: 0,
          pt: collapsed ? 2.5 : 3,
          pb: collapsed ? 1.5 : 2,
          px: collapsed ? 1 : 3,
          backgroundColor: "#ffffff",
          textAlign: collapsed ? "center" : "left",
          transition: "all 0.3s ease",
          borderBottom: "1px solid #f0f0f0",
          minHeight: collapsed ? 80 : 96, // 🔥 TĂNG: Tăng min height
          mt: "64px", // 🔥 THÊM: Margin-top bằng với header height
        }}
      >
        {collapsed ? (
          <Avatar
            sx={{
              bgcolor: "#ff9f1a",
              color: "#ffffff",
              width: 36, // 🔥 GIẢM: Từ 40 xuống 36
              height: 36,
              margin: "0 auto",
            }}
          >
            <StoreIcon sx={{ fontSize: 20 }} /> {/* 🔥 GIẢM icon size */}
          </Avatar>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: "#ff9f1a",
                color: "#ffffff",
                width: 44, // 🔥 GIẢM: Từ 48 xuống 44
                height: 44,
              }}
            >
              <StoreIcon sx={{ fontSize: 24 }} />
            </Avatar>
            <Box>
              <Typography
                variant="h6"
                fontWeight={600}
                color="#333"
                sx={{ lineHeight: 1.2, fontSize: "1.1rem" }} // 🔥 GIẢM font size
              >
                KhangAdmin
              </Typography>
              <Typography
                variant="caption"
                color="#666"
                sx={{ fontSize: "0.75rem" }}
              >
                ElectroShop Management
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
      {/* Menu — cuộn khi vượt chiều cao màn hình */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          scrollbarWidth: "thin",
          scrollbarColor: "#cbd5e1 transparent",
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#cbd5e1",
            borderRadius: 3,
            "&:hover": { backgroundColor: "#94a3b8" },
          },
        }}
      >
      <List sx={{ pt: 0.5, pb: 2, backgroundColor: "#ffffff" }}>
        {menuItems.map((item) => (
          <ListItem
            key={item.text}
            disablePadding
            sx={{
              px: collapsed ? 0.5 : 2,
              mb: collapsed ? 0.3 : 0.5, // 🔥 GIẢM margin bottom
            }}
          >
            <ListItemButton
              selected={currentPage === item.text}
              onClick={() => handleNavigation(item.path)}
              sx={{
                borderRadius: 2,
                minHeight: collapsed ? 40 : 48,
                justifyContent: collapsed ? "center" : "flex-start",
                alignItems: "center",
                px: collapsed ? 1 : 2,
                py: collapsed ? 0.75 : 1,
                transition: "all 0.3s ease",
                "&.Mui-selected": {
                  backgroundColor: "#f0f0f0",
                  color: "#333",
                  "& .MuiListItemIcon-root": {
                    color: "#333",
                  },
                },
                "&:hover": {
                  backgroundColor: "#f8f8f8",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  width: collapsed ? "auto" : 40,
                  mr: collapsed ? 0 : 0,
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#666",
                  transition: "all 0.3s ease",
                  "& .MuiSvgIcon-root": {
                    fontSize: collapsed ? 20 : 22,
                  },
                }}
              >
                {cloneElement(item.icon, {
                  sx: { fontSize: collapsed ? 20 : 22, display: "block" },
                })}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={
                    item.badgeKey === "warehousePo" && poBadge > 0 ? (
                      <Badge badgeContent={poBadge} color="error" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                        <span>{item.text}</span>
                      </Badge>
                    ) : (
                      item.text
                    )
                  }
                  sx={{ my: 0 }}
                  primaryTypographyProps={{
                    fontWeight: currentPage === item.text ? 600 : 400,
                    color: "#333",
                    fontSize: "0.9rem",
                    lineHeight: 1.25,
                    noWrap: true,
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      </Box>
    </Box>
  );
};

export default AdminSidebar;
