var app = require('../examples/mongoose.js');
var request = require('supertest');

describe('mongoose-adapter', function() {
  describe('#schema', function() {
    it('should respond with 200 and match with a complex restize schema', function(done) {
      request(app)
        .get('/test/blog/schema')
        .expect(200)
        //validates schema
        .expect(require('./fixtures/blogschema'), done);
    });

    it('should match with a simple restize schema');
  });

  describe('#list',function(){
    it('should list all the elements in the collection.');
    it('should list the first N elements in the collection.');
    it('should filter the collection elements by given criteria EQUAL.');
    it('should filter the collection elements by given criteria EQUAL(Multiple).');
    it('should filter the collection elements by given criteria NE.');
    it('should filter the collection elements by given criteria IN.');
    it('should filter the collection elements by given criteria NIN.');
    it('should filter the collection elements by given criteria LIKE.');
    it('should filter the collection elements by given criteria NLIKE.');
    it('should filter the collection elements by given criteria GT.');
    it('should filter the collection elements by given criteria GTE.');
    it('should filter the collection elements by given criteria LT.');
    it('should filter the collection elements by given criteria LTE.');
    it('should return an empty list. None register matches given criterias');
    it('should order collecion by given criteria ASC');
    it('should order collecion by given criteria DESC');
  });

   describe('#read',function(){
    it('should get the register identified by the given ID');
    it('should respond with 404 because register identified with ID does not exists.');
  });

  describe('#create',function(){
    it('should list all the elements in the collection');
     it('should list all the elements in the collection');
  });

  describe('#update',function(){
    it('should update the requested element');
     it('should update the requested element deep member');
     it('should respond with 404 because register identified with ID does not exists.');
  });

  describe('#destroy',function(){
    it('should remove given element from the collection');
    it('should respond with 404 because register identified with ID does not exists.');
  });

  describe('#pre-hooks',function(){
    it('should apply pre hooks before main action is invoked');
  });

  describe('#post-hooks',function(){
    it('should apply pre hooks after main action is invoked');
  });
});