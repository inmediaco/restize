var models = require('./models/blog-mongoose.js');
var express = require('express');
var app = express();
var api = require('../');

app.use(express.json());

api.init(app);
api.register('/test/blog',{
  model: models.BlogPost,
    // query: {
    //   kind: 'document.diagram.odontogram'
    // },
    // display_field: "%name",
    // pre: {
    //   list: middlewares.documentRead,
    //   read: middlewares.documentRead,
    //   create: middlewares.documentCreate,
    //   update:  middlewares.documentCreate,
    //   destroy: middlewares.notAuthorized
    // },
    // post: {
    //   read: middlewares.documentVersions,
    //   update: middlewares.documentVersions
    // }  
});


if (!module.parent) {
  app.listen(3000);
  console.log('Express started on port 3000');
}

module.exports = app;



