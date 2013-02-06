var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.msIndexedDB;
var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;
var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange;
var IDBCursor = window.IDBCursor || window.webkitIDBCursor;

var optionsRate = 10.0;
var optionsVisits = 3;
chrome.storage.sync.get(["options_rate", "options_visits"], function(opt) {
  if(opt.options_rate !== undefined) {
    optionsRate = parseFloat(opt.options_rate);
  }
  if(opt.options_visits !== undefined) {
    optionsVisits = parseInt(opt.options_visits);
  }
});
chrome.storage.onChanged.addListener(function(changes, areaName) {
  if(changes.options_rate !== undefined) {
    optionsRate = parseFloat(changes.options_rate.newValue);
  }
  if(changes.options_visits !== undefined) {
    optionsVisits = parseInt(changes.options_visits.newValue);
  }
});

var db = null;
var openRequest = indexedDB.open("attn", 1);

openRequest.onerror = function(e) {
  console.error("error opening attn db: " + e.target.errorCode);
}

openRequest.onupgradeneeded = function(e) {
	var thisDb = e.target.result;

	if(!thisDb.objectStoreNames.contains("feeds")) {
		var objectStore = thisDb.createObjectStore("feeds", {
			keyPath: "url"
		});
	}

	if(!thisDb.objectStoreNames.contains("links")) {
		var objectStore = thisDb.createObjectStore("links", {
			keyPath: "url"
		});
		objectStore.createIndex("date", "date", {
			unique: false
		});
	}
}

openRequest.onsuccess = function(e) {
	db = e.target.result;

	db.onerror = function(e) {
		console.dir(e.target);
	}

	if(!db.objectStoreNames.contains("feeds")) {
		var versionRequest = db.setVersion("1");
		versionRequest.onsuccess = function(e) {
			var objectStore = db.createObjectStore("feeds", {
				keyPath: "url"
			});
		}
	}

	if(!db.objectStoreNames.contains("links")) {
		var versionRequest = db.setVersion("1");
		versionRequest.onsuccess = function(e) {
			var objectStore = db.createObjectStore("links", {
				keyPath: "url"
			});
			objectStore.createIndex("date", "date", {
				unique: false
			});
		}
	}

	scan();
	setInterval(scan, 10 * 60 * 1000);
}

chrome.extension.onConnect.addListener(function(port) {
	if(port.name == "feeds") {
		port.onMessage.addListener(found);
	}
});

function found(feeds) {
	$(feeds).each(function() {
		relevant(this, function(feed) {
			if(feed) {
				subscribe(feed);
			}
		});
	});
}

function relevant(feed, cb) {
	feed = feed.toString();
	if(feed.match(/^http\:\/\/.+$/)) {
		$.get(feed, function(data) {
			var itemCount = 0;
			var rate = 0.0;
			var earliestDate = null;
			var latestDate = null;
			var title = $(data).find("title:first").text();
			var firstUrl = "";
			if($(data).find("link:first").length==1){
				if($(data).find("link:first").attr("href")){
					firstUrl = $(data).find("link:first").attr("href");
				}else{
					firstUrl = $(data).find("link:first").text();
				}
			}
			$(data).find("item").each(function() {
				itemCount++;
				var date = new Date($(this).children("pubDate").text());
				if(earliestDate == null) {
					earliestDate = date;
				}
				if(latestDate == null) {
					latestDate = date;
				}
				if(date.getTime() < earliestDate.getTime()) {
					earliestDate = date;
				}
				if(date.getTime() > latestDate.getTime()) {
					latestDate = date;
				}
			});
			$(data).find("entry").each(function() {
				itemCount++;
				var date = new Date($(this).children("published").text());
				if(earliestDate == null) {
					earliestDate = date;
				}
				if(latestDate == null) {
					latestDate = date;
				}
				if(date.getTime() < earliestDate.getTime()) {
					earliestDate = date;
				}
				if(date.getTime() > latestDate.getTime()) {
					latestDate = date;
				}
			});
			if(itemCount > 0) {
				var timeSpan = latestDate.getTime() - earliestDate.getTime();
				rate = itemCount / (timeSpan / (1000.0 * 60.0 * 60.0));
				if(rate <= optionsRate) {
					var firstUrl = firstUrl.replace(/^(\w+):\/\//,'');
  				var parts = firstUrl.split("/");
  				var domain = parts[0].replace(/^www\./,'');
					visitsForDomain(domain, function(visits) {
						console.log("VISITS "+visits);
						if(visits >= optionsVisits) {
							cb({"url" : feed.toString(), "date" : (new Date((new Date()).getTime()-1000*60*60)), "title" : title, "domain" : domain});
						} else {
							cb(null);
						}
					});
				} else {
					cb(null);
				}
			} else {
				cb(null);
			}
		});
	} else {
		cb(null);
	}
}

function subscribe(feed) {
	var store = db.transaction(["feeds"], "readwrite").objectStore("feeds");
	var req = store.add(feed);
}

function touch(feed) {
	feed.date = new Date();
	var store = db.transaction(["feeds"], "readwrite").objectStore("feeds");
	var req = store.put(feed);
}

function subscriptions(cb) {
	var store = db.transaction(["feeds"], "readonly").objectStore("feeds");
	var req = store.openCursor();
	var _feeds = [];
	req.onsuccess = function(e) {
		var cursor = req.result;
		if(cursor) {
			_feeds.push(cursor.value);
			cursor.
			continue();
		} else {
			cb(_feeds);
		}
	}
}

function scan() {
	console.log("Scanning.");
	var store = db.transaction(["feeds"], "readonly").objectStore("feeds");
	var req = store.openCursor();
	req.onsuccess = function(e) {
		var cursor = req.result;
		if(cursor) {
			read(cursor.value);
			cursor.
			continue();
		}
	}
}

function read(feed, cb) {
	$.get(feed.url.toString(), function(data) {
		$(data).find("item").each(function() {
			var date = new Date($(this).children("pubDate").text());
			addLink($(this).children("title").text(), $(this).children("link").text(), date, feed);
		});
		$(data).find("entry").each(function() {
			var date = new Date($(this).children("published").text());
			addLink($(this).children("title").text(), $(this).children("link").attr("href"), date, feed);
		});
		touch(feed);
		if(cb) {
			cb();
		}
	});
}

function addLink(title, url, date, feed) {
	if(title && url && date && (url != "") && (date.getTime() > feed.date.getTime())) {
		var store = db.transaction(["links"], "readwrite").objectStore("links");
		var req = store.add({
			"title": title,
			"url": url,
			"date": date,
			"feedUrl": feed.url.toString(),
			"feedDomain": feed.domain
		});
		req.onsuccess = function(){
			chrome.browserAction.setIcon({path: "attn_icon.png"});
		};
	}
}

function links(cb) {
	var store = db.transaction(["links"], "readonly").objectStore("links");
	var index = store.index("date");
	var req = index.openCursor(null, "prev");
	var _links = [];
	req.onsuccess = function(e) {
		var cursor = req.result;
		if(cursor) {
			_links.push(cursor.value);
			if(_links.length <= 50){
				cursor.continue();
			}else{
				cb(_links);
			}
		} else {
			cb(_links);
		}
	}
}

function visitsForDomain(domain, cb){
	chrome.history.search({text : domain, maxResults: 1000, startTime: (new Date()).getTime()-(1000*60*60*24*28)}, function(results){
		var visitCount = 0;
	  for( var i in results ){
			var result = results[i];
			if(result.url.match(".+"+domain+".*")){
	    	visitCount += result.visitCount;
			}
	  }
		cb(visitCount);
	});
}