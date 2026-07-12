import * as XLSX from "xlsx";

const SERIAL_HEADER = /^(serial|serial\s*number|imei|mã\s*serial|ma\s*serial|số\s*serial|so\s*serial)$/i;
const SERIAL_VALUE = /^(ES\d{6,}|\d{12,20}|IMEI[\w-]*)/i;
const SKIP_SHEETS = /tom\s*t[âa]t|summary|tổng\s*hợp|tong\s*hop/i;

const normalizeCell = (value) => String(value ?? "").trim();

const isSerialValue = (value) => {
  const token = normalizeCell(value);
  if (!token || token.length > 100) return false;
  return SERIAL_VALUE.test(token);
};

const addSerial = (value, codes, seen) => {
  const token = normalizeCell(value);
  if (!isSerialValue(token)) return;
  const key = token.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  codes.push(token);
};

const findSerialColumn = (rows) => {
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r].map(normalizeCell);
    const idx = row.findIndex((h) => SERIAL_HEADER.test(h));
    if (idx >= 0) return { headerRow: r, colIndex: idx };
  }
  return null;
};

const parseSheet = (sheet, sheetName) => {
  if (SKIP_SHEETS.test(sheetName)) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (!rows.length) return [];

  const codes = [];
  const seen = new Set();
  const header = findSerialColumn(rows);

  if (header) {
    for (let i = header.headerRow + 1; i < rows.length; i++) {
      addSerial(rows[i][header.colIndex], codes, seen);
    }
    return codes;
  }

  // Không có header: quét mọi ô, ưu tiên cột có nhiều mã serial nhất
  const colScores = new Map();
  for (const row of rows) {
    row.forEach((cell, colIdx) => {
      if (isSerialValue(cell)) {
        colScores.set(colIdx, (colScores.get(colIdx) || 0) + 1);
      }
    });
  }

  if (colScores.size > 0) {
    const bestCol = [...colScores.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const row of rows) {
      addSerial(row[bestCol], codes, seen);
    }
    return codes;
  }

  for (const row of rows) {
    for (const cell of row) {
      addSerial(cell, codes, seen);
    }
  }
  return codes;
};

/**
 * Đọc file Excel (.xlsx/.xls) và trích danh sách Serial/IMEI.
 * Hỗ trợ file export từ Electro Store (cột "Serial") hoặc file 1 cột mã.
 */
export const parseSerialsFromExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const codes = [];
  const seen = new Set();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    for (const serial of parseSheet(sheet, sheetName)) {
      const key = serial.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        codes.push(serial);
      }
    }
  }

  return codes;
};
