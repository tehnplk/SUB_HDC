CREATE TABLE `clinical_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_assess` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinicalcode` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `clinicalname` varchar(255) NOT NULL DEFAULT '',
  `clinicalvalue` varchar(255) NOT NULL DEFAULT '',
  `clinicalresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_assess`,`clinicalcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
