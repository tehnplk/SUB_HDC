CREATE TABLE `anc` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `gravida` varchar(255) NOT NULL DEFAULT '',
  `ancno` varchar(255) NOT NULL DEFAULT '',
  `ga` varchar(255) NOT NULL DEFAULT '',
  `ancresult` varchar(255) NOT NULL DEFAULT '',
  `ancplace` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `weight` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_serv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
