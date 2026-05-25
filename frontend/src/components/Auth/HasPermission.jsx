import PropTypes from 'prop-types';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * Component Wrapper thực hiện Ẩn/Hiện giao diện dựa theo Quyền.
 * Không dùng CSS display:none mà loại bỏ hoàn toàn thẻ HTML khỏi DOM nếu không có quyền.
 * 
 * @param {string} permission - Mã quyền yêu cầu (VD: 'PRODUCT_CREATE')
 * @param {Array<string>} any - Danh sách mã quyền, User có 1 trong số này là được render
 * @param {Array<string>} all - Danh sách mã quyền, User phải có tất cả thì mới render
 * @param {ReactNode} children - Node giao diện con được bọc bên trong
 * @param {ReactNode} fallback - Giao diện thay thế nếu thiếu quyền (tùy chọn)
 */
const HasPermission = ({ permission, any, all, children, fallback = null }) => {
    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
    let isAllowed = false;

    if (permission && hasPermission(permission)) {
        isAllowed = true;
    } else if (any && any.length > 0 && hasAnyPermission(any)) {
        isAllowed = true;
    } else if (all && all.length > 0 && hasAllPermissions(all)) {
        isAllowed = true;
    }

    // Nếu User thiếu quyền ➡️ Trả về null hoặc fallback, loại bỏ HTML hoàn toàn!
    if (!isAllowed) {
        return fallback;
    }

    // Đủ quyền ➡️ Trả về component con
    return <>{children}</>;
};

HasPermission.propTypes = {
    permission: PropTypes.string,
    any: PropTypes.arrayOf(PropTypes.string),
    all: PropTypes.arrayOf(PropTypes.string),
    children: PropTypes.node.isRequired,
    fallback: PropTypes.node
};

export default HasPermission;
