module.exports = function(apiHandler) {
  var nodemailer = require('nodemailer');
  var mongoose = require('mongoose');
  var recipeModel = mongoose.model('recipe');
  var templateModel = mongoose.model('template');
  var phantom = require('phantom');
  var PhantomPDF = require('phantom-pdf');
  var formatType = 'pdf';
  var fs = require("fs");
  var jsdom = require("jsdom");
  var http = require("http");

	function evaluate(page, func) {
	    var args = [].slice.call(arguments, 2);
	    var fn = "function() { return (" + func.toString() + ").apply(this, " + JSON.stringify(args) + ");}";
	    return page.evaluate(fn);
	}

  function sendEmail(address, reportName) {
  	console.log("SENDING")

	var smtpTransport = nodemailer.createTransport({
	   service: "Gmail",  // sets automatically host, port and connection security settings
	   auth: {
	       user: "demo.reporta@gmail.com",
	       pass: "wololofydp"
	   }
	});

	var mailOptions = {
		from: 'demo.reporta@gmail.com',
		to: address,
		subject: 'Generated Reporta Document',
		attachments: [
        {   // file on disk as an attachment
            filename: reportName,
            path: 'generated_reports/' + reportName
        }]
	};
	smtpTransport.sendMail(mailOptions, function (err, info){
		// If a problem occurs, return callback with the error
		if(err)
			console.log(err)
		else {
			console.log(info);
			fs.unlink('generated_reports/' + reportName, function(err) {
			   if (err) {
			       return console.error(err);
			   }
			   console.log("Deleted report file");
			});
		}
	});
  }

  function generateFileName(date, recipeName) {
  	return recipeName + ':' + date.toDateString() + "." + formatType;
  }

  apiHandler.generateReport = function(res, req) {

  	var date = new Date();

    var data = req.method == 'GET' ? req.query : req.body;

  	recipeModel.findOne({ owner_id: data.userId, name: data.recipeName }, function(err, recipe) {
  		templateModel.findOne({ owner_id: data.userId, name: recipe.template_name }, function(err, template) {

  			console.log("TEMPLATE")
  			console.log(template);

	  		jsdom.env(
			  recipe.content,
			  ["http://code.jquery.com/jquery.js"],
			  function (err, window) {
			    var elementsToGenerate = [];
				var allElements = window.document.getElementsByTagName('*');
				for (var i = 0, n = allElements.length; i < n; i++)
				{
				  if (allElements[i].getAttribute("data-type") !== null)
				  {
				    // Element exists with attribute. Add to array.
				    elementsToGenerate.push(allElements[i]);
				  }
				}

				var generatedElementCount = 0;
				var startTimestamp = new Date().getTime();

			    for(var i = 0; i < elementsToGenerate.length; i++) {

			    	var elementToGenerate = elementsToGenerate[i];

			    	// image
			    	if(elementsToGenerate[i].getAttribute("data-type") == "Interrupts" || 
			    		elementsToGenerate[i].getAttribute("data-type") == "DensityMaps" || 
			    		elementsToGenerate[i].getAttribute("data-type") == "IffCooccurInvar" || 
			    		elementsToGenerate[i].getAttribute("data-type") == "EventRuntimeJitter") {

			    		(function(index) {
							http.get({
						        host : 'localhost',
							    port : 3000,
						        path: '/api/mockDataImage'
						    }, function(response) {
						        // Continuously update stream with data
						        var body = '';
						        response.on('data', function(d) {
						            body += d;
						        });
						        response.on('end', function() {
									var parsed = JSON.parse(body);
						            elementsToGenerate[index].src = parsed.message;
						            generatedElementCount ++;
						        });
						    });
						})(i)
			    	} else if (elementsToGenerate[i].getAttribute("data-type") == "dynamicText") {
			            (function(index) {
			              	http.get({
			                 	host : 'localhost',
			                  	port : 3000,
			                  	path: '/api/mockDataJSON'
			              	}, function(response) {
			                  	// Continuously update stream with data
			                  	var body = '';
								response.on('data', function(d) {
								  	body += d;
								});
								response.on('end', function() {
									var parsed = JSON.parse(body);

									var text = window.document.createTextNode(parsed.message["min"]);
									elementsToGenerate[index].parentNode.replaceChild(text, elementsToGenerate[index]);
									// elementsToGenerate[index].removeChild(elementsToGenerate[index]);
									generatedElementCount ++;
			                	});
			              	});
			            })(i);
			        }
			    }

			    while(generatedElementCount < elementsToGenerate) {
			    	if(new Date().getTime() - startTimestamp > elementsToGenerate * 1000) {
			    		console.log("Generate Elements Timeout");
			    		return;
			    	}
			    }

			    phantom.create(function (ph) {
			      ph.createPage(function (page) {
			      	page.set('content', window.document.getElementsByTagName('body')[0].innerHTML);

			      	if(template.header == undefined)
			      		template.header = "";
					var createHeader = new Function('pageNum', 'numPages', 'return \'<br><h5>' + template.header + '</h5>\';');
					var createFooter = new Function('pageNum', 'numPages', 'if(' + template.page_numbers + ') { return \'<h6>\' + pageNum + "/" + numPages + \'</h6>\';} return "";');
					

			        page.set('paperSize', {
			          	format: 'A4',
			          	header: {
                            height: "2cm",
                            contents: ph.callback(createHeader)
                        },
                        footer: {
                            height: "1cm",
                            contents: ph.callback(createFooter)
                        }
			        }, function() {
						setTimeout(function() {
							console.log("RENDER");
							page.render("generated_reports/" + generateFileName(date, recipe.name), {format: formatType, quality: '100'}, function() {
				          		res.download(generateFileName(date, recipe.name), function(err) {
				          			sendEmail(data.email, generateFileName(date, recipe.name));
				          		});
					            ph.exit();
					        });
						}, 5000);
			        });
			      });
			    });
			   	res.json({ status: "ok"});
			  }
			);
    	});
	});
  };

};