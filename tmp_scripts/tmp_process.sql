SELECT Id, User, Host, db, Command, Time, State, LEFT(IFNULL(INFO,''),120) as Info
FROM information_schema.processlist
ORDER BY Id;
