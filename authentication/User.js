var Database_Object = require("../database/Database_Object");
var database = require("../database/database");
var bcrypt = require("bcryptjs");

const collection_name = "Users";
const salt_rounds = 14;

const User = {

  set_password(password) {
    this.password = bcrypt.hashSync(password, salt_rounds);
  }

};

exports.create_user = function(user_JSON) {

  var user = Database_Object.create_database_object(collection_name);
  Object.assign(user, User);

  user.username = user_JSON.username;
  user.password = bcrypt.hashSync(user_JSON.password, salt_rounds);

  return user.save();
};

exports.get_user_by_credentials = function(username, password) {

  var filter = {
    username: username
  };

  var promise = database.get_objects(collection_name, filter)
  .then(function(users_JSON) {

    if(users_JSON.length < 1) {
      return null;
    }

    if(!bcrypt.compareSync(password, users_JSON[0].password)) {
      return null;
    }

    var user = Database_Object.create_database_object(collection_name);
    Object.assign(user, User);
    user.from_JSON(users_JSON[0]);

    return user;
  });

  return promise;
};

exports.get_user_by_username = function(username) {

  var filter = {
    username: username
  };

  var promise = database.get_objects(collection_name, filter)
  .then(function(users_JSON) {

    if(users_JSON.length < 1) {
      return null;
    }

    var user = Database_Object.create_database_object(collection_name);
    Object.assign(user, User);
    user.from_JSON(users_JSON[0]);

    return user;
  });

  return promise;
};

exports.get_user_by_id = function(user_id) {

  var promise = database.get_object_by_id(collection_name, user_id)
  .then(function(user_JSON) {

    var user = Database_Object.create_database_object(collection_name);
    Object.assign(user, User);
    user.from_JSON(user_JSON);

    return user;
  });

  return promise;
};