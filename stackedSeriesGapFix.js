(function (window, factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return factory();
    });
  } else {
    window.stackedSeriesGapFix = factory();
  }
}(window, function () {

  var getPreFix = function(data, index) {
    var i = index - 1;
    if (data[i]) {
      return {
        x: data[i].x,
        i: i
      };
    }
    /* search for previous null-point value
    while (--index >= 0) {
      if (data[index].y !== null) {
        return {
          x: data[index].x,
          i: index
        };
      }
    }
    */
    return null;
  };
  
  var getPostFix = function(data, index) {
    var i = index + 1;
    if (data[i]) {
      return {
        x: data[i].x,
        i: i
      };
    }
    /* search for next null-point value
    while (++index < data.length) {
      if (data[index].y !== null) {
        return {
          x: data[index].x,
          i: index
        };
      }
    }
    */
    return null;
  };
  
  var createFixPoint = function(x, y) {
    return {
      x: x,
      y: y,
      type: 'fix',
      marker: {
        enabled: false,
        states: {
          hover: {
            enabled: false
          }
        }
      }
    };
  };
  
  var fixSeries = function(series) {
    var data = series.data;
    var fix = [];
      
    // Collect data gaps and create fix points
    for (var i = 0, len = data.length; i < len; i++) {
      if (data[i].y === null) {
        var pre = getPreFix(data, i);
        var post = getPostFix(data, i);
        fix.push({
          index: i,
          x: data[i].x,
          xPre: pre && pre.x,
          xPost: post && post.x,
          y: null
        });
          
        if (post) {
          // Jump to next non-fix value
          i = post.i;
        }
      }
    }
      
      // Reverse fix to start with the last (indicies!)
      fix = fix.reverse();
      
    // Insert generated fix points into data series
    for (var i = 0, len = fix.length; i < len; i++) {
      if (fix[i].xPost) {
        data.splice(fix[i].index + 1, 0, createFixPoint(fix[i].xPost - 1, fix[i].y));
      }
      if (fix[i].xPre) {
        data.splice(fix[i].index, 0, createFixPoint(fix[i].xPre + 1, fix[i].y));
      }
    }
  }
  
  // Expose to public
  return {
    fixSeries: fixSeries
  };
}));
