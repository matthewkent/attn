$(function(){
  chrome.extension.getBackgroundPage().links(function(_links){
    $("#links").empty();
    $(_links).each(function(){
      var img = '<img class="icon" src="http://www.google.com/s2/favicons?domain='+this.feedDomain+'" alt="">';
      $("#links").append("<li>"+img+"<a href='"+this.url+"'>"+this.title+"</a></li>");
    });
  });
  $("a").live("click",function(){
    chrome.tabs.create({url: $(this).attr("href")});
  });
  chrome.browserAction.setIcon({path: "attn_icon_off.png"});
});