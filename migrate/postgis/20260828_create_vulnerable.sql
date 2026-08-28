-- ทะเบียนกลุ่มเปราะบางรายคนพร้อมพิกัด + lookup ประเภทกลุ่มเปราะบาง
-- ฐานนี้เป็น PostGIS (sub_hdc_postgis) คนละตัวกับ MariaDB ที่เก็บแฟ้มดิบ F43
-- lookup อยู่ที่นี่ด้วยเพราะ API ของโมดูล GIS join ข้ามฐานไปหา c_* ของ MariaDB ไม่ได้
-- migrate container ไม่ได้รันไฟล์นี้ให้ ต้อง apply เองด้วย psql (ดู handoff)
-- รันซ้ำได้ ไม่ทำลายข้อมูลเดิม

-- lookup ประเภทกลุ่มเปราะบาง — is_active: 1 = ใช้งาน, 0 = ยกเลิก (สเปกเดียวกับ c_* ของ MariaDB)
CREATE TABLE IF NOT EXISTS public.c_vulnerable (
  id        smallint     NOT NULL,
  name      varchar(120) NOT NULL,
  -- ชื่อ icon ของหมุดบนแผนที่ ต้องมีใน PIN_ICONS ของ components/gis-map.jsx
  -- (ชื่อตาม lucide) ถ้าไม่ตรงจะใช้ icon ตั้งต้นแทน
  icon      varchar(40),
  is_active smallint     NOT NULL DEFAULT 1,
  CONSTRAINT c_vulnerable_pkey PRIMARY KEY (id)
);
ALTER TABLE public.c_vulnerable ADD COLUMN IF NOT EXISTS icon varchar(40);

INSERT INTO public.c_vulnerable (id, name, icon) VALUES
  (1, 'ผู้สูงอายุที่มีภาวะพึ่งพิง', 'hand-helping'),
  (2, 'ผู้ป่วยติดเตียง', 'bed'),
  (3, 'ผู้พิการ', 'accessibility')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- ของเดิมชื่อ vulnerable_person / คอลัมน์ group_name — ย้ายชื่อโดยไม่ทิ้งข้อมูล
DO $$
BEGIN
  IF to_regclass('public.vulnerable_person') IS NOT NULL
     AND to_regclass('public.vulnerable') IS NULL THEN
    ALTER TABLE public.vulnerable_person RENAME TO vulnerable;
    ALTER INDEX IF EXISTS vulnerable_person_pkey RENAME TO vulnerable_pkey;
    ALTER INDEX IF EXISTS vulnerable_person_cid_idx RENAME TO vulnerable_cid_idx;
    ALTER INDEX IF EXISTS vulnerable_person_geo_point_idx RENAME TO vulnerable_geo_point_idx;
    DROP INDEX IF EXISTS vulnerable_person_group_name_idx;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'vulnerable' AND column_name = 'group_name'
  ) THEN
    ALTER TABLE public.vulnerable RENAME COLUMN group_name TO vulnerable;
    -- คอลัมน์นี้เก็บ c_vulnerable.id แล้ว ไม่ใช่ชื่อกลุ่มแบบเดิม
    ALTER TABLE public.vulnerable
      ALTER COLUMN vulnerable TYPE smallint USING NULLIF(vulnerable, '')::smallint;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.vulnerable (
  hospcode   varchar(5)  NOT NULL,
  pid        varchar(15) NOT NULL,
  cid        varchar(13),
  fullname   varchar(255),
  sex        varchar(1),
  birth      date,
  -- soft reference ไป c_vulnerable.id — ทั้ง schema ไม่ใช้ foreign key
  vulnerable smallint,
  addr_no      varchar(20),
  road         varchar(120),
  -- รหัสหมู่บ้าน 8 หลักตามมาตรฐาน 43 แฟ้ม (จังหวัด2 อำเภอ2 ตำบล2 หมู่2)
  village_code varchar(8),
  village_name varchar(120),
  geo_point  geometry(Point, 4326),
  CONSTRAINT vulnerable_pkey PRIMARY KEY (hospcode, pid)
);

-- ตารางที่สร้างไปแล้วบนเครื่องอื่นต้องได้คอลัมน์ที่อยู่ด้วย
ALTER TABLE public.vulnerable ADD COLUMN IF NOT EXISTS addr_no varchar(20);
ALTER TABLE public.vulnerable ADD COLUMN IF NOT EXISTS road varchar(120);
ALTER TABLE public.vulnerable ADD COLUMN IF NOT EXISTS village_code varchar(8);
ALTER TABLE public.vulnerable ADD COLUMN IF NOT EXISTS village_name varchar(120);

CREATE INDEX IF NOT EXISTS vulnerable_cid_idx
  ON public.vulnerable (cid);
CREATE INDEX IF NOT EXISTS vulnerable_vulnerable_idx
  ON public.vulnerable (vulnerable);
CREATE INDEX IF NOT EXISTS vulnerable_village_code_idx
  ON public.vulnerable (village_code);
CREATE INDEX IF NOT EXISTS vulnerable_geo_point_idx
  ON public.vulnerable USING gist (geo_point);
