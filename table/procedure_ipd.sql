CREATE TABLE `procedure_ipd` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(100) NOT NULL DEFAULT '',
  `an` varchar(100) NOT NULL DEFAULT '',
  `datetime_admit` varchar(100) NOT NULL DEFAULT '',
  `wardstay` varchar(255) NOT NULL DEFAULT '',
  `procedcode` varchar(100) NOT NULL DEFAULT '',
  `timestart` varchar(100) NOT NULL DEFAULT '',
  `timefinish` varchar(255) NOT NULL DEFAULT '',
  `serviceprice` varchar(255) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`procedcode`,`timestart`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
