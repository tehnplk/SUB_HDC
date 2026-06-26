CREATE TABLE `postnatal` (
  `hospcode` varchar(5) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `pid` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `gravida` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `bdate` varchar(255) NOT NULL DEFAULT '',
  `ppcare` varchar(255) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL DEFAULT '',
  `ppplace` varchar(255) NOT NULL DEFAULT '',
  `ppresult` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`gravida`,`ppcare`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
