/**
 * MAIN APP COMPONENT
 *
 * Router setup cho toàn bộ application
 * Admin routes được tách biệt khỏi User routes
 */

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

// Layout Components
import Footer from "./components/Footer";
import Header from "./components/Header/Header";
import Navigation from "./components/Navigation/Navigation";
import StoreChatbot from "./components/Chatbot/StoreChatbot";
import ScrollToTop from "./components/ScrollToTop/ScrollToTop";

// User Pages
import ShoppingCart from "./components/Cart/ShoppingCart.jsx";
import ProductDetail from "./components/Product-Details";
import About from "./pages/About";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/register.jsx";
import ScanQR from "./pages/auth/ScanQR.jsx";
import AccessDenied from "./pages/auth/AccessDenied.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import Checkout from "./pages/Checkout/Checkout.jsx";
import Contact from "./pages/Contact";
import SalesLiveChatPage from "./pages/SalesLiveChat/SalesLiveChatPage.jsx";
import Home from "./pages/Home";
import OrderHistoryPage from "./pages/Order-Management/OrderHistoryPage.jsx";
import UserWarrantyPage from "./pages/User-Warranty/UserWarrantyPage.jsx";
import UserWarrantyClaimDetailPage from "./pages/User-Warranty/UserWarrantyClaimDetailPage.jsx";
import Shop from "./pages/Shop";
import ProfilePage from "./pages/UserProfile/ProfilePage.jsx";
import AddressPage from "./pages/UserProfile/AddressPage.jsx";
import ChangePasswordPage from "./pages/UserProfile/ChangePasswordPage.jsx";
import Wishlist from "./pages/Wishlist/Wishlist";
import PaymentSuccess from "./pages/Payment/PaymentSuccess.jsx";
import PaymentFailed from "./pages/Payment/PaymentFailed.jsx";
import Blog from "./pages/Blog/Blog.jsx";
import FAQ from "./pages/FAQ/FAQ.jsx";
import Terms from "./pages/Terms/Terms.jsx";

// Admin Pages
import AnalyticsPage from "./pages/Admin-Analytics/AnalyticsPage.jsx";
import BannerManagementPage from "./pages/Admin-Banner/BannerManagementPage.jsx";
import CategoryManagementPage from "./pages/Admin-Categories/CategoryManagementPage.jsx";
import UserManagementPage from "./pages/Admin-Users/UserManagementPage.jsx";
import CustomerProfilesPage from "./pages/Admin-Customers/CustomerProfilesPage.jsx";
import DashboardPage from "./pages/Admin-Dashboard/DashboardPage.jsx";
import InventoryManagementPage from "./pages/Admin-Inventory/InventoryManagementPage.jsx";
import OrderManagementPage from "./pages/Admin-Orders/OrderManagementPage.jsx";
import PostManagementPage from "./pages/Admin-Posts/PostManagementPage.jsx";
import ProductManagementPage from "./pages/Admin-Products/ProductManagementPage.jsx";
import AdminProductFormPage from "./pages/Admin-Products/AdminProductFormPage.jsx";
import AdminProductDetailPage from "./pages/Admin-Products/AdminProductDetailPage.jsx";
import WarrantyManagementPage from "./pages/Admin-Warranty/WarrantyManagementPage.jsx";
import SalesWarrantyClaimsPage from "./pages/Admin-Warranty/SalesWarrantyClaimsPage.jsx";
import SalesWarrantyClaimDetailPage from "./pages/Admin-Warranty/SalesWarrantyClaimDetailPage.jsx";
import WarrantyInboundPage from "./pages/Admin-Warranty/WarrantyInboundPage.jsx";
import ImeiManagementPage from "./pages/Admin-Imei/ImeiManagementPage.jsx";
import ProductReturnListPage from "./pages/Admin-Warehouse/ProductReturnListPage.jsx";
import ProductReturnProcessPage from "./pages/Admin-Warehouse/ProductReturnProcessPage.jsx";
import PurchaseOrderListPage from "./pages/Admin-Warehouse/PurchaseOrderListPage.jsx";
import PurchaseOrderReceivePage from "./pages/Admin-Warehouse/PurchaseOrderReceivePage.jsx";
import PurchaseOrderAdminPage from "./pages/Admin-Warehouse/PurchaseOrderAdminPage.jsx";
import PurchaseOrderProcurementPage from "./pages/Admin-Warehouse/PurchaseOrderProcurementPage.jsx";
import WarehouseFulfillmentPage from "./pages/Admin-Warehouse/WarehouseFulfillmentPage.jsx";
import WarehouseOrderFulfillmentPage from "./pages/Admin-Warehouse/WarehouseOrderFulfillmentPage.jsx";
import InventoryAuditPage from "./pages/Admin-Warehouse/InventoryAuditPage.jsx";
import InventoryAuditApprovalPage from "./pages/Admin-Warehouse/InventoryAuditApprovalPage.jsx";
import RefundListPage from "./pages/Admin-Finance/RefundListPage.jsx";
import RefundProcessPage from "./pages/Admin-Finance/RefundProcessPage.jsx";
import RefundVoucherPage from "./pages/Admin-Finance/RefundVoucherPage.jsx";
import AdminFinancePage from "./pages/Admin-Finance/AdminFinancePage.jsx";
import AttributeManagementPage from "./pages/Admin-Attributes/AttributeManagementPage.jsx";
import CouponManagementPage from "./pages/Admin-Coupons/CouponManagementPage.jsx";
import ProducerManagementPage from "./pages/Admin-Producers/ProducerManagementPage.jsx";
import ReviewManagementPage from "./pages/Admin-Reviews/ReviewManagementPage.jsx";
import SalesOmnichannelPage from "./pages/Admin-Sales/SalesOmnichannelPage.jsx";
import SalesPipelinePage from "./pages/Admin-Sales/SalesPipelinePage.jsx";
import CustomerReturnRequestListPage from "./pages/Admin-Sales/CustomerReturnRequestListPage.jsx";
import SalesKpiConfigPage from "./pages/Admin-Sales/SalesKpiConfigPage.jsx";
import SalesProductConsultationPage from "./pages/Admin-Sales/SalesProductConsultationPage.jsx";



