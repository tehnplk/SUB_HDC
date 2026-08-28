-- ข้อมูลจำลองสำหรับเดโมชั้นข้อมูลกลุ่มเปราะบาง — กลุ่มละ 3 หมุด (รวม 9 คน)
-- ไม่ใช่ส่วนหนึ่งของ schema: apply เองเมื่อต้องการข้อมูลตัวอย่างเท่านั้น
--   docker exec -i sub_hdc_postgis psql -U postgres -d sub_hdc_gis -v ON_ERROR_STOP=1 < migrate/postgis/sample/vulnerable_sample.sql
-- ล้างข้อมูลจำลองออก:
--   DELETE FROM vulnerable WHERE pid LIKE 'SIM%';
--
-- พิกัดใช้ ST_PointOnSurface ของตำบล จึงตกอยู่ในเขตตำบลนั้นเสมอ
-- hospcode เป็น รพ.สต. จริงของตำบลนั้นใน อ.เมืองพิษณุโลก

INSERT INTO vulnerable (hospcode, pid, cid, fullname, sex, birth, vulnerable,
                        addr_no, road, village_code, village_name, geo_point)
SELECT d.hospcode, d.pid, d.cid, d.fullname, d.sex, d.birth, d.vulnerable,
       d.addr_no, d.road,
       substr(sb.code, 3) || d.moo,
       -- ตำบลที่ชื่อขึ้นต้นด้วย 'บ้าน' อยู่แล้วไม่ต้องเติมซ้ำ
       CASE WHEN sb.name_th LIKE 'บ้าน%' THEN sb.name_th ELSE 'บ้าน' || sb.name_th END,
       ST_PointOnSurface(sb.geom)
FROM (VALUES
  -- กลุ่ม 1 ผู้สูงอายุที่มีภาวะพึ่งพิง
  ('07476','SIM01','1650100000011','สมบูรณ์ ทองคำ','1',DATE '1943-04-17',1,'12/3','สายเอเชีย','วังน้ำคู้','02'),
  ('07477','SIM02','1650100000029','บุญเรือน แสงจันทร์','2',DATE '1946-11-02',1,'88','เลี่ยงเมือง','งิ้วงาม','04'),
  ('07478','SIM03','1650100000037','ประยูร มั่นคง','1',DATE '1940-01-25',1,'45/1','ริมน่าน','วัดจันทร์','01'),
  -- กลุ่ม 2 ผู้ป่วยติดเตียง
  ('07479','SIM04','1650100000045','จำเนียร ศรีสุข','2',DATE '1951-07-09',2,'7','พิษณุโลก-หล่มสัก','วัดพริก','03'),
  ('07481','SIM05','1650100000053','ทองใบ พุ่มพวง','2',DATE '1938-03-30',2,'109/5','ท่าทอง','ท่าทอง','05'),
  ('07482','SIM06','1650100000061','สุชิน บัวทอง','1',DATE '1955-09-14',2,'23','ท่าโพธิ์','ท่าโพธิ์','02'),
  -- กลุ่ม 3 ผู้พิการ
  ('07483','SIM07','1650100000079','อนงค์ ดวงแก้ว','2',DATE '1968-12-05',3,'56/2','สมอแข','สมอแข','06'),
  ('07484','SIM08','1650100000087','วิรัตน์ แก้วมณี','1',DATE '1972-06-21',3,'3','ดอนทอง','ดอนทอง','01'),
  ('07485','SIM09','1650100000095','ปราณี ใจงาม','2',DATE '1980-02-11',3,'77/8','บ้านป่า','บ้านป่า','04')
) AS d(hospcode, pid, cid, fullname, sex, birth, vulnerable, addr_no, road, tambon, moo)
JOIN subdistrict_boundary sb
  ON sb.district_code = 'TH6501' AND sb.name_th = d.tambon
ON CONFLICT (hospcode, pid) DO UPDATE SET
  cid = EXCLUDED.cid, fullname = EXCLUDED.fullname, sex = EXCLUDED.sex,
  birth = EXCLUDED.birth, vulnerable = EXCLUDED.vulnerable,
  addr_no = EXCLUDED.addr_no, road = EXCLUDED.road,
  village_code = EXCLUDED.village_code, village_name = EXCLUDED.village_name,
  geo_point = EXCLUDED.geo_point;
