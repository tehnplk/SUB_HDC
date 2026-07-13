ALTER TABLE `c_user_provider`
  ADD COLUMN IF NOT EXISTS `login_count` int(10) unsigned NOT NULL DEFAULT 0 AFTER `role`;
