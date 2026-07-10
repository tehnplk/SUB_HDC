CREATE TABLE `charge_ipd` (
  `hospcode` varchar(10) NOT NULL DEFAULT '',
  `pid` varchar(100) NOT NULL DEFAULT '',
  `an` varchar(100) NOT NULL DEFAULT '',
  `datetime_admit` varchar(100) NOT NULL DEFAULT '',
  `wardstay` varchar(255) NOT NULL DEFAULT '',
  `chargeitem` varchar(100) NOT NULL DEFAULT '',
  `chargelist` varchar(100) NOT NULL DEFAULT '',
  `quantity` varchar(255) NOT NULL DEFAULT '',
  `instype` varchar(100) NOT NULL DEFAULT '',
  `cost` varchar(255) NOT NULL DEFAULT '',
  `price` varchar(255) NOT NULL DEFAULT '',
  `payprice` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `cid` varchar(255) NOT NULL DEFAULT '',
  `cid_aes` varchar(2000) NOT NULL DEFAULT '',
  `log_import_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`hospcode`,`pid`,`an`,`datetime_admit`,`chargeitem`,`chargelist`,`instype`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
