/**
 * @file stackedSeriesGapFix.js
 * @author Alexander Vey <this.vey@gmail.com>
 * @version 1.0.0
 * 
 * # Summary
 * 
 * Fix a given list (array) of series by optimizing the rendering of gaps
 * (null-value points) within the series in stacked area charts of [Highcharts].
 * 
 * ## Algorithm
 * 
 * - Loop over each series and collect all data gabs (points with null-values)
 * - For each gap create two gap points that will fix the respective gap by
 *   adding one gap point to each series right before the gap point with the timestamp
 *   of the previous data point plus 1. On the other side add one gap
 *   point to each series right behind the gap point with the timestamp of the next 
 *   data point minus 1. This will expand the gap to the maximum borders of the previous
 *   and next data points and will result in the correct visualization of that gap.
 * 
 * ## Example
 * 
 * - Imagine you have the following two data series (x = data gap - represented as null):
 *   s1 = [1,1,1,1,1]
 *   s2 = [2,2,x,2,2]
 * - Without fixing these series the chart will render the both series (type area, stacked)
 *   with the given data gaps (x) as they were 0 values. So there will be 2 triangles left
 *   and right from the data gab due to the fact that [Highcharts] will connect the data gap
 *   0 value with the previous and next data point.
 * - With fixing the series the gap will be expanded by adding two more data points with 
 *   value null to represent data gaps as well. This way [Highcharts] will connect the new
 *   left data gap which is only 1 second behind the previous data point. The arising triangle
 *   is invisible. The same method will hide the irritiating triangle on the right side by
 *   adding the new data gap point just 1 second before the next data point. The gap will now be
 *   rendered corretly between its data points.
 *   The series s1 and s2 will be enriched:
 *   s1 = [1,1,1,1,1,1,1]
 *             |   |
 *   s2 = [2,2,x,x,x,2,2]
 *             |   |
 *   added values (with a timestamp just 1 second before/after the next/previous data point)
 * 
 * ## Features:
 * 
 * - Designed and tested with stacked area series of [Highcharts]
 * - AMD compatible
 * 
 * [Highcharts]: http://www.highcharts.com/
 */
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

  /**
   * Gets the index-based previous series point of the given data.
   * 
   * @param {Object} data The data container
   * @param {Number} index The start index to find the previous point
   * @return {Object} A newly created series point with x, y, and index
   */
  var getPrev = function(data, index) {
    var i = index - 1;
    if (data[i]) {
      return {
        x: data[i].x,
        y: data[i].y,
        i: i
      };
    }
    return null;
  };

  /**
   * Gets the index-based next series point of the given data.
   * 
   * @param {Object} data The data container
   * @param {Number} index The start index to find the next point
   * @return {Object} A newly created series point with x, y, and index
   */  
  var getNext = function(data, index) {
    var i = index + 1;
    if (data[i]) {
      return {
        x: data[i].x,
        y: data[i].y,
        i: i
      };
    }
    return null;
  };
  
  /**
   * Creates a new 'gap' point by using the given x and y values.
   * Sets the 'gap' type and disables the marker (states).
   * 
   * @param {Number} x The x value of the point
   * @param {Mixed} y The y value of the point
   * @return {Object} The gap point of type 'gap' with x and y value
   */
  var createGapPoint = function(x, y) {
    return {
      x: x,
      y: y,
      type: 'gap',
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
  
  /**
   * Fix the given series (array of series) by expanding gaps (null-value points) to 
   * optimize the rendering of the gaps in stacked area charts of Highcharts.
   * 
   * @param {Array} series The series to be fixed
   * @return {Object} The fixed series
   */
  var fixSeries = function(series) {
    var fixPoints = [];
      
    // loop over each series
    for (var iSeries = 0, lenSeries = series.length; iSeries < lenSeries; iSeries++) {
        var data = series[iSeries].data;
        series[iSeries].id = typeof series[iSeries].id !== 'undefined' ? series[iSeries].id : iSeries;
        
        // Collect data gaps and create fix points
        for (var iData = 0, lenData = data.length; iData < lenData; iData++) {
          if (data[iData].y === null) {
            var prev = getPrev(data, iData);
            var next = getNext(data, iData);
            fixPoints.push({
              id: series[iSeries].id,
              index: iData,
              x: data[iData].x,
              xPrev: prev && prev.x,
              xNext: next && next.x,
              y: null
            });
              
            if (next) {
              // Jump to next non-fix value
              iData = next.i;
            }
          }
        }
    }
        
    // Reverse fix to start with the last (indicies!)
    fixPoints = fixPoints.reverse();

    // loop over each series
    for (var iSeries = 0, lenSeries = series.length; iSeries < lenSeries; iSeries++) {
      var data = series[iSeries].data;
      
      // Insert generated fix points into data series
      for (var iFix = 0, lenFix = fixPoints.length; iFix < lenFix; iFix++) {
        var fix = fixPoints[iFix];
          
          var prevGapValue = fix.y;
          var postGapValue = fix.y;
          
          // Replace the fix null value for series that have no gap at the given point
          if (fix.id !== series[iSeries].id) {
              var seriePrevValue = data[fix.index - 1];
              var seriePostValue = data[fix.index + 1];               
              prevGapValue = (seriePrevValue && seriePrevValue.y !== null && seriePrevValue.x === fix.xPrev) ? seriePrevValue.y : fix.y;
              postGapValue = (seriePostValue && seriePostValue.y !== null && seriePostValue.x === fix.xNext) ? seriePostValue.y : fix.y;
          }
          
        if (fix.xNext) {
          data.splice(fix.index + 1, 0, createGapPoint(fix.xNext - 1, postGapValue));
        }
          
        if (fix.xPrev) {
          data.splice(fix.index, 0, createGapPoint(fix.xPrev + 1, prevGapValue));
        }
      }
    }
    
    return series;
  };
  
  // Expose to public
  return {
    fixSeries: fixSeries
  };
}));
