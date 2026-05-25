import { useState, useEffect, useMemo } from "react";
import {
  Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography, Tooltip, CircularProgress, Chip, Avatar, Divider, Fade,
  InputAdornment, Stack, Alert
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocalOffer as TagIcon,
  FormatListBulleted as ListIcon,
  ChevronRight as ChevronRightIcon,
  SettingsSuggest as SuggestIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  LightbulbCircle as TipIcon,
  Category as CategoryIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import AdminLayout from "../../components/Admin-Layout/AdminLayout";
import {
  adminGetAttributes, adminCreateAttribute, adminUpdateAttribute, adminDeleteAttribute,
  adminGetAttributeValuesByAttrId, adminCreateAttributeValue, adminUpdateAttributeValue, adminDeleteAttributeValue
} from "../../services/attributeService";

const AttributeManagementPage = () => {
  const [attributes, setAttributes] = useState([]);
  const [selectedAttribute, setSelectedAttribute] = useState(null);
  const [attributeValues, setAttributeValues] = useState([]);

  // Search states
  const [attrSearch, setAttrSearch] = useState("");
  const [valSearch, setValSearch] = useState("");

  // Loaders
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);

  // Modals
  const [attrModal, setAttrModal] = useState({ open: false, mode: "add", data: null, name: "" });
  const [valModal, setValModal] = useState({ open: false, mode: "add", data: null, value: "" });

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    setLoadingAttributes(true);
    try {
      const data = await adminGetAttributes();
      setAttributes(data || []);
      if (!selectedAttribute && data && data.length > 0) {
        handleSelectAttribute(data[0]);
      } else if (selectedAttribute) {
        fetchValues(selectedAttribute.id);
      }
    } catch (error) {
      toast.error("Lỗi khi tải danh sách thuộc tính");
    } finally {
      setLoadingAttributes(false);
    }
  };

  const fetchValues = async (attrId) => {
    setLoadingValues(true);
    try {
      const data = await adminGetAttributeValuesByAttrId(attrId);
      setAttributeValues(data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh sách giá trị thuộc tính");
    } finally {
      setLoadingValues(false);
    }
  };

  const handleSelectAttribute = (attr) => {
    setSelectedAttribute(attr);
    setValSearch("");
    fetchValues(attr.id);
  };

  const filteredAttributes = useMemo(() => {
    return attributes.filter(a => a.name.toLowerCase().includes(attrSearch.toLowerCase()));
  }, [attributes, attrSearch]);

  const filteredValues = useMemo(() => {
    return attributeValues.filter(v => v.value.toLowerCase().includes(valSearch.toLowerCase()));
  }, [attributeValues, valSearch]);

  const handleSaveAttribute = async () => {
    if (!attrModal.name.trim()) return toast.warning("Tên thuộc tính không được để trống");
    try {
      let res;
      if (attrModal.mode === "add") {
        res = await adminCreateAttribute(attrModal.name);
      } else {
        res = await adminUpdateAttribute(attrModal.data.id, attrModal.name);
      }
      
      if (res?.success) {
        toast.success(res.message || "Lưu thuộc tính thành công");
        setAttrModal({ open: false, mode: "add", data: null, name: "" });
        fetchAttributes();
      }
    } catch (error) {
      toast.error("Xảy ra lỗi khi lưu");
    }
  };

  const handleDeleteAttribute = async (attr) => {
    if (!window.confirm(`Xóa vĩnh viễn thuộc tính "${attr.name}"?`)) return;
    try {
      const res = await adminDeleteAttribute(attr.id);
      if (res?.success) {
        toast.success("Đã xoá");
        if (selectedAttribute?.id === attr.id) {
          setSelectedAttribute(null);
          setAttributeValues([]);
        }
        fetchAttributes();
      }
    } catch (error) {
      toast.error("Không thể xoá thuộc tính đang sử dụng.");
    }
  };

  const handleSaveValue = async () => {
    if (!valModal.value.trim()) return toast.warning("Giá trị không được để trống");
    try {
      let res;
      if (valModal.mode === "add") {
        res = await adminCreateAttributeValue(selectedAttribute.id, valModal.value);
      } else {
        res = await adminUpdateAttributeValue(valModal.data.id, selectedAttribute.id, valModal.value);
      }
      if (res?.success) {
        toast.success("Đã lưu giá trị");
        setValModal({ open: false, mode: "add", data: null, value: "" });
        fetchValues(selectedAttribute.id);
      }
    } catch (error) {
      toast.error("Lỗi khi lưu");
    }
  };

  const handleDeleteValue = async (val) => {
    if (!window.confirm(`Xoá giá trị "${val.value}"?`)) return;
    try {
      const res = await adminDeleteAttributeValue(val.id);
      if (res?.success) {
        toast.success("Đã xoá");
        fetchValues(selectedAttribute.id);
      }
    } catch (error) {
      toast.error("Giá trị đang được sử dụng.");
    }
  };

  return (
    <AdminLayout currentPage="Thuộc tính">
      <Box sx={{ p: { xs: 2, md: 3 }, minHeight: '100%' }}>
        
        {/* ═══ PAGE HEADER ═══ */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              ⚙️ Quản Lý Thuộc Tính
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cấu hình các loại thuộc tính và giá trị biến thể cho sản phẩm (Màu sắc, Dung lượng, ...)
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAttrModal({ open: true, mode: "add", data: null, name: "" })}
            sx={{
              bgcolor: "#ff9f1a",
              "&:hover": { bgcolor: "#e68a00" },
              px: 3, py: 1.2, borderRadius: "10px", fontWeight: "bold",
              textTransform: "none", fontSize: "1rem",
              boxShadow: "0 4px 12px rgba(255,159,26,0.3)",
            }}
          >
            Thêm Thuộc Tính
          </Button>
        </Box>

        {/* ═══ STATS CARDS — Matching Product/Category Style ═══ */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 3, mb: 3 }}>
          {/* Total attribute types */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(102,126,234,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Tổng loại thuộc tính
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loadingAttributes ? <CircularProgress size={36} color="inherit" /> : attributes.length}
                  </Typography>
                </Box>
                <TagIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Current values count */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(17,153,142,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Giá trị đang chọn
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {loadingValues ? <CircularProgress size={36} color="inherit" /> : (selectedAttribute ? attributeValues.length : '—')}
                  </Typography>
                </Box>
                <ListIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Info tip card */}
          <Card
            sx={{
              borderRadius: "16px",
              background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              color: "white",
              boxShadow: "0 8px 32px rgba(245,87,108,0.3)",
              transition: "transform 0.2s",
              "&:hover": { transform: "translateY(-4px)" },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                    Hướng dẫn
                  </Typography>
                  <Typography variant="body2" fontWeight="600" sx={{ mt: 0.5, opacity: 0.95, lineHeight: 1.5 }}>
                    Thuộc tính (VD: Màu sắc) → Giá trị (VD: Đỏ, Xanh). Xuất hiện trong bộ lọc & biến thể.
                  </Typography>
                </Box>
                <TipIcon sx={{ fontSize: 56, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ═══ MAIN TWO-PANEL INTERFACE ═══ */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'stretch' }}>
          {/* LEFT PANEL: Attribute List */}
          <Box sx={{ width: 340, flexShrink: 0 }}>
            <Card sx={{ 
              borderRadius: "12px", 
              overflow: 'hidden',
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: '1px solid #e2e8f0',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Panel header */}
              <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Danh sách thuộc tính
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Tìm thuộc tính..."
                  value={attrSearch}
                  onChange={(e) => setAttrSearch(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    sx: { 
                      borderRadius: 2, 
                      bgcolor: 'white',
                      '& fieldset': { borderColor: '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#cbd5e0' }
                    }
                  }}
                />
              </Box>

              {/* Attribute items */}
              <Box sx={{ 
                flex: 1, overflowY: 'auto', p: 1.5,
                '&::-webkit-scrollbar': { width: '5px' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: '10px' },
              }}>
                {loadingAttributes ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={30} /></Box>
                ) : filteredAttributes.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="body2" color="text.secondary">Không tìm thấy thuộc tính nào</Typography>
                  </Box>
                ) : (
                  <Stack spacing={0.5}>
                    {filteredAttributes.map((attr) => {
                      const isSelected = selectedAttribute?.id === attr.id;
                      return (
                        <Box
                          key={attr.id}
                          onClick={() => handleSelectAttribute(attr)}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            p: 1.5, px: 2, borderRadius: 2, cursor: 'pointer', 
                            transition: 'all 0.2s ease',
                            bgcolor: isSelected ? '#ff9f1a' : 'transparent',
                            color: isSelected ? 'white' : '#1e293b',
                            boxShadow: isSelected ? '0 4px 12px rgba(255, 159, 26, 0.35)' : 'none',
                            '&:hover': { 
                              bgcolor: isSelected ? '#e68a00' : '#f1f5f9',
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ 
                              width: 32, height: 32, 
                              bgcolor: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                              color: isSelected ? 'white' : '#64748b',
                              fontSize: '0.85rem', fontWeight: 'bold'
                            }}>
                              {attr.name?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <Typography fontWeight={isSelected ? "800" : "600"} sx={{ fontSize: '0.9rem' }}>
                              {attr.name}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {isSelected && (
                              <>
                                <IconButton size="small" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setAttrModal({ open: true, mode: "edit", data: attr, name: attr.name }); 
                                }} sx={{ color: 'white', p: 0.5 }}>
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                                <IconButton size="small" onClick={(e) => { 
                                  e.stopPropagation(); 
                                  handleDeleteAttribute(attr); 
                                }} sx={{ color: 'rgba(255,255,255,0.75)', p: 0.5 }}>
                                  <DeleteIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </>
                            )}
                            {!isSelected && <ChevronRightIcon sx={{ fontSize: 18, color: '#cbd5e0' }} />}
                          </Box>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            </Card>
          </Box>

          {/* RIGHT PANEL: Values Table */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Card sx={{ 
              borderRadius: "12px", 
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)", 
              border: '1px solid #e2e8f0', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {selectedAttribute ? (
                <Fade in={true} timeout={400}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    
                    {/* Right panel top bar */}
                    <Box sx={{ 
                      p: 2.5, display: 'flex', flexWrap: 'wrap', gap: 2, 
                      justifyContent: 'space-between', alignItems: 'center', 
                      bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ 
                          bgcolor: '#ff9f1a', width: 40, height: 40, 
                          boxShadow: '0 4px 10px rgba(255,159,26,0.3)',
                          fontSize: '1rem', fontWeight: 'bold'
                        }}>
                          <TuneIcon sx={{ fontSize: 22 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="800" color="#0f172a">
                            {selectedAttribute.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">
                            {attributeValues.length} giá trị · ID: {selectedAttribute.id}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Stack direction="row" spacing={1.5}>
                        <TextField
                          size="small"
                          placeholder="Tìm giá trị..."
                          value={valSearch}
                          onChange={(e) => setValSearch(e.target.value)}
                          InputProps={{
                            startAdornment: <SearchIcon sx={{ color: '#94a3b8', mr: 1, fontSize: 18 }} />,
                            sx: { borderRadius: 2, bgcolor: 'white', width: 200, '& fieldset': { borderColor: '#e2e8f0' } }
                          }}
                        />
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />}
                          onClick={() => setValModal({ open: true, mode: "add", data: null, value: "" })}
                          sx={{ 
                            borderRadius: 2, 
                            bgcolor: '#ff9f1a', 
                            "&:hover": { bgcolor: '#e68a00' },
                            fontWeight: 'bold',
                            textTransform: 'none',
                            px: 2.5,
                            boxShadow: '0 4px 12px rgba(255,159,26,0.3)',
                          }}
                        >
                          Thêm Giá Trị
                        </Button>
                      </Stack>
                    </Box>

                    {/* Values table */}
                    <Box sx={{ flexGrow: 1 }}>
                      {loadingValues ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 12 }}>
                          <CircularProgress color="warning" />
                        </Box>
                      ) : (
                        <TableContainer>
                          <Table sx={{ tableLayout: 'fixed' }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', py: 2, px: 3, width: '8%' }}>STT</TableCell>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', py: 2, width: '50%' }}>Giá trị</TableCell>
                                <TableCell sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', py: 2, width: '25%' }}>Mã giá trị</TableCell>
                                <TableCell align="right" sx={{ bgcolor: '#f8fafc', fontWeight: 'bold', color: '#64748b', py: 2, px: 3, width: '17%' }}>Thao tác</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {filteredValues.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={4} align="center" sx={{ py: 10, border: 0 }}>
                                    <SuggestIcon sx={{ fontSize: 64, color: '#cbd5e0', mb: 1 }} />
                                    <Typography variant="h6" fontWeight="700" color="text.secondary">
                                      Chưa có giá trị nào
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      Thêm giá trị mới hoặc thay đổi bộ lọc
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredValues.map((val, index) => (
                                  <TableRow 
                                    key={val.id} 
                                    hover 
                                    sx={{ 
                                      bgcolor: index % 2 === 0 ? 'white' : '#fafbfc',
                                      '&:hover': { bgcolor: '#f0f4ff' }, 
                                      transition: 'background 0.15s',
                                    }}
                                  >
                                    <TableCell sx={{ py: 2, px: 3 }}>
                                      <Typography variant="body2" fontWeight="700" color="#94a3b8">
                                        {String(index + 1).padStart(2, '0')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Box sx={{ 
                                          width: 4, height: 28, borderRadius: 2, 
                                          bgcolor: '#ff9f1a',
                                          flexShrink: 0,
                                        }} />
                                        <Typography variant="subtitle2" fontWeight="700" color="#1e293b">
                                          {val.value}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Chip 
                                        label={`ID: ${val.id}`} 
                                        size="small"
                                        sx={{ 
                                          fontWeight: '600', 
                                          bgcolor: '#f1f5f9', 
                                          color: '#64748b',
                                          fontSize: '0.75rem',
                                          fontFamily: 'monospace',
                                        }} 
                                      />
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 2, px: 3 }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <Tooltip title="Chỉnh sửa">
                                          <IconButton 
                                            size="small" 
                                            onClick={() => setValModal({ open: true, mode: "edit", data: val, value: val.value })}
                                            color="warning"
                                          >
                                            <EditIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xoá">
                                          <IconButton 
                                            size="small" 
                                            onClick={() => handleDeleteValue(val)}
                                            color="error"
                                          >
                                            <DeleteIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Box>
                  </Box>
                </Fade>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 6, textAlign: 'center', minHeight: 400 }}>
                  <Avatar sx={{ width: 80, height: 80, bgcolor: '#fff3e0', mb: 3 }}>
                    <TuneIcon sx={{ fontSize: 40, color: '#ff9f1a' }} />
                  </Avatar>
                  <Typography variant="h5" fontWeight="800" color="#1e293b" gutterBottom>
                    Chọn thuộc tính
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, lineHeight: 1.6 }}>
                    Vui lòng chọn một loại thuộc tính từ danh sách bên trái để quản lý và cấu hình các giá trị biến thể.
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>
        </Box>
      </Box>

      {/* ═══ Modal: Thêm/Sửa Thuộc tính ═══ */}
      <Dialog 
        open={attrModal.open} 
        onClose={() => setAttrModal({ ...attrModal, open: false })} 
        PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' } }} 
        maxWidth="xs" fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', pb: 0.5 }}>
          {attrModal.mode === "add" ? "Thêm Thuộc Tính Mới" : "Chỉnh Sửa Thuộc Tính"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5 }}>
            Tên thuộc tính sẽ xuất hiện như nhãn trong bộ lọc sản phẩm (VD: Màu sắc, Dung lượng, RAM).
          </Typography>
          <TextField
            autoFocus fullWidth label="Tên thuộc tính" variant="outlined"
            value={attrModal.name} onChange={(e) => setAttrModal({ ...attrModal, name: e.target.value })}
            InputProps={{ sx: { borderRadius: 2 } }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveAttribute()}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setAttrModal({ ...attrModal, open: false })} sx={{ fontWeight: '600', textTransform: 'none', color: '#64748b' }}>Huỷ bỏ</Button>
          <Button onClick={handleSaveAttribute} variant="contained" sx={{ borderRadius: 2, bgcolor: '#ff9f1a', fontWeight: 'bold', px: 3, textTransform: 'none', "&:hover": { bgcolor: '#e68a00' } }}>
            {attrModal.mode === "add" ? "Tạo mới" : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Modal: Thêm/Sửa Giá trị ═══ */}
      <Dialog 
        open={valModal.open} 
        onClose={() => setValModal({ ...valModal, open: false })} 
        PaperProps={{ sx: { borderRadius: 4, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.2)' } }} 
        maxWidth="xs" fullWidth
      >
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.25rem', pb: 0.5 }}>
          {valModal.mode === "add" ? "Thêm Giá Trị Mới" : "Chỉnh Sửa Giá Trị"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2.5, p: 2, bgcolor: '#fff8f0', borderRadius: 2, border: '1px solid #ffe4c4' }}>
            <Typography variant="caption" color="#b37400" fontWeight="bold" display="block">THUỘC TÍNH CHA</Typography>
            <Typography variant="subtitle1" fontWeight="800" color="#8b5e00">{selectedAttribute?.name}</Typography>
          </Box>
          <TextField
            autoFocus fullWidth label="Giá trị" variant="outlined"
            value={valModal.value} onChange={(e) => setValModal({ ...valModal, value: e.target.value })}
            InputProps={{ sx: { borderRadius: 2 } }}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveValue()}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button onClick={() => setValModal({ ...valModal, open: false })} sx={{ fontWeight: '600', textTransform: 'none', color: '#64748b' }}>Huỷ bỏ</Button>
          <Button onClick={handleSaveValue} variant="contained" sx={{ borderRadius: 2, bgcolor: '#ff9f1a', fontWeight: 'bold', px: 3, textTransform: 'none', "&:hover": { bgcolor: '#e68a00' } }}>
            {valModal.mode === "add" ? "Tạo mới" : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
};

export default AttributeManagementPage;
