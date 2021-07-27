# dtu-pipeline
## This docker compose files consists of two containers.

- Mysql Database

    To store the data

- Application 

    To fetch data from linc to the mysql database

## The following environment variables can be configured through a .env file.

    The password for mysql root user. Used by the mysql container.
    MYSQL_ROOT_PASSWORD

    Username used to access mysql. The mysql container will automatically create it on the first run.
    MYSQL_USER

    Password for the above user.
    MYSQL_PASSWORD
    
    Name of the database to use. The application will automatically create the necessary schema.
    MYSQL_DATABASE

    Access Token for Linc
    LINC_ACCESS_TOKEN

    A comma separated list of devices to get the data for e.g. ZT,10M
    LINC_DEVICES

## Modifications in docker-compose.yml

- You can edit the volumes section in the compose file to change the location of the volume.
- You can change the `MYSQL_HOST` environment variable, if you don't want to use an existing mysql instance instead of the one in the compose file.

## Running the app

- Run `docker-compose up mysqldb -d` to start the database and wait a minute for it to initialize.
- Run `docker-compose up -d` to start the app. The app will start pulling data as soon as the database is ready.
- You can now use any mysql client to access the data.
