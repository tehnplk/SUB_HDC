CREATE TABLE `chronic` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `date_diag` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `chronic` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `hosp_dx` varchar(255) NOT NULL DEFAULT '',
  `hosp_rx` varchar(255) NOT NULL DEFAULT '',
  `date_disch` varchar(255) NOT NULL DEFAULT '',
  `typedisch` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_diag`,`chronic`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
