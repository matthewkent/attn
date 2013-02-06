$(function(){

  function restoreOptions() {
    chrome.storage.sync.get(["options_rate", "options_visits"], function(opt) {
      $("#options_rate").val(opt.options_rate);
      $("#options_visits").val(opt.options_visits);
    });
  }

  function saveOptions() {
    var opt_rate = $("#options_rate").val();
    var opt_visits = $("#options_visits").val();
    chrome.storage.sync.set({"options_rate": opt_rate, "options_visits": opt_visits}, function() {
      $("#status").html("Options saved.");
    });
  }

  $("#save").click(function(e){
    e.preventDefault();
    saveOptions();
  });

  restoreOptions();

});
