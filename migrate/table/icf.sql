CREATE TABLE `icf` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `disabid` varchar(255) NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `seq` varchar(255) NOT NULL DEFAULT '',
  `date_serv` varchar(8) NOT NULL DEFAULT '',
  `icf` varchar(255) NOT NULL DEFAULT '',
  `qualifier` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`seq`,`icf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
