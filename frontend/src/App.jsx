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
import Home from "./pages/Home";
import OrderHistoryPage from "./pages/Order-Management/OrderHistoryPage.jsx";
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
import DashboardPage from "./pages/Admin-Dashboard/DashboardPage.jsx";
import InventoryManagementPage from "./pages/Admin-Inventory/InventoryManagementPage.jsx";
import OrderManagementPage from "./pages/Admin-Orders/OrderManagementPage.jsx";
import PostManagementPage from "./pages/Admin-Posts/PostManagementPage.jsx";
import ProductManagementPage from "./pages/Admin-Products/ProductManagementPage.jsx";
import AdminProductFormPage from "./pages/Admin-Products/AdminProductFormPage.jsx";
import AdminProductDetailPage from "./pages/Admin-Products/AdminProductDetailPage.jsx";
import WarrantyManagementPage from "./pages/Admin-Warranty/WarrantyManagementPage.jsx";
import ImeiManagementPage from "./pages/Admin-Imei/ImeiManagementPage.jsx";
import StockReturnPage from "./pages/Admin-Inventory/StockReturnPage.jsx";
import AttributeManagementPage from "./pages/Admin-Attributes/AttributeManagementPage.jsx";
import CouponManagementPage from "./pages/Admin-Coupons/CouponManagementPage.jsx";
import ProducerManagementPage from "./pages/Admin-Producers/ProducerManagementPage.jsx";
import ReviewManagementPage from "./pages/Admin-Reviews/ReviewManagementPage.jsx";



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
                  <ProtectedRoute requiredAny={["PRODUCT_VIEW", "CATEGORY_VIEW", "ORDER_VIEW_ALL", "INVENTORY_STAT", "USER_MANAGE", "CUSTOMER_VIEW", "BANNER_MANAGE", "POST_MANAGE", "REPORT_REVENUE", "REPORT_SALES", "WARRANTY_MANAGE", "IMEI_MANAGE"]}>
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
                      <ProtectedRoute requiredPermission="ORDER_VIEW_ALL">
                        <OrderManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="inventory" element={
                      <ProtectedRoute requiredPermission="INVENTORY_STAT">
                        <InventoryManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="users" element={
                      <ProtectedRoute requiredAny={["USER_MANAGE", "CUSTOMER_VIEW"]}>
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
                    <Route path="warranty" element={
                      <ProtectedRoute requiredPermission="WARRANTY_MANAGE">
                        <WarrantyManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="imei" element={
                      <ProtectedRoute requiredPermission="IMEI_MANAGE">
                        <ImeiManagementPage />
                      </ProtectedRoute>
                    } />
                    <Route path="return" element={
                      <ProtectedRoute requiredPermission="STOCK_RETURN">
                        <StockReturnPage />
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
