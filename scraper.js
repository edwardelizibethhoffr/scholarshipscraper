//will extract the name,id,value and description for each scholarship on the Glasgow university website
//and update the database when it encounters new or modified scholarships

var express = require('express');
var request = require('request');
var app     = express();
var cheerio = require('cheerio');
var mongo = require('mongodb');
var websocket = require('websocket');

const PORT = 8081;


//mongo server
var Server = mongo.Server, 
    Db = mongo.Db, 
    BSON = mongo.BSONPure;

var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('helloglasgow', server);

//connect to mongodb
db.open(function(err, db){
  if(!err){
    console.log("Connected to 'helloglasgow' database");
    db.collection('scholarships', {strict:true}, function(err, collection) {
            if (err) {
                console.log("The 'scholarships' collection doesn't exist");
            }
        });
  }
})


app.get('/getAll', function(req, res){
	//url to list all scholarships for prospective students
	var url = 'http://www.gla.ac.uk/scholarships/?type=prospective&level=&country=&PGProgrameListSelect=&postgraduate_resarch_programm=&search=Search';

    request(url, function(error, response, html){
      //check to make sure no errors occurred when making the request

      if(!error){
        //utilize the cheerio library on the returned html 
        var $ = cheerio.load(html);

        //iterate all of the divs of class 'search-results' and extract the scholaship data
        $('.search-results').filter(function(){

          var data = $(this);

          //find the name and id of the scholarship
          var scholarshipATag = data.find('a');
          var title = scholarshipATag.text();
          var scholarshipID = scholarshipATag.attr("href").match(/scholarship_ID=([0-9]+)/)[1];
           			
          //the url for this scholarships individual page
          var scholarshipHref = scholarshipATag.attr("href");
           			

          getScholarshipData(scholarshipHref, scholarshipID, title);   			

        })
      }
    })
})

//returns all course data from database in JSON
app.get('/getScholarships',function(req,res){
    db.collection('scholarships', function(err, collection){
      collection.find().toArray(function(err, items){
        res.send(items);
      });
    });
});


//function retrieves scholarship date from each scholarship's individual webpage
var getScholarshipData = function(url, id, title){
							
		var title = title;
        var id = id;
        var date, desc, value;

	request(url, function(error,response, html){
           	
           	if(!error){

            	var $ = cheerio.load(html);
            				     	
            	//select h2 elements from the html page			
            	var h2 = $('h2');

            	//get the description and value of the scholarship from the page
            	desc = h2.first().next('p').next('p').text();            	
            	value = h2.eq(4).next('p').next('p').text();

            
            	//the date it was last updated
            	var lastUpdateString = $('bh2').find('p').text().substring(0,10);
            	//convert string to date format			
            	date  = convertToDate(lastUpdateString);
            				
            	//pass data to database
              if(id != null && title != null && date !=null){
            	   //databaseUpdate(id, desc, title, date, value);
                 databaseUpdateMongo(id,title,desc,value,date);  
              }      
              	
            }	
    })
}

//function converts string to date
var convertToDate = function(stringIn){
	var y, m, d;
	d = stringIn.substring(0,2);
	m = stringIn.substring(3,5);  
	y = stringIn.substring(6,10);
	var dateString = y.concat('-',m,'-',d);
	var date = new Date(dateString);
	return date;
}

//function checks if the scholarship is already in the database or if it has been updated
//we then update the database as appropriate
var databaseUpdateMongo = function(id, title, desc, value, date){

    
    var cursor = db.collection('scholarships').count({'scholarship_id': id},
      function(err,results){
        console.log(results);
        if(results != 0){
           var mssg = 'updating ';
           mssg+= id;
           console.log(mssg);
           db.collection('scholarships').find({'scholarship_id':id, 'date':{ $ne:date}}, 
                function(err,result){

            console.log(result.date);  
            db.collection('scholarships').updateOne(
              {'scholarship_id' : id},
              {$set: {'title' : title, 'description':desc, 'value' : value,'lastupdated' : date}
            });
              })
        }
        else{
          console.log('inserting'); 
          db.collection('scholarships').insertOne(
            {
            'scholarship_id' : id,
            'title' : title,
            'description' : desc,
            'value' : value,
            'lastupdated' : date
          });
        }
        })   
}


app.listen(PORT);

console.log('Listening on port 8081');

//request('http://localhost:8081', function(error, response, html){});

exports = module.exports = app;

