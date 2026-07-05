CREATE TABLE `drug_refer` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `referid` varchar(255) NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_dstart` varchar(255) NOT NULL DEFAULT '',
  `datetime_dfinish` varchar(255) NOT NULL DEFAULT '',
  `didstd` varchar(255) NOT NULL DEFAULT '',
  `dname` varchar(255) NOT NULL DEFAULT '',
  `ddescription` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_dstart`,`didstd`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
