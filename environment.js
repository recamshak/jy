var sys = require('sys'),
    exec = require('child_process').exec,
    execFile = require('child_process').execFile,
    path = require('path'),
    Q = require('q'),
    fs = require('fs'),
    pyModule = require('./module');

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
  this.nbModules = 0;
  this.nbSymbols = 0;
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

// TODO: this method generate a shitload of anonymous functions...
//       maybe should try to optimize that a little bit
Environment.prototype.registerPackage = function (packagePath, dottedpath) {
  console.log('registering package at', packagePath);

  var self = this;

  dottedpath = dottedpath || '';

  return Q.nfcall(fs.readdir, packagePath).then(function (files) {
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

    return files
      .map(function (file) {
        return function() {
          var filepath = path.join(packagePath, file);

          return Q.nfcall(fs.stat, filepath).then(function(stats) {
            if (stats.isFile() && file.substr(-3) === '.py') {
              return self.registerModuleFile(filepath, dottedpath + '.' + file.slice(0, -3));
            } else if (stats.isDirectory()) {
              return self.registerPackage(filepath, dottedpath + '.' + file);
            }
          })
          .catch(function(err) {
            console.warn('error while processing file', file, ':', err);
          });
        };
      })
      .reduce(Q.when, Q());

  })
  .catch(function (err) {
    console.warn('skipping package', packagePath, err);
  });
};

Environment.prototype.registerModuleFile = function(filepath, dottedpath) {
  console.log('registering module', dottedpath, 'at', filepath);
  var self = this;

  return Q.nfcall(fs.readFile, filepath).then(function(source) {
    self.registerModule(filepath, dottedpath, pyModule.parse(source.toString()));
  });
};

Environment.prototype.registerModule = function(filepath, dottedpath, symbols) {
  console.log('registering', symbols.length, 'smybols for module', dottedpath, 'from file', filepath);
  this.nbModules++;
  this.nbSymbols += symbols.length;
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
      return self.registerBuiltinModules(self.python);
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

env = new Environment('/usr/bin/python', []);
env.buildEnvironmentIndex().then(function() {
  console.log('registered', env.nbSymbols, 'symboles from', env.nbModules, 'modules');
})
.catch(function(err) {
  console.log(err);
});

