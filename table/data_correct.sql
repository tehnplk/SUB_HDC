CREATE TABLE `data_correct` (
  `hospcode` varchar(5) NOT NULL DEFAULT '',
  `tablename` varchar(255) NOT NULL DEFAULT '',
  `data_correct` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`d_update`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
