var moduleLevelDefsRe = /^(import|from|def|class|__all__|[_A-Za-z][_a-zA-Z0-9]*(?=\s*=)).*/gm,
    defRe = /^def\s+(\S*)\s*\(([^]*?)\)/m,
    classRe = /^class\s+(\S*)\s*\(([^]*?)\)/m,
    allDictRe = /^__all__\s*=\s*[\[\(]([^]*?)[\]\)]/m;

var fs = require('fs');
var source = fs.readFileSync('quiz.py').toString();

function parse(source) {
  var match,
      keyword,
      declaration,
      symbols = [],
      allDict;

  while ((match = moduleLevelDefsRe.exec(source)) !== null) {
    console.log(match);
    keyword = match[1];
    declaration = match[0];

    switch (keyword) {
      case 'import': break;
      case 'from': break;

      case 'def':
        symbols.push(parse_def(source, match.index));
        break;

      case 'class':
        symbols.push(parse_class(source, match.index));
        break;

      case '__all__':
        allDict = parse_allDict(source, match.index);
        break;
    }
  }

  // filter out the symbols that are not in __all__
  if (allDict) {
    symbols = symbols.filter(function(symbol) {
      return allDict.indexOf(symbol.name) !== -1;
    });
  }

  return symbols;
}


function parse_def(source, index) {
  var match = defRe.exec(source.substr(index));

  return {
    type: 'function',
    name: match[1],
    index: index,
    arguments: match[2].split(',').map(function (str) { return str.trim(); })
  };
}


function parse_class(source, index) {
  var match = classRe.exec(source.substr(index));

  return {
    type: 'class',
    name: match[1],
    index: index,
    superClasses: match[2].split(',').map(function (str) { return str.trim(); })
  };
}


function parse_allDict(source, index) {
  var match = allDictRe.exec(source.substr(index));
  return match[1].split(',').map(function (str) { return str.replace(/[ \n\t'"]/g, ''); });
}


console.log(parse(source));