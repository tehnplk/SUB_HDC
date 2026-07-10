CREATE TABLE `chronic` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(255) NOT NULL DEFAULT '',
  `date_diag` varchar(255) NOT NULL DEFAULT '',
  `chronic` varchar(255) NOT NULL DEFAULT '',
  `hosp_dx` varchar(255) NOT NULL DEFAULT '',
  `hosp_rx` varchar(255) NOT NULL DEFAULT '',
  `date_disch` varchar(255) NOT NULL DEFAULT '',
  `typedisch` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`date_diag`,`chronic`),
  KEY `idx_chronic_chronic_cid` (`chronic`,`cid`),
  KEY `idx_chronic_cid` (`cid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
