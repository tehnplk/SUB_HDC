CREATE TABLE `women` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `fptype` varchar(255) NOT NULL DEFAULT '',
  `nofpcause` varchar(255) NOT NULL DEFAULT '',
  `totalson` varchar(255) NOT NULL DEFAULT '',
  `numberson` varchar(255) NOT NULL DEFAULT '',
  `abortion` varchar(255) NOT NULL DEFAULT '',
  `stillbirth` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
