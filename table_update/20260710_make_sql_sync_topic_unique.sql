ALTER TABLE `sql_for_sync_data`
  MODIFY COLUMN `topic` varchar(255) NOT NULL;

ALTER TABLE `sql_for_sync_data`
  DROP INDEX IF EXISTS `idx_sql_for_sync_data_topic`;

ALTER TABLE `sql_for_sync_data`
  ADD UNIQUE INDEX IF NOT EXISTS `uq_sql_for_sync_data_topic` (`topic`);
