
module.exports = {

  connect: function() {

    var url = "mongodb://" + config.database_host + ":" + config.database_port;

    logger.info("Connecting to '" + url + "'");

    var promise = MongoClient.connect(url)
    .then(function(client_connection) {

      client_connection = client_connection;

      db = client_connection.db(config.database_name);

      return upgrade_database(SQIT_VERSION_UPGRADE_MAP, SQIT_DATABASE_VERSION,
        false);

    });

    return promise;
  },

  upgrade: function(database_upgrade_map, latest_version) {
    return upgrade_database(database_upgrade_map, latest_version, true);
  },

  insert: function(collection_name, object) {

    var collection = db.collection(collection_name);

    object = convert_ids_to_object_ids(object);

    var promise = collection.insertOne(object)
    .then(function(result) {
      return result.insertedId;
    });

    return promise;
  },

  update: function(collection_name, id, object) {

    id = ObjectID(id);

    var collection = db.collection(collection_name);

    object = convert_ids_to_object_ids(object);

    var promise = collection.replaceOne(
    {
        "_id": id
    },
    object);

    return promise;
  },

  get_objects: function(collection_name, filter, sort) {

    var collection = db.collection(collection_name);

    if(filter === undefined || filter === null) {
      filter = {
        deleted_on: null
      };
    }

    filter = convert_ids_to_object_ids(filter);

    if(!filter.hasOwnProperty("_deleted_on")) {
      filter["_deleted_on"] = null;
    }

    if(sort !== undefined && sort !== null) {
      var promise = collection.find(filter).sort(sort).toArray();
    }
    else {
      var promise = collection.find(filter).toArray();
    }

    return promise;
  },

  get_object_by_id: function(collection_name, id) {

    var collection = db.collection(collection_name);

    id = ObjectID(id);

    var promise = collection.findOne({_id: id});

    return promise;
  },

  delete_objects: function(collection_name, filter) {

    var collection = db.collection(collection_name);

    if(filter === undefined) {
      filter = {};
    }

    var promise = collection.deleteMany(filter);

    return promise;
  },

  update_many: function(collection_name, filter, update) {
    
    var collection = db.collection(collection_name);
    
    return collection.updateMany(filter, update);
  }
};

var MongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
var client_connection = null;
var db = null;
var logger = require("../logging/Logger").get_logger("database");
var config = require("../config/config");
const SQIT_DATABASE_VERSION = 2;

var upgrade_database = function(version_upgrade_map, latest_version, 
  is_user_database) {

  var database_type = get_metadata_collection_name(is_user_database);

  logger.info("Verifying " + database_type + " db is on latest version, v"
    + latest_version);

  var promise = get_database_version(database_type)
  .then(function(current_database_version) {
    if(current_database_version < latest_version) {

      var promise = null;

      promise = version_upgrade_map[current_database_version]()
      .then(set_database_version.bind(null, current_database_version + 1,
        database_type)
      ).then(upgrade_database.bind(null, version_upgrade_map, latest_version,
        is_user_database));
    }
    else {
      return Promise.resolve();
    }
  });

  return promise;
};

var get_metadata_collection_name = function(is_user_database) {

  if(is_user_database === null || is_user_database === undefined) {
    is_user_database = true;
  }

  if(is_user_database) {
    collection_name = config.database_name;
  }
  else {
    collection_name = "sqit";
  }

  return collection_name;
};

var set_database_version = function(version, database_name) {

  logger.debug("Setting " + database_name + " database version to "
    + version);

  var metadata_collection = db.collection("_metadata");

  var promise = metadata_collection.updateOne(
    {
      collection_name: database_name
    },
    {
      $set: {
        "version": version,
        "collection_name": database_name
      }
    },
    {
      upsert: true
    }
  );

  return promise;
};

var get_database_version = function(database_name) {

  logger.debug("Getting " + database_name + " database version");

  var metadata_collection = db.collection("_metadata");

  var promise = metadata_collection.findOne(
  {
    collection_name: database_name
  }).then(function(metadata) {

    if(metadata === null) {
      logger.debug("Metadata not found, assuming version 0");
      return 0;
    }
    else if(!metadata.hasOwnProperty("version")) {
      logger.debug("Metadata not found, assuming version 0");
      return 0;
    }
    else {
      logger.debug("Database is currently version " + metadata.version);
      return metadata.version;
    }
  });

  return promise;
};

var convert_ids_to_object_ids = function(object, is_candidate) {

  if(object === null || object === undefined) {
    return object;
  }

  if(is_candidate) {
    if(typeof object === "string" || object instanceof String) {
      let object_converted = object;
      try {
        object_converted = ObjectID(object);
      }
      catch(error) {

      }

      return object_converted;
    }
  }

  if(Array.isArray(object)) {

    for(let entry_index = 0; entry_index < object.length; entry_index++) {

      object[entry_index] = convert_ids_to_object_ids(object[entry_index],
        is_candidate);
    }

  }
  else if (typeof object === "object") {

    for(var key in object) {

      if(!object.hasOwnProperty(key)) {
        continue;
      }

      if(key.endsWith("_id") || key.endsWith("_ids")) {

        object[key] = convert_ids_to_object_ids(object[key], true);
      }
      else {
        object[key] = convert_ids_to_object_ids(object[key], false);
      }
    }
  }

  return object;
};

var create_database = function() {
  return set_database_version(0, get_metadata_collection_name(false));
};

var upgrade_database_v_1 = function() {

  var old_metadata_collection_name = "Metadata";

  var promise = db.dropCollection(old_metadata_collection_name)
  .then(function() {
    return Promise.resolve();
  }).catch(function(error) {
    return Promise.resolve();
  });

  return promise;
};

const SQIT_VERSION_UPGRADE_MAP = {
  0: create_database,
  1: upgrade_database_v_1
};