// ลำดับการรัน transform แบบระบุชัด — แยกไฟล์ไว้ให้แก้ลำดับได้ที่เดียว
// ไฟล์ที่มี dependency ระหว่างกันต้องเรียงเอง ไม่พึ่งการเรียงตามชื่อ (t_person_dm_ht
// อ่าน t_person_type_1_3 เป็นต้นทาง จึงต้องรันหลัง แต่ชื่อ 'dm_ht' เรียงมาก่อน
// 'type_1_3' ตามตัวอักษร) ไฟล์ที่ไม่อยู่ในลิสต์นี้รันต่อท้ายโดยเรียงตามชื่อ —
// เพิ่มไฟล์ใหม่ที่มี dependency ต้องมาเพิ่มที่นี่
const path = require("node:path");

const RUN_ORDER = [
  "s_person_type_count.sql",
  "s_visit_montly.sql",
  "t_person_type_1_3.sql",
  "s_person_pyramid.sql",
  "t_person_dm_ht.sql",
];

// อันดับของไฟล์ใน RUN_ORDER (ไฟล์นอกลิสต์ = ท้ายสุด) ใช้เป็น sort key หลัก
function runOrderRank(file) {
  const i = RUN_ORDER.indexOf(path.basename(file).toLowerCase());
  return i === -1 ? RUN_ORDER.length : i;
}

module.exports = { RUN_ORDER, runOrderRank };
