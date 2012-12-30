var foundFeeds = [];
$("link[type='application/rss+xml']:first").each(function(){
	if($(this).attr("href").match(/.*comments.*/) == null){
		foundFeeds.push($(this).attr("href"));
	}
});
if(foundFeeds.length>0){
	var port = chrome.extension.connect({name: "feeds"});
	port.postMessage(foundFeeds);
}