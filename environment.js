var sys = require('sys'),
    exec = require('child_process').exec,
    execFile = require('child_process').execFile,
    path = require('path'),
    Q = require('q'),
    fs = require('fs');

/**
 * Initialize a new python `Environment` with the given `python`
 * interpreter and a list of `pythonpath`.
 *
 * @param {String} python
 * @param {Array} pythonpath
 */
function Environment(python, pythonpath) {
  this.python = python;
  this.pythonpath = pythonpath;
}


var getEnvironmentPaths = function(python) {
  var pyScript = path.join(__dirname, 'python', 'environment_path.py');

  return Q.nfcall(execFile, python, [pyScript])
    .then(function(output) {
      return JSON.parse(output[0]);
    });
};


Environment.prototype.registerBuiltinModules = function(python) {
  var self = this;
  var pyScript = path.join(__dirname, 'python', 'builtins.py');

  return Q.nfcall(execFile, python, [pyScript])
    .then(function(output) {
      var modules = JSON.parse(output[0]),
          module;

      for(module in modules) {
        var symbols = modules[module];

        self.registerModule(null, module, symbols);
      }
    });
};


Environment.prototype.registerPackage = function (packagePath, dottedpath) {
  console.log('registering package at', packagePath);

  var self = this;

  dottedpath = dottedpath || '';

  fs.readdir(packagePath, function (err, files) {
    if (err) {
      console.log('error registering package at', packagePath, ':', err);
      return;
    }

    if (dottedpath && files.indexOf('__init__.py') === -1) {
      console.log('skip package at', packagePath, ': no __init__.py');
      return;
    }

    // a first rough filtering of the files, before calling `stat` on
    // each one of them. Keep only filename without extension (maybe folder)
    // or file with '.py' extension
    files = files.filter(function (file) {
      return file.indexOf('.') === -1 || file.substr(-3) === '.py';
    });


    files.forEach(function (file) {
      var filepath = path.join(packagePath, file);
      fs.stat(filepath, function (err, stats) {
        if (err) {
          console.warn('skip file', filepath, err);
          return;
        }

        if (stats.isFile() && file.substr(-3) === '.py') {
          self.registerModuleFile(filepath, dottedpath + '.' + file.slice(0, -3));
        } else if (stats.isDirectory()) {
          self.registerPackage(filepath, dottedpath + '.' + file);
        }

      });
    });
  });
};

Environment.prototype.registerModuleFile = function(filepath, dottedpath) {
  console.log('registering module', dottedpath, 'at', filepath);

};

Environment.prototype.registerModule = function(filepath, dottedpath, symbols) {
  console.log('registering', symbols.length, 'smybols for module', dottedpath, 'from file', filepath);

};


/**
 *
 */
Environment.prototype.buildEnvironmentIndex = function() {
  var self = this;
  var packagePaths;

  return getEnvironmentPaths(self.python)
    .then(function (environmentPaths) {
      packagePaths = environmentPaths.concat(self.pythonpath);
    })
    .then(function () {
      self.registerBuiltinModules(self.python);
    })
    .then(function () {
      return packagePaths
        .map(function (path) {
          return function() { return self.registerPackage(path); };
        })
        .reduce(Q.when, Q());
    });
};

Environment.prototype.findDefinition = function(symbol) {

};

exports.Environment = Environment;

(new Environment('/usr/bin/python', [])).buildEnvironmentIndex();