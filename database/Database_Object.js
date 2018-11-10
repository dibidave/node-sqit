var database = require("./database");
var logger = require("../logging/Logger").get_logger("Database_Object");

const Database_Object = {

  save() {

    var promise = null;

    var collection_name = this._metadata.collection_name;

    if(this._id === null) {
      delete this._id;
    }

    if(this._id === undefined) {

      promise = database.insert(collection_name, this.to_JSON())
      .then(function(object_id) {
        this._id = object_id;
        return this;
      }.bind(this))
      .catch(function(error) {
        logger.warn("Failed to create object:");
        logger.warn(error);
      });
    }
    else {
      promise = database.update(collection_name, this._id, this.to_JSON())
      .then(function() {
        return this;
      }.bind(this));
    }

    return promise;
  },

  to_JSON() {

    var JSON_object = {};
    
    for(var property in this) {

      if(typeof this[property] === 'function') {
        continue;
      }

      if(property === '_metadata') {
        continue;
      }

      JSON_object[property] = this[property];
    }

    return JSON_object;
  },

  from_JSON(JSON_object) {

    Object.assign(this, JSON_object);
  },

  delete() {

    this._deleted_on = new Date();

    return this.save();
  }
};

module.exports.create_database_object = function(collection_name) {

  var database_object = Object.assign({}, Database_Object);
  database_object._metadata = {
    collection_name: collection_name
  };

  database_object._id = null;
  database_object._deleted_on = null;
  database_object._created_on = new Date();

  return database_object;
};

module.exports.Database_Object = Database_Object;