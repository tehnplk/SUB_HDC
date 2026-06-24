CREATE TABLE `refer_result` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_source` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `hosp_source` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `refer_result` varchar(255) NOT NULL DEFAULT '',
  `datetime_in` varchar(255) NOT NULL DEFAULT '',
  `pid_in` varchar(255) NOT NULL DEFAULT '',
  `an_in` varchar(255) NOT NULL DEFAULT '',
  `reason` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`hospcode`,`referid_source`,`hosp_source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
