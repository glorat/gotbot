# Docker build instructions for gotbot

## Pre-requisites

- All the pre-requisites for gotbot
- Docker (docker.com)

1. Clone this repository
2. Create a .config directory
3. Place your customised versions of config.js and password.js into a subdirectory of .config (I use .config/dev/)

## Build your container

From a shell (dos or linux) run

```docker build myname/gotbot .```

## Run your container

From a shell run

```docker run myname/gotbot```

The container entrypoint will start the bash script `run.sh`

- If no wiki pages have been cached, the bash script `gotcron.sh` will be run - This can take quite a while to run the first time!
- If the wikidb.json file is not present, the node program `cachewiki.js` will be run
- Then the main node program `index.js` will be started

## Refresh gotbot's wiki information

The `gotcron.sh` script will need to be run at appropriate intervals.

Best practice with containers is to have this scheduled outside of the container by your operating system (eg cron or Task Scheduler)

Here is an example of how to list your running container, how to start the gotcron.sh script and how to start the container

```> docker ps
CONTAINER ID        IMAGE                   COMMAND                  CREATED             STATUS                           NAMES
ecf17f349f40        gotbot                  "/bin/sh -c ./run.sh"    About an hour ago   Up About an hour                 stoic_golick

> docker exec ecf17f349f40 ./gotcron.sh
Checking for new characters
...
Telling bot to restart

> docker start ecf17f349f40
```

Alternatively the container name (Names column) can be used instead of the container id.

## Check your container

The following commands will be useful.

- `docker ps` to view running containers
- `docker ps -a` to view both running and stopped containers
- `docker stop <container id>` or `docker stop <names>`

## Notes

- Containers do not restart by default!
- To persist data you will have to define permament volumes/bind locations for the VOLUMES defined in the Dockerfile
- The EXPOSED ports are not required for the Discord functions of gotbot

## License

As this is a derivative of the [gotbot](http://github.com/glorat/gotbot) project, all Copyrights remain with Kevin Tam

Copyright © [Kevin Tam](http://github.com/glorat) 2018
Licensed under the GNU Affero General Public License v.3.0
