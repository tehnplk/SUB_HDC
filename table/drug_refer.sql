CREATE TABLE `drug_refer` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_dstart` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `datetime_dfinish` varchar(255) NOT NULL DEFAULT '',
  `didstd` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `ddescription` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`hospcode`,`referid`,`datetime_dstart`,`didstd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
