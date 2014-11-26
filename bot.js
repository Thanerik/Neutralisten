// Our Twitter library
var Twit = require('twit');
// @Soruce: https://github.com/ttezel/twit
// Usage of the REST API: https://dev.twitter.com/rest/reference/get/search/tweets

// We need to include our configuration file
var T = new Twit(require('./config.js'));
// And the "database" with all corrections
var N = require('./neutral.json');

// This is the URL of a search for the latest tweets on the '#mediaarts' hashtag.
var Search = {q: "#dkpol", count: 50, result_type: "recent"};

function cleanTweet(data) {
  var ret = data.replace(/&quot;/g, "\"");
      ret = ret.replace(/&apos;/g, "'");
      ret = ret.replace(/&amp;/g, "&");
      ret = ret.replace(/&gt;/g, ">");
      ret = ret.replace(/&lt;/g, "<");
      return ret;
}

// This function finds the latest tweet with the #mediaarts hashtag, and retweets it.
function retweetLatest() {
    T.get('search/tweets', Search, function (error, data) {
      // If our search request to the server had no errors...
      if (!error) {
        var currentdate = new Date(); 
        var datetime = "Last Sync: " + currentdate.getDate() + "/"
                        + (currentdate.getMonth()+1)  + "/" 
                        + currentdate.getFullYear() + " @ "  
                        + currentdate.getHours() + ":"  
                        + currentdate.getMinutes() + ":" 
                        + currentdate.getSeconds();

        console.log(datetime); // Prints current date & time

        // ...then we grab the text of the tweet we want to retweet...
        var tweetData = data.statuses;
        
        tweet: for (var i = tweetData.length - 1; i >= 0; i--) {

        	//  Print all the outputs - to see it works!
            	//console.log(tweetData[i]);
            var whom = tweetData[i].user.screen_name;
            var tweetID = tweetData[i].id;
            var tweetRT = tweetData[i].retweeted; // returns true or false
            var tweetOrd = tweetData[i].text.split(" ");
            var sprog = tweetData[i].lang;
            var neutral = 0;
            var startstr = 0;
            var basestr = 0;
            var count = 0;

            if(whom !== "Neutralisten" && sprog === "da" && !tweetRT) {

            	ord: for (var o = tweetOrd.length - 1; o >= 0; o--) {

                    // Opsætte regler for orde vi springer over - og hvis RT/MT, så drop hele tweet'en
                    if(tweetOrd[o] === "RT" || tweetOrd[o] === "MT" ) { continue tweet; }
                    // Eller spring over orde som ikke skal ersattes
                    if(tweetOrd[o].toLowerCase() === "frankrig" ||
                       tweetOrd[o].toLowerCase() === "fattigdom" ||
                       tweetOrd[o].toLowerCase() === "fattigdommen" ||
                       tweetOrd[o].toLowerCase() === "fattigdomsgrænsen" ||
                       tweetOrd[o].toLowerCase() === "fattigdomsgrænse" ||
                       tweetOrd[o].toLowerCase() === "landstyreformand" ||
                       tweetOrd[o].toLowerCase() === "landstyreformanden" ||
                       tweetOrd[o].toLowerCase() === "styreformand" ||
                       tweetOrd[o].toLowerCase() === "bekrige" ||
                       tweetOrd[o].toLowerCase() === "bekriger" ||
                       tweetOrd[o].toLowerCase() === "forsvare" ||
                       tweetOrd[o].toLowerCase() === "forsvarlig" ||
                       tweetOrd[o].toLowerCase() === "uforsvarlig" ||
                       tweetOrd[o].toLowerCase() === "forsvarlige" ||
                       tweetOrd[o].toLowerCase() === "uforsvarlige" ||
                       tweetOrd[o].toLowerCase() === "forsvarer") { continue ord; }

            		var hashtag = tweetOrd[o].indexOf("#"); // returer 0 hvis har match - ellers -1
            		var snabela = tweetOrd[o].indexOf("@"); // returer 0 hvis har match - ellers -1
            		var link = tweetOrd[o].indexOf("http"); // returer 0 hvis har match - ellers -1
                    startstr += tweetOrd[o].length+1;

            		if(hashtag+snabela+link === -3) {

	             		for (var u = N.nyOrd.length - 1; u >= 0; u--) {

	             			var ordet = N.nyOrd[u].before.toLowerCase();	
	            			var tal = tweetOrd[o].toLowerCase().indexOf(ordet);
	            			
	            			if(tal > -1) {
								neutral += 1;
								tweetOrd[o] = "#"+tweetOrd[o].replace(new RegExp(N.nyOrd[u].before, "gi"), N.nyOrd[u].after);
                                basestr = startstr+((1+N.nyOrd[u].after.length)/2);
								continue ord;
							}
							
	            		};
            		}
            		else {
            			tweetOrd.splice(o,1);
            		}
					
				};

			if(neutral > 0 && count < 3) {
            	var tweetOutput = tweetOrd.join(" "); // Den simple output. Uden hashtag eller @tagning
                var ekstrategn = 10;
                
                var totalAnslag = tweetOutput.length + whom.length + ekstrategn;

                if(totalAnslag > 140) {
                    var charLeft = 140 - whom.length - ekstrategn;
                    var halfway = charLeft/2;
                    var start = tweetOutput.length - charLeft;

                    if(halfway+basestr >= charLeft && basestr-halfway <= 0) {
                        
                        tweetOutput = "[...] " + tweetOutput.substring(start/2,charLeft-12) + " [...]"; 
                    
                    }
                    else if(halfway+basestr >= charLeft) {
                        
                        tweetOutput = "[...] " + tweetOutput.substring(start,charLeft-6);
                    
                    }
                    else if(basestr-halfway <= 0) {
                        
                        tweetOutput = tweetOutput.substring(0,charLeft-6)+" [...]";
                    
                    }
                }

                //Renser vores tweet for html-koder der repræsenterer symboler som <, >, &, " og '
                tweetOutput = cleanTweet(tweetOutput);

                // Den rigtige output.
                tweetOutput = "@" + whom + ": " + tweetOutput + " #DKpol";
            	
                console.log("Whom: " + whom );
                console.log("Before: " + tweetData[i].text );
                console.log("After: " + tweetOutput + " (" + neutral + " point)" );
                console.log("---------");

                T.post('statuses/update', { status: tweetOutput, in_reply_to_status_id: tweetID }, function(err, data, response) {
            		console.log(err);
                    if(!err) {
                        count += 1; // Tæller hvor mange tweets vi sender. Maks 2 pr. session!
                    }
				});
            } // if neutral
            } // if whom == "Neutralisten"

        } // for loop "tweet"

      } // if !error
      
      // However, if our original search request had an error, we want to print it out here.
      else {
        console.log('There was an error with your hashtag search:', error);
      }
      console.log("---------");
      console.log("---------");
    });
} // Close function retweetLatest()

// Try to retweet something as soon as we run the program...
retweetLatest();

//...and then every 15 minutes after that. Time here is in milliseconds, so
// 1000 ms = 1 second, 1 sec * 60 = 1 min, 1 min * 15 = 15 min --> 1000 * 60 * 15
setInterval(retweetLatest, 1000 * 60 * 20);