// Public Pages (No Login Required)
import WarrantyCheckPage from "./pages/Warranty-Check/WarrantyCheckPage.jsx";

// Redux
import { Provider } from "react-redux";
import AppSliceDemo from "./components/AppSliceDemo";
import RTKQueryDemo from "./components/RTKQueryDemo";
import { store } from "./redux/store";

import ProtectedRoute from "./components/Auth/ProtectedRoute.jsx";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const adminTheme = createTheme({
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 800 },
    h4: { fontWeight: 800 },
    h5: { fontWeight: 800 },
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 }
  }
});

function App() {
  return (
    <Provider store={store}>
      <Router>
        <div className="app">
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
          <Routes>
            {/* QR Scan Route - Không có Header/Footer (dùng trên điện thoại) */}
            <Route path="/scan-qr" element={<ScanQR />} />
            <Route path="/403" element={<AccessDenied />} />

            {/* Public Warranty Check - Không cần đăng nhập, không có Header/Footer */}
            <Route path="/warranty-check" element={<WarrantyCheckPage />} />

            {/* Admin Routes */}
            <Route
              path="/admin/*"
              element={
                <ThemeProvider theme={adminTheme}>
                  <ProtectedRoute requiredAny={["PRODUCT_VIEW", "CATEGORY_VIEW", "ORDER_VIEW_ALL", "INVENTORY_STAT", "USER_MANAGE", "CUSTOMER_VIEW", "BANNER_MANAGE", "POST_MANAGE", "REPORT_REVENUE", "REPORT_SALES", "WARRANTY_MANAGE", "IMEI_MANAGE", "STOCK_IMPORT", "STOCK_RETURN"]}>
                    <Routes>
                    <Route index element={<DashboardPage />} />
                    <Route path="products" element={
                      <ProtectedRoute requiredPermission="PRODUCT_VIEW">
                        <ProductManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="products/create" element={
                      <ProtectedRoute requiredPermission="PRODUCT_VIEW">
                        <AdminProductFormPage />
                      </ProtectedRoute>
                    } />
                    <Route path="products/:id" element={
                      <ProtectedRoute requiredPermission="PRODUCT_VIEW">
                        <AdminProductDetailPage />
                      </ProtectedRoute>
                    } />
                    <Route path="categories" element={
                      <ProtectedRoute requiredPermission="CATEGORY_VIEW">
                        <CategoryManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="attributes" element={
                      <ProtectedRoute requiredPermission="CATEGORY_VIEW">
                        <AttributeManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="orders" element={
                      <ProtectedRoute requiredPermission="ORDER_VIEW_ALL" excludeWarehouseOnly>
                        <OrderManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="inventory" element={
                      <ProtectedRoute requiredPermission="INVENTORY_STAT">
                        <InventoryManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="purchase-orders" element={
                      <ProtectedRoute requiredPermission="STOCK_IMPORT">
                        <PurchaseOrderListPage />
                      </ProtectedRoute>
                    } />
                    <Route path="purchase-orders/:id/receive" element={
                      <ProtectedRoute requiredPermission="STOCK_IMPORT">
                        <PurchaseOrderReceivePage />
                      </ProtectedRoute>
                    } />
                    <Route path="procurement" element={
                      <ProtectedRoute requiredPermission="PRODUCT_MANAGE">
                        <PurchaseOrderProcurementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="po-management" element={
                      <ProtectedRoute requiredPermission="PRODUCT_MANAGE">
                        <PurchaseOrderAdminPage />
                      </ProtectedRoute>
                    } />
                    <Route path="warehouse-fulfillment" element={
                      <ProtectedRoute requiredPermission="ORDER_ASSIGN_SHIPPING">
                        <WarehouseFulfillmentPage />
                      </ProtectedRoute>
                    } />
                    <Route path="warehouse-fulfillment/:orderId" element={
                      <ProtectedRoute requiredPermission="ORDER_ASSIGN_SHIPPING">
                        <WarehouseOrderFulfillmentPage />
                      </ProtectedRoute>
                    } />
                    <Route path="inventory-audit" element={
                      <ProtectedRoute requiredPermission="STOCK_IMPORT">
                        <InventoryAuditPage />
                      </ProtectedRoute>
                    } />
                    <Route path="inventory-audit-approval" element={
                      <ProtectedRoute requiredAny={["PRODUCT_MANAGE", "USER_MANAGE"]}>
                        <InventoryAuditApprovalPage />
                      </ProtectedRoute>
                    } />
                    <Route path="refunds" element={
                      <ProtectedRoute requiredAny={["REFUND_VIEW", "REFUND_BANK_INFO", "REFUND_APPROVE", "USER_MANAGE"]}>
                        <RefundListPage />
                      </ProtectedRoute>
                    } />
                    <Route path="refunds/:id" element={
                      <ProtectedRoute requiredAny={["REFUND_VIEW", "REFUND_BANK_INFO", "REFUND_APPROVE", "USER_MANAGE"]}>
                        <RefundProcessPage />
                      </ProtectedRoute>
                    } />
                    <Route path="refunds/:id/voucher" element={
                      <ProtectedRoute requiredAny={["REFUND_VIEW", "REFUND_BANK_INFO", "REFUND_APPROVE", "USER_MANAGE"]}>
                        <RefundVoucherPage />
                      </ProtectedRoute>
                    } />
                    <Route path="customers" element={
                      <ProtectedRoute requiredPermission="CUSTOMER_VIEW">
                        <CustomerProfilesPage />
                      </ProtectedRoute>
                    } />
                    <Route path="users" element={
                      <ProtectedRoute requiredPermission="USER_MANAGE">
                        <UserManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="banners" element={
                      <ProtectedRoute requiredPermission="BANNER_MANAGE">
                        <BannerManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="posts" element={
                      <ProtectedRoute requiredPermission="POST_MANAGE">
                        <PostManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="analytics" element={
                      <ProtectedRoute requiredAny={["REPORT_REVENUE", "REPORT_SALES"]}>
                        <AnalyticsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="finance" element={
                      <ProtectedRoute requiredPermission="REPORT_REVENUE">
                        <AdminFinancePage />
                      </ProtectedRoute>
                    } />
                    <Route path="warranty" element={
                      <ProtectedRoute requiredPermission="WARRANTY_MANAGE">
                        <WarrantyManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="warranty-claims" element={
                      <ProtectedRoute requiredAny={["WARRANTY_MANAGE", "CUSTOMER_VIEW"]}>
                        <SalesWarrantyClaimsPage />
                      </ProtectedRoute>
                    } />
                    <Route path="warranty-claims/:id" element={
                      <ProtectedRoute requiredAny={["WARRANTY_MANAGE", "CUSTOMER_VIEW"]}>
                        <SalesWarrantyClaimDetailPage />
                      </ProtectedRoute>
                    } />
                    <Route path="imei" element={
                      <ProtectedRoute requiredPermission="IMEI_MANAGE">
                        <ImeiManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="return" element={
                      <ProtectedRoute requiredPermission="STOCK_RETURN">
                        <ProductReturnListPage />
                      </ProtectedRoute>
                    } />
                    <Route path="return/:id" element={
                      <ProtectedRoute requiredPermission="STOCK_RETURN">
                        <ProductReturnProcessPage />
                      </ProtectedRoute>
                    } />
                    <Route path="warranty-inbound" element={
                      <ProtectedRoute requiredAny={["STOCK_IMPORT", "IMEI_MANAGE"]}>
                        <WarrantyInboundPage />
                      </ProtectedRoute>
                    } />
                    <Route path="sales/consultation" element={
                      <ProtectedRoute requiredPermission="PRODUCT_VIEW">
                        <SalesProductConsultationPage />
                      </ProtectedRoute>
                    } />
                    <Route path="sales/chat" element={
                      <ProtectedRoute requiredAny={["ORDER_VIEW_ALL", "CUSTOMER_VIEW", "WARRANTY_MANAGE"]}>
                        <SalesOmnichannelPage />
                      </ProtectedRoute>
                    } />
                    <Route path="sales/pipeline" element={
                      <ProtectedRoute requiredAny={["ORDER_VIEW_ALL", "REPORT_SALES"]}>
                        <SalesPipelinePage />
                      </ProtectedRoute>
                    } />
                    <Route path="sales/return-requests" element={
                      <ProtectedRoute requiredAny={["RETURN_REQUEST_REVIEW", "ORDER_VIEW_ALL", "USER_MANAGE"]}>
                        <CustomerReturnRequestListPage />
                      </ProtectedRoute>
                    } />
                    <Route path="sales/kpi-config" element={
                      <ProtectedRoute requiredAny={["USER_MANAGE", "ROLE_ADMIN"]}>
                        <SalesKpiConfigPage />
                      </ProtectedRoute>
                    } />
                    <Route path="coupons" element={
                      <ProtectedRoute requiredPermission="PRODUCT_MANAGE">
                        <CouponManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="producers" element={
                      <ProtectedRoute requiredPermission="PRODUCT_MANAGE">
                        <ProducerManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="reviews" element={
                      <ProtectedRoute requiredPermission="PRODUCT_MANAGE">
                        <ReviewManagementPage />
                      </ProtectedRoute>
                    } />


                    <Route path="settings" element={<div>Admin Settings Page</div>} />
                    </Routes>
                  </ProtectedRoute>
                </ThemeProvider>
              }
            />

            {/* User Routes - With Header/Footer/Navigation */}
            <Route
              path="/*"
              element={
                <>
                  <Header />
                  <Navigation />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      <Route path="/reset-password" element={<ResetPassword />} />
                      <Route path="/cart" element={<ShoppingCart />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/wishlist" element={<Wishlist />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/blog" element={<Blog />} />
                      <Route path="/faq" element={<FAQ />} />
                      <Route path="/chat-nhan-vien" element={<SalesLiveChatPage />} />
                      <Route path="/terms" element={<Terms />} />
                      <Route path="/checkout" element={<Checkout />} />
                      <Route path="/payment/success" element={<PaymentSuccess />} />
                      <Route path="/payment/failed" element={<PaymentFailed />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/profile/address" element={<AddressPage />} />
                      <Route path="/profile/password" element={<ChangePasswordPage />} />
                      <Route
                        path="/user/orders"
                        element={<OrderHistoryPage />}
                      />
                      <Route path="/user/warranty" element={<UserWarrantyPage />} />
                      <Route path="/user/warranty/:id" element={<UserWarrantyClaimDetailPage />} />
                      <Route path="/rtk-demo" element={<RTKQueryDemo />} />
                      <Route
                        path="/app-slice-demo"
                        element={<AppSliceDemo />}
                      />
                    </Routes>
                  </main>
                  <Footer />
                  <StoreChatbot />
                  <ScrollToTop />
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </Provider>
  );
}
export default App;
