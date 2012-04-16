$("link[type='application/rss+xml']").each(function(){
	var port = chrome.extension.connect({name: "feed"});
	port.postMessage($(this).attr("href"));
});