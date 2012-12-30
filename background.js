var ACCESS_KEY="AKIAJV5QSAT7BNPEFGDQ";
var SECRET_KEY="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";
var BUCKET="shankattn";

var s3 = new S3Ajax({ key_id : ACCESS_KEY, secret_key : SECRET_KEY});
var feeds = [];

$.get("http://s3.amazonaws.com/shankattn/attn.opml", function(data){
	$(data).find("outline").each(function(){
		feeds.push($(this).attr("xmlUrl"));
	});
});

chrome.extension.onConnect.addListener(function(port) {
	if(port.name=="feeds"){
	  port.onMessage.addListener(function(foundFeeds) {
			for(var i in foundFeeds){
				var feed = foundFeeds[i];
				if(feed.match(/^http\:\/\/.+$/)){
					var found=false;
					for(var z in feeds){
						if(feed==feeds[z]){
							found=true;
							break;
						}
					}
					if(!found){
						$.get(feed, function(data){
							var itemCount = 0;
							var rate = 0.0;
							var earliestDate = null;
							var latestDate = null;
							var firstUrl = $(data).find("channel").children("link").text();
							$(data).find("item").each(function(){
								itemCount++;
								var date = new Date($(this).children("pubDate").text());
								if(earliestDate==null){
									earliestDate=date;
								}
								if(latestDate==null){
									latestDate=date;
								}
								if(date.getTime() < earliestDate.getTime()){
									earliestDate = date;
								}
								if(date.getTime() > latestDate.getTime()){
									latestDate = date;
								}
							});
							$(data).find("entry").each(function(){
								itemCount++;
								var date = new Date($(this).children("published").text());
								if(earliestDate==null){
									earliestDate=date;
								}
								if(latestDate==null){
									latestDate=date;
								}
								if(date.getTime() < earliestDate.getTime()){
									earliestDate = date;
								}
								if(date.getTime() > latestDate.getTime()){
									latestDate = date;
								}
							});
							if(itemCount>0){
								var timeSpan = latestDate.getTime()-earliestDate.getTime();
								rate = itemCount / (timeSpan / (1000.0*60.0*60.0));
								if(rate <= 10.0){
									console.log(firstUrl);
									visitsForDomain(firstUrl, function(visits){
										console.log(visits);
										if(visits >= 3){
											feeds.push(feed);
											republish();
										}
									});
								}
							}
						});
					}
				}
			}
			
	  });
	}
});

function republish(){
	generateOPML();
}

function generateOPML(){
	var o = '<?xml version="1.0"?>\n<opml version="2.0">\n';
	o+='<head>\n<title>ATTN</title>\n<dateModified>'+(new Date()).toUTCString()+'</dateModified>\n</head>\n<body>\n';
	for(var i in feeds){
		var feed = feeds[i];
    var u = feed.replace(/^(\w+):\/\//,'');
    var parts = u.split("/");
    var host = parts[0].replace(/^www\./,'');
		var escapedFeedUrl=feed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
		o+='<outline title="'+host+'" type="rss" xmlUrl="'+escapedFeedUrl+'"/>\n';
	}
	o+='</body>\n</opml>';
	s3.put(BUCKET,"attn.opml",{}, "text/xml", o, function(){
		console.log("OPML uploaded.");
	});
}

function visitsForDomain(url, cb){
	var url = url.replace(/^(\w+):\/\//,'');
  var parts = url.split("/");
  var domain = parts[0].replace(/^www\./,'');
	console.log(domain);
	chrome.history.search({text : domain, maxResults: 1000, startTime: (new Date()).getTime()-(1000*60*60*24*28)}, function(results){
		var visitCount = 0;
	  for( var i in results ){
			var result = results[i];
			console.log(result.url);
			if(result.url.match(".+"+domain+".*")){
	    	visitCount += result.visitCount;
				console.log("MATCH");
			}
	  }
		cb(visitCount);
	});
}

// chrome.history.search({text : "", maxResults: 1000, startTime: (new Date()).getTime()-(1000*60*60*24*7)}, function(results){
//   var domains = {};
//   var domainsSorted = [];
//   var results = results.sort(function(a,b) { return b.visitCount - a.visitCount });
//   for( var i in results ){
//     var result = results[i];
//     var u = result.url.replace(/^(\w+):\/\//,'');
//     var parts = u.split("/");
//     var host = parts[0].replace(/^www\./,'');
//     if(!domains[host]){
//       domains[host] = 0;
//     }
//     domains[host] += result.visitCount;
//   }
//   for(var host in domains){
//     domainsSorted.push({domain: host, visitCount: domains[host]});
//   }
//   domainsSorted = domainsSorted.sort(function(a,b) { return b.visitCount - a.visitCount });
// 	console.log(domainsSorted);
// });