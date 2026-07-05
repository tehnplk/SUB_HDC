#!/bin/bash
for i in $(seq 1 10); do
  echo "=== $(date +%H:%M:%S) ==="
  docker exec sub_hdc_db mariadb -uroot -p112233 -e "SELECT Id, User, Host, db, Command, Time, State FROM information_schema.processlist ORDER BY Id;"
  sleep 5
done
