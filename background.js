chrome.history.search({text : "", maxResults: 10000}, function(results){
  var domains = {};
  var domainsSorted = [];
  var results = results.sort(function(a,b) { return b.visitCount - a.visitCount });
  for( var i in results ){
    var result = results[i];
    var u = result.url.replace(/^(\w+):\/\//,'');
    var parts = u.split("/");
    var host = parts[0].replace(/^www\./,'');
    if(!domains[host]){
      domains[host] = 0;
    }
    domains[host] += result.visitCount;
  }
  for(var host in domains){
    domainsSorted.push({domain: host, visitCount: domains[host]});
  }
  domainsSorted = domainsSorted.sort(function(a,b) { return b.visitCount - a.visitCount });
});

chrome.extension.onConnect.addListener(function(port) {
	if(port.name=="feed"){
	  port.onMessage.addListener(function(msg) {
	    console.log(msg);
	  });
	}
});