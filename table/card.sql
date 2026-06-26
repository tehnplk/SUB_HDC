CREATE TABLE `card` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `instype_old` varchar(255) NOT NULL DEFAULT '',
  `instype_new` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `insid` varchar(255) NOT NULL DEFAULT '',
  `startdate` varchar(255) NOT NULL DEFAULT '',
  `expiredate` varchar(255) NOT NULL DEFAULT '',
  `main` varchar(255) NOT NULL DEFAULT '',
  `sub` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`instype_new`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
