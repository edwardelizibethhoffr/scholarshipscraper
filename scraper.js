//will extract the name,id,value and description for each scholarship on the Glasgow university website
//and update the database when it encounters new or modified scholarships

var express = require('express');
var request = require('request');
var app     = express();
var mysql =require('mysql');
var cheerio = require('cheerio');

//Database constants
const DB_HOST = '';
const DB_USER = '';
const DB_PASSWORD = '';
const DB = '';


var connection = mysql.createConnection({
	host : DB_HOST,
	user: DB_USER,
	password : DB_PASSWORD,
	database : DB
})

connection.connect();

app.get('/', function(req, res){


	//url to list all scholarships for prospective students
	url = 'http://www.gla.ac.uk/scholarships/?type=prospective&level=&country=&PGProgrameListSelect=&postgraduate_resarch_programm=&search=Search';


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

            	console.log(value);
            	//the date it was last updated
            	var lastUpdateString = $('bh2').find('p').text().substring(0,10);
            	//convert string to date format			
            	date  = convertToDate(lastUpdateString);
            				
            	//pass data to database
            	databaseUpdate(id, desc, title, date, value);           				
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

var databaseUpdate = function(id,desc,title,date, value){


	connection.query('SELECT * FROM scholarship WHERE scholarship_id = ?', id, function(err, row){
		if(err) throw err;
		else{
		//if row is not null scholarship is alrady in the database	
		if(row.length){
			//check  if our entry is up to date with the website - if not update the row
			if(row['date'] != date){
				connection.query('UPDATE scholarship SET name = ?, description = ?, date = ?, value = ?  WHERE scholarship_id = ?', [title, desc, date, id, value],
					function(err, row){
						if(err) throw err;
					});

			}
		}
		else{
			//if row is null - then we have a new scholarship to add to the database
			connection.query('INSERT INTO scholarship SET ?', {scholarship_id: id, name: title, date: date, description: desc, value: value},
				function(err, row){
						if(err) throw err;
					});
		}
	}
	});
}



app.listen('8081')

console.log('Listening on port 8081');

request('http://localhost:8081', function(error, response, html){});

exports = module.exports = app;

