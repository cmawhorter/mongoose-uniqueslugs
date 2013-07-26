var assert = require('assert')
	, mongoose = require('mongoose');

var mongooseUniqueSlugs = require('../');

var db = mongoose.connection;
db.on('error', console.error);
mongoose.connect('mongodb://localhost/test');

function buildSchema() {
	var schema = new mongoose.Schema({
			  title: String
			, alt: String
			, date: { type: Date, default: Date.now }
		});

	return schema;
}

function buildModel(schema) {
	var Cat = mongoose.model('Cat', schema);
	return Cat;	
}

function mockKitteh(opts) {
	var schema = buildSchema();
	console.log('mockKitteh opts', opts)
	mongooseUniqueSlugs.enhanceSchema(schema, opts || {});

	var Cat = buildModel(schema);
	mongooseUniqueSlugs.enhanceModel(Cat);

	var cat = new Cat({
				title: 'slim kitteh'
			, alt: 'tha real slim kitteh'
		});

	return cat;
}

describe('mongoose-uniqueslugs', function(){
  describe('#enhanceSchema()', function(){
    it('should not throw an error when no schema is provided', function(){
      assert.throws(function() {
				mongooseUniqueSlugs.enhanceSchema();
			}, 'Invalid Schema');
    });

    it('should not throw an error when an invalid schema is provided', function(){
      assert.throws(function() {
      	mongooseUniqueSlugs.enhanceSchema({});
      }, 'Invalid Schema');
    });

    it('should not throw an error when a valid schema is provided', function(){
      assert.doesNotThrow(function() {
				var schema = new mongoose.Schema({ title: String });
      	mongooseUniqueSlugs.enhanceSchema(schema);
      });
    });

    it('should take options', function(){
      assert.doesNotThrow(function() {
				var schema = new mongoose.Schema({ title: String });
      	mongooseUniqueSlugs.enhanceSchema(schema, {});
      });
    });
  });
});

describe('mongoose-uniqueslugs', function(){
  describe('#enhanceModel()', function(){
    it('should not throw an error when no schema is provided', function(){
      assert.throws(function() {
				mongooseUniqueSlugs.enhanceModel();
			}, 'Invalid Model');
    });

    it('should not throw an error when an invalid schema is provided', function(){
      assert.throws(function() {
      	mongooseUniqueSlugs.enhanceModel({});
      }, 'Invalid Model');
    });

    it('should not throw an error when a valid schema is provided', function(){
      assert.doesNotThrow(function() {
				var schema = new mongoose.Schema({ title: String });
				var Blah = mongoose.model('Blah', schema);
      	mongooseUniqueSlugs.enhanceModel(Blah);
      });
    });
  });
});



describe('mongoose-uniqueslugs', function(){
  it('should create a slug based on title by default', function(){
  	var cat = mockKitteh();
    assert.equal(cat.generateSlug(), 'slim-kitteh');
  });

  it('should create a slug based on an arbitrary property', function(){
  	var cat = mockKitteh({
  		source: 'alt'
  	});
    assert.equal(cat.generateSlug(), 'tha-real-slim-kitteh');
  });
});

