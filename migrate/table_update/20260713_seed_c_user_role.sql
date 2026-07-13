INSERT INTO `c_user_role` (`id`, `role`, `is_active`, `note`) VALUES
  (1, 'admin', 1, 'System administrator'),
  (2, 'superuser', 1, 'All individual data'),
  (3, 'user', 1, 'Standard ProviderID user'),
  (4, 'guest', 1, 'Summary data only')
ON DUPLICATE KEY UPDATE
  `is_active` = IF(`id` = VALUES(`id`) AND `role` = VALUES(`role`), VALUES(`is_active`), `is_active`),
  `note` = IF(`id` = VALUES(`id`) AND `role` = VALUES(`role`), VALUES(`note`), `note`);

CREATE TEMPORARY TABLE `_validate_c_user_role_seed` (
  `ok` tinyint(1) NOT NULL CHECK (`ok` = 1)
);

INSERT INTO `_validate_c_user_role_seed` (`ok`)
SELECT IF(COUNT(*) = 4, 1, 0)
FROM `c_user_role`
WHERE (`id` = 1 AND `role` = 'admin')
   OR (`id` = 2 AND `role` = 'superuser')
   OR (`id` = 3 AND `role` = 'user')
   OR (`id` = 4 AND `role` = 'guest');

DROP TEMPORARY TABLE `_validate_c_user_role_seed`;
