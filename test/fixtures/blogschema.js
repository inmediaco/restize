module.exports = 
{
  "name": "BlogPost",
  "fields": {
    "title": {
      "index": true,
      "type": "String"
    },
    "slug": {
      "trim": true,
      "lowercase": true,
      "type": "String"
    },
    "date": {
      "type": "Date"
    },
    "buf": {
      "type": "Buffer"
    },
    "comments": {
      "type": "Array",
      "of": {
        "type": "Object",
        "fields": {
          "_id": {
            "auto": true,
            "type": "ObjectId"
          },
          "title": {
            "index": true,
            "type": "String"
          },
          "date": {
            "type": "Date"
          },
          "body": {
            "type": "String"
          }
        }
      }
    },
    "creator": {
      "type": "ObjectId"
    },
    "_id": {
      "auto": true,
      "type": "ObjectId"
    }
  },
  "url": "/test/blog"
};