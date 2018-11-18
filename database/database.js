
module.exports = {

  connect: function() {

    var url = "mongodb://" + config.database_host + ":" + config.database_port;

    logger.info("Connecting to '" + url + "'");

    var promise = MongoClient.connect(url)
    .then(function(client_connection) {

      client_connection = client_connection;

      db = client_connection.db(config.database_name);

      return update_database();

    });

    return promise;
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

  get_objects: function(collection_name, filter) {

    var collection = db.collection(collection_name);

    if(filter === undefined || filter === null) {
      filter = {
        deleted_on: null
      };
    }

    filter = convert_ids_to_object_ids(filter);

    if(!filter.hasOwnProperty("deleted_on")) {
      filter["deleted_on"] = null;
    }

    var promise = collection.find(filter).toArray();

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
  }
}

var MongoClient = require("mongodb").MongoClient;
var ObjectID = require("mongodb").ObjectID;
var client_connection = null;
var db = null;
var logger = require("../logging/Logger").get_logger("database");
var config = require("../config/config");
const DATABASE_VERSION = 1;

var update_database = function() {

  logger.info("Verifying database is on latest version, v" + DATABASE_VERSION);

  var promise = get_database_version()
  .then(function(current_database_version) {
    if(current_database_version < DATABASE_VERSION) {

      var promise = null;

      switch(current_database_version) {
        case 0:
          promise = create_database();
          break;
        default:
          logger.error("No database upgrade specified for v" +
            current_database_version);
          promise = Promise.reject();
      }

      promise = promise
      .then(set_database_version.bind(null, current_database_version + 1)
      ).then(update_database);
    }
    else {
      return Promise.resolve();
    }
  });

  return promise;
};

var create_database = function() {
  return Promise.resolve();
};

var set_database_version = function(version) {
  
  logger.debug("Setting database version to " + version);

  var metadata_collection = db.collection("Metadata");

  var promise = metadata_collection.updateOne(
    {
      collection_name: "scrap"
    },
    {
      $set: {
        "version": version,
        "collection_name": "scrap"
      }
    },
    {
      upsert: true
    }
  );

  return promise;
}

var get_database_version = function() {

  logger.debug("Getting database version");

  var metadata_collection = db.collection("Metadata");

  var promise = metadata_collection.findOne(
  {
    collection_name: "scrap"
  }).then(function(metadata) {

    if(metadata === null) {
      logger.debug("Database metadata not found, assuming version 0");
      return 0;
    }
    else if(!metadata.hasOwnProperty("version")) {
      logger.debug("Database metadata not found, assuming version 0");
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