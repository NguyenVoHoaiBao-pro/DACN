import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectUser, selectIsLoggedIn } from "../../redux/appSlice";
import { usePermissions } from "../../hooks/usePermissions";

/**
 * Route được bảo vệ bằng RBAC phân quyền. Bất kỳ User nào khi gõ URL trên trình duyệt đều sẽ đi qua đây.
 * Nếu User không có cái quyền yêu cầu, hệ thống đá văng về Home Route.
 */
const ProtectedRoute = ({
    children,
    requiredPermission = null,
    requiredAny = [],
    requiredAll = [],
    /** Chặn Nhân viên Kho thuần (không phải Admin/Sales) — dùng cho route ngoài thẩm quyền kho. */
    excludeWarehouseOnly = false,
}) => {
    const isLoggedIn = useSelector(selectIsLoggedIn);
    const user = useSelector(selectUser);
    const location = useLocation();
    const {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        isWarehouseUser,
        isAdminUser,
        isSalesUser,
    } = usePermissions();

    // 1. NGĂN CHẶN CƠ BẢN (CHƯA ĐĂNG NHẬP)
    if (!isLoggedIn) {
        // Lưu lại URL gốc để sau khi Login xong tự động nhảy lại đây
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 2. KHÔNG CÓ YÊU CẦU QUYỀN ĐẶC BIỆT THÌ CHO PASS (Chỉ cần đăng nhập là đủ)
    if (!requiredPermission && requiredAny.length === 0 && requiredAll.length === 0) {
        return children;
    }

    // 3. KIỂM TRA PHÂN QUYỀN CHI TIẾT THEO RBAC
    let isAuthorized = false;

    if (requiredPermission && hasPermission(requiredPermission)) {
        isAuthorized = true;
    } else if (requiredAny.length > 0 && hasAnyPermission(requiredAny)) {
        isAuthorized = true;
    } else if (requiredAll.length > 0 && hasAllPermissions(requiredAll)) {
        isAuthorized = true;
    }

    // Nếu không đủ Thẩm quyền / Permission -> Đá về Trang 403 hoặc Home
    if (!isAuthorized) {
        // Đá về trang báo lỗi "403 Access Denied"
        return <Navigate to="/403" replace />;
    }

    if (excludeWarehouseOnly && isWarehouseUser && !isAdminUser && !isSalesUser) {
        return <Navigate to="/admin" replace />;
    }

    // OK - ĐỒNG Ý CHO PHÉP ROUTER VẼ TIẾP VÀ CHẠY
    return children;
};

export default ProtectedRoute;
