var fs = require("fs");
var shell = require("shelljs");

exports.is_string_true = function(string) {
  if(string === "True" || string == "true" || string === "1" ||
    string === "t" || string === "T") {
    return true;
  }

  return false;
};

exports.make_directory = function(path) {

  if(!fs.existsSync(path)) {
    shell.mkdir("-p", path);
  }

  return;
};