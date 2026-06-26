CREATE TABLE `policy` (
  `hospcode` varchar(5) NOT NULL DEFAULT '',
  `policy_id` varchar(255) NOT NULL DEFAULT '',
  `policy_year` varchar(255) NOT NULL DEFAULT '',
  `policy_data` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `log_import_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
