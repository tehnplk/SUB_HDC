CREATE TABLE `investigation_refer` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `referid` varchar(255) NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_invest` varchar(255) NOT NULL DEFAULT '',
  `investcode` varchar(255) NOT NULL DEFAULT '',
  `investname` varchar(255) NOT NULL DEFAULT '',
  `datetime_report` varchar(255) NOT NULL DEFAULT '',
  `investvalue` varchar(255) NOT NULL DEFAULT '',
  `investresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_invest`,`investcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
