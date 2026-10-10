// วันที่แฟ้ม F43 (ค.ศ.) → แสดงเป็น พ.ศ.; ค่าที่ไม่ตรงรูปแบบคืนตามเดิม (ว่าง → empty)

// YYYYMMDD → DD/MM/YYYY(พ.ศ.)
export function formatThaiDate(value, empty = "") {
  if (!/^\d{8}$/.test(value)) return value || empty;
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${Number(value.slice(0, 4)) + 543}`;
}

// YYYYMMDD[HHMM...] → DD/MM/YYYY(พ.ศ.) [HH:MM]
export function formatThaiDateTime(value, empty = "") {
  if (!/^\d{8}/.test(value)) return value || empty;
  const date = formatThaiDate(value.slice(0, 8));
  return value.length >= 12 ? `${date} ${value.slice(8, 10)}:${value.slice(10, 12)}` : date;
}
