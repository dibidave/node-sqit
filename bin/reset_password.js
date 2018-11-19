var logger = require("../logging/logger").init_logger("reset_password");
var database = require("../database/database");
var User = require("../authentication/User");

var connection_promises = [];

connection_promises.push(database.connect());

Promise.all(connection_promises)
.then(function() {
  var user = User.get_user_by_username(process.argv[2]);
  return user;
}).then(function(user) {
  user.set_password(process.argv[3]);
  return user.save();
}).catch(function(error) {
  logger.fatal(error);
}).then(function() {
  process.exit(0);
});
