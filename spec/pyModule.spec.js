var pyModule = require('../pyModule');

describe('pyModule', function() {
  it('should parse old style class declaration', function(done) {

    var symbols = pyModule.parse(
      'class Abc:\n' +
      '  pass');

    expect(symbols.length).toBe(1);
    expect(symbols[0].type).toBe('class');
    expect(symbols[0].name).toBe('Abc');
    expect(symbols[0].superClasses.length).toBe(0);

    done();
  });

  it('should parse new style class declaration', function(done) {

    var symbols = pyModule.parse(
      'class Abc(Super):\n' +
      '  pass');

    expect(symbols.length).toBe(1);
    expect(symbols[0].type).toBe('class');
    expect(symbols[0].name).toBe('Abc');
    expect(symbols[0].superClasses).toEqual(['Super']);

    done();
  });

/*  it('should parse super class expressions', function(done) {
    var symbols = pyModule.parse(
      // example taken from 'django/forms/forms.py'
      'class Form(six.with_metaclass(DeclarativeFieldsMetaclass, BaseForm)):\n' +
      '  pass');

    expect(symbols.length).toBe(1);
    expect(symbols[0].type).toBe('class');
    expect(symbols[0].name).toBe('Form');
    expect(symbols[0].superClasses).toEqual([
      'six.with_metaclass(DeclarativeFieldsMetaclass, BaseForm)']);

    done();
  });*/
});
