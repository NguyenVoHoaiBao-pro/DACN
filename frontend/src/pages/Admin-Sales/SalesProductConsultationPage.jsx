/**
 * Redirect cũ → Tư vấn nằm trong mục Tồn kho (/admin/inventory)
 */
import { Navigate } from "react-router-dom";

const SalesProductConsultationPage = () => <Navigate to="/admin/inventory" replace />;

export default SalesProductConsultationPage;
