CREATE TABLE `diagnosis_ipd` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(100) NOT NULL DEFAULT '',
  `an` varchar(100) NOT NULL DEFAULT '',
  `datetime_admit` varchar(100) NOT NULL DEFAULT '',
  `warddiag` varchar(255) NOT NULL DEFAULT '',
  `diagtype` varchar(255) NOT NULL DEFAULT '',
  `diagcode` varchar(100) NOT NULL DEFAULT '',
  `provider` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`diagcode`),
  KEY `idx_diagnosis_ipd_diagcode_admit_cid` (`diagcode`,`datetime_admit`,`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
