CREATE TABLE `policy` (
  `hospcode` varchar(5) NOT NULL DEFAULT '',
  `policy_id` varchar(255) NOT NULL DEFAULT '',
  `policy_year` varchar(255) NOT NULL DEFAULT '',
  `policy_data` varchar(255) NOT NULL DEFAULT '',
  `d_update` varchar(255) NOT NULL DEFAULT '',
  `file_name` varchar(255) NOT NULL DEFAULT '',
  `import_date_time` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;
