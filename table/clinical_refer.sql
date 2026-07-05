CREATE TABLE `clinical_refer` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `referid` varchar(255) NOT NULL DEFAULT '',
  `referid_province` varchar(255) NOT NULL DEFAULT '',
  `datetime_assess` varchar(255) NOT NULL DEFAULT '',
  `clinicalcode` varchar(255) NOT NULL DEFAULT '',
  `clinicalname` varchar(255) NOT NULL DEFAULT '',
  `clinicalvalue` varchar(255) NOT NULL DEFAULT '',
  `clinicalresult` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`referid`,`datetime_assess`,`clinicalcode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
