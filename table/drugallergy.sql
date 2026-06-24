CREATE TABLE `drugallergy` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `daterecord` varchar(255) NOT NULL DEFAULT '',
  `drugallergy` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `typedx` varchar(255) NOT NULL DEFAULT '',
  `alevel` varchar(255) NOT NULL DEFAULT '',
  `symptom` varchar(255) NOT NULL DEFAULT '',
  `informant` varchar(255) NOT NULL DEFAULT '',
  `informhosp` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`hospcode`,`pid`,`drugallergy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
