var express = require('express');
var request = require('request');
var app     = express();
var fs = require('fs');
var pug = require('pug');
var path = require('path');

app.set('view engine', 'pug');
app.set('views', __dirname);
app.use(express.static(path.join(__dirname)));

//returns webpage displaying the scholarship data in a table
app.get('/home', function(req, res){
  request('http://localhost:8081/getScholarships', function(error, response, json){
    if(!error){
      res.render('index', {title: 'University of Glasgow Scholarships', heading: "Scholarships and funding", items: JSON.parse(json)});
    }
  });
});

app.listen('8082');
console.log('Listening on port 8082');