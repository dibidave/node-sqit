var logger = require("../logging/Logger").init_logger("create_user");
var database = require("../database/database");
var User = require("../authentication/User");

var connection_promises = [];

connection_promises.push(database.connect());

Promise.all(connection_promises)
.then(function() {
  return User.create_user({
    username: process.argv[2],
    password: process.argv[3]
  });
}).catch(function(error) {
  logger.fatal(error);
}).then(function() {
  process.exit(0);
});