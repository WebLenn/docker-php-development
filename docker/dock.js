#! /usr/bin/env node
var co = require('co');
var prompt = require('co-prompt');
var chalk = require('chalk');
var program = require('commander');
var shell = require('shelljs');

//Custom log colors
const success = chalk.green;
const error = chalk.bold.red;
const warning = chalk.keyword('orange');

program
  .option('-i, --init', 'Install the dock into your project')
  .option('-s, --start', 'Start the dock')
  .option('-e, --stop', 'Stop the dock')
  .option('-f, --foreground', 'Start dock on foreground')
  .option('-d, --dbdump', 'Dumps the database into a database.sql file in projectroot')
  .option('-r, --dbrestore', 'Retores the database dump in projectroot folder')
  .option('-l, --logs', 'Show logs')
  .parse(process.argv);

  // Throws errors when shell commands fail.
  shell.config.fatal = true;

  // The global "docker-php-development" folder.
  var globalPath = shell.exec('npm config get prefix', {silent:true}).stdout.trim()+'/node_modules/docker-php-development/docker/';
  var dockcompose_file = './docker/docker-compose.yml';

  // Init function
  // Will create a "docker" folder in your projectfolder.
  // Will prompt user for ports and container_names
  // ----------------------------------------------
  if (program.init){
    shell.cp('-R', globalPath, '.');
    console.log(success('./docker folder successfully created, time to name your containers!'));
    console.log(warning('Remember docker containers may not have the same NAME as existing containers.\nUse "docker ps -a" to see the existing container names.'));

    co(function *() {
      var mariadb_contname = yield prompt('mariadb container_name: ');
      var phpmyadmin_contname = yield prompt('phpmyadmin container_name: ');
      var webserver_contname = yield prompt('webserver container_name: ');
      var php_contname = yield prompt('php container_name: ');
      var webserver_port = yield prompt('webserver port: ');
      var mariadb_port = yield prompt('mariadb port: ');
      var phpmyadmin_port = yield prompt('phpmyadmin port: ');

      shell.sed('-i', '%MARIADB_CONTNAME%', mariadb_contname, dockcompose_file);
      shell.sed('-i', '%MARIADB_CONTNAME%', mariadb_contname, './docker/sql_container.txt');
      shell.sed('-i', '%PHPMYADMIN_CONTNAME%', phpmyadmin_contname, dockcompose_file);
      shell.sed('-i', '%WEBSERVER_CONTNAME%', webserver_contname, dockcompose_file);
      shell.sed('-i', '%PHP_CONTNAME%', php_contname, dockcompose_file);

      shell.sed('-i', '%MARIADB_PORT%', mariadb_port, dockcompose_file);
      shell.sed('-i', '%WEBSERVER_PORT%', webserver_port, dockcompose_file);
      shell.sed('-i', '%PHPMYADMIN_PORT%', phpmyadmin_port, dockcompose_file);

      console.log(chalk.bold.green('Success: ') + success('./docker/docker-compose.yml successfully created you can change this by hand anytime or overwrite it by rerunning "dock -i" or "dock --init"'));
      console.log('You\'re all set: Start your dock by typing "dock -s" or "dock --start"');

      shell.exit(1);
    });
  }

  // Start function
  // Will start the docks, uses the docker-compose.yaml as config.
  // -----------------------------------
  if (program.start){
    shell.cd('./docker');
    console.log(success('Starting up your dock, use "dock -l" to output logs, use "dock -e" to exit/stop the dock.'));
    shell.exec('docker-compose up -d');
  }

  // Start_Foreground function
  // Will start the docks and output the logs.
  // -----------------------------------
  if (program.foreground){
    shell.cd('./docker');
    shell.exec('docker-compose up');
  }

  // Stop function
  // Will stop the docks and create a database.sql file, will hold entire db.
  // -----------------------------------
  if (program.stop){
    // The database container_name, is used for exporting/importing the database.
    var db_container_name = shell.tail({'-n': 1}, './docker/sql_container.txt');

    shell.exec('docker exec '+ db_container_name +' sh -c \"exec mysqldump --all-databases -uroot -proot\" > database.sql');
    shell.cd('./docker');
    shell.exec('docker-compose stop');
  }

  // DBDump function
  // Manualy create/overwrite the database.sql file with the new data.
  // -----------------------------------
  if (program.dbdump){
    // The database container_name, is used for exporting/importing the database.
    var db_container_name = shell.tail({'-n': 1}, './docker/sql_container.txt');

    shell.exec('docker exec '+ db_container_name +' sh -c \"exec mysqldump --all-databases -uroot -proot\" > database.sql');
  }

  // DBRestore function
  // Restore the database using the database.sql file.
  // -----------------------------------
  if (program.dbrestore){
    // The database container_name, is used for exporting/importing the database.
    var db_container_name = shell.tail({'-n': 1}, './docker/sql_container.txt');

    shell.exec('docker exec -i '+ db_container_name +' sh -c \"exec mysql -uroot -proot\" < database.sql');
  }

  // Logs function
  // Output the logs to the bash, same output as Start_Foreground function.
  // -----------------------------------
  if (program.logs){
    shell.cd('./docker');
    shell.exec('docker-compose logs -f');
  }
