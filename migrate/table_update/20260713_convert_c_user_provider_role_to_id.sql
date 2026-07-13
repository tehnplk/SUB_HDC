INSERT INTO `c_user_role` (`role`, `is_active`, `note`)
VALUES ('admin', 1, 'System administrator'), ('superuser', 1, 'All individual data'), ('user', 1, 'Standard ProviderID user'), ('guest', 1, 'Summary data only')
ON DUPLICATE KEY UPDATE `is_active` = VALUES(`is_active`);

UPDATE `c_user_provider` AS u
INNER JOIN `c_user_role` AS r ON r.`role` = u.`role`
SET u.`role` = r.`id`;

ALTER TABLE `c_user_provider`
  MODIFY COLUMN `role` int(10) unsigned NOT NULL,
  ADD CONSTRAINT `fk_c_user_provider_role`
    FOREIGN KEY (`role`) REFERENCES `c_user_role` (`id`);
