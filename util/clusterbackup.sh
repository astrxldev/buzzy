sudo echo "Root obtained."
echo Backing up
cd ~dmgnr/kpspnextgen
docker compose exec -it db bash -c "pg_dumpall -h localhost -p 5432 -U postgres > /pgdata/cluster.sql"
echo -n "Copying backup file to "
cd -
sudo cp /var/lib/docker/volumes/kpspnextgen_pgdata/_data/cluster.sql ./cluster.sql
sudo chown $USER:users ./cluster.sql
