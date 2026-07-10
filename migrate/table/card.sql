CREATE TABLE `card` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `instype_old` varchar(255) NOT NULL DEFAULT '',
  `instype_new` varchar(255) NOT NULL DEFAULT '',
  `insid` varchar(2000) NOT NULL DEFAULT '',
  `startdate` varchar(255) NOT NULL DEFAULT '',
  `expiredate` varchar(255) NOT NULL DEFAULT '',
  `main` varchar(255) NOT NULL DEFAULT '',
  `sub` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`instype_new`),
  KEY `idx_card_cid` (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
