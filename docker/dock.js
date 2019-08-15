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
  .option('-q, --stopall', 'Stop all running docks')
  .option('-a, --showall', 'Show all existing docks')
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

  // Probabrly installed as yarn package, reset globalPath
  if ( !shell.test('-d', globalPath) ) {
    var globalPath = shell.exec('yarn global dir', {silent:true}).stdout.trim()+'/node_modules/docker-php-development/docker/';
  };

  // Get project folder path and folder name
  var projectFolder = shell.pwd().stdout;
  var projectName = projectFolder.substr(projectFolder.lastIndexOf('\\') + 1);

  // Init function
  // Will create a "docker" folder in your projectfolder.
  // Will prompt user for ports and container_names
  // ----------------------------------------------
  if (program.init){
    shell.cp('-R', globalPath, '.');
    shell.rm('./docker/dock.js');
    console.log(success('./docker folder successfully created, time to name your containers!'));
    console.log(warning('Remember docker containers may not have the same NAME as existing containers.\nUse "docker ps -a" to see the existing container names.'));

    co(function *() {
      var mariadb_contname = (yield prompt('mariadb container_name: default('+projectName+'_mariadb)')) || projectName+'_mariadb';
      var phpmyadmin_contname = (yield prompt('phpmyadmin container_name: default('+projectName+'_phpmyadmin)')) || projectName+'_phpmyadmin';
      var webserver_contname = (yield prompt('webserver container_name: default('+projectName+'_webserver)')) || projectName+'_webserver';
      var php_contname = (yield prompt('php container_name: default('+projectName+'_php)')) || projectName+'_php';
      var webserver_port = (yield prompt('webserver port: default(8080)')) || '8080';
      var mariadb_port = (yield prompt('mariadb port: default(8989)')) || '8989';
      var phpmyadmin_port = (yield prompt('phpmyadmin port: default(8181)')) || '8181';
      var mailhog_port = (yield prompt('mailhog port: default(8025)')) || '8025';

      shell.sed('-i', '%MARIADB_CONTNAME%', mariadb_contname, dockcompose_file);
      shell.sed('-i', '%MARIADB_CONTNAME%', mariadb_contname, './docker/sql_container.txt');
      shell.sed('-i', '%PHPMYADMIN_CONTNAME%', phpmyadmin_contname, dockcompose_file);
      shell.sed('-i', '%WEBSERVER_CONTNAME%', webserver_contname, dockcompose_file);
      shell.sed('-i', '%PHP_CONTNAME%', php_contname, dockcompose_file);

      shell.sed('-i', '%MARIADB_PORT%', mariadb_port, dockcompose_file);
      shell.sed('-i', '%WEBSERVER_PORT%', webserver_port, dockcompose_file);
      shell.sed('-i', '%PHPMYADMIN_PORT%', phpmyadmin_port, dockcompose_file);
      shell.sed('-i', '%MAILHOG_PORT%', mailhog_port, dockcompose_file);

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
  // Will stop the project docks
  // Uncomment code below to create a database.sql file on each stop, will hold entire db.
  // -----------------------------------
  if (program.stop){
    // The database container_name, is used for exporting/importing the database.
    // // var db_container_name = shell.tail({'-n': 1}, './docker/sql_container.txt');
    // //
    // // shell.exec('docker exec '+ db_container_name +' sh -c \"exec mysqldump --all-databases -uroot -proot\" > database.sql');
    shell.cd('./docker');
    shell.exec('docker-compose stop');
  }

  // Stop all function
  // Will stop all running docks
  // -----------------------------------
  if (program.stopall){
    var containerList = shell.exec('docker ps -a -q', {silent:true}).stdout.split('\n');

    for( var i = 0; i < containerList.length; i++ ){
      if( containerList[i].length > 0 ){
        console.log('Stopping container with ID: '+containerList[i]);
        shell.exec('docker stop '+containerList[i], {silent:true});
      }
    }
    console.log(success('Succesfully stopped all running docks'));
  }

  // Show all container names function
  // Will retrieve list of all containers
  // -----------------------------------
  if (program.showall){
    var containerList = shell.exec('docker ps --all --quiet --no-trunc', {silent:true}).stdout.split('\n');

    for( var i = 0; i < containerList.length; i++ ){
      if( containerList[i].length > 0 ){
        shell.exec('docker inspect --format=\'{{.Name}}\' '+containerList[i]);
      }
    }
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
