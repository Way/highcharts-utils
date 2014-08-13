/**
 * @file stackedSeriesGapFix.js
 * @author Alexander Vey <this.vey@gmail.com>
 * @version 1.1.0
 *
 * # Summary
 *
 * Fix a given list (array) of series by optimizing the rendering of gaps
 * (null-value points) within the series in stacked area charts of [Highcharts][1].
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
 *   and right from the data gab due to the fact that [Highcharts][1] will connect the data gap
 *   0 value with the previous and next data point.
 * - With fixing the series the gap will be expanded by adding two more data points with
 *   value null to represent data gaps as well. This way [Highcharts][1] will connect the new
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
 * - Designed and tested with stacked area series of [Highcharts][1]
 * - AMD compatible
 *
 * [1]: http://www.highcharts.com/
 */
(function(window, factory) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(function() {
            return factory();
        });
    } else {
        window.stackedSeriesGapFix = factory();
    }
}(window, function() {

    /**
     * Toggle logging for debugging.
     */
    var log = false && typeof console.log !== 'undefined' ? console : false;
    
    /**
     * Time distance used for the timestamp of the gapfix
     * which will be placed with this distance right before/after
     * the gaps next/previous data point (in milliseconds).
     */
    var fixTimeDistance = 1000;
    
    /**
     * Gets the index-based previous series point of the given data.
     *
     * @param {Object} data The data container
     * @param {Number} index The start index to find the previous point
     * @return {Object} A newly created series point with x, y, and index
     */
    var getPrev = function(data, index) {
        while (index >= 0) {
            index--;
            var prev = data[index];
            
            // Stop when running into a previous gap
            if (prev.type === 'gap') {
                return null;
            }
            
            if (prev.y !== null) {
                return {
                    x: prev.x,
                    y: prev.y
                };
            }
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
        while (index < data.length - 1) {
            index++;
            var next = data[index];
            
            // Stop when running into a next gap
            if (next.type === 'gap') {
                return null;
            }
            
            if (next.y !== null) {
                return {
                    x: next.x,
                    y: next.y
                };
            }
        }
        
        return null;
    };

    /**
     * Creates a new 'gap' fix point by using the given x and y values.
     * Sets the 'gap' type and disables the marker (states).
     *
     * @param {Number} x The x value of the point
     * @param {Mixed} y The y value of the point
     * @return {Object} The gap point of type 'gap' with x and y value
     */
    var createGapFixPoint = function(x, y) {
        return {
            x: x,
            y: y,
            type: 'gapfix',
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
     * Sort objects by their index.
     */
    var sortByIndex = function(a, b){
          var aIdx = a.index,
              bIdx = b.index;
          return ((aIdx < bIdx) ? -1 : ((aIdx > bIdx) ? 1 : 0));
    };
    
    /**
     * Insert the given gapfix into the given data at the given index.
     *
     * @param {Array} data The series data array
     * @param {Number} index The index of the gapfix to be inserted
     * @param {Object} gapfix The gapfix to be inserted
     */
    var insertGapFix = function(data, index, gapfix) {
        // Avoid gapfix duplicates
        var type = data[index].type;
        if (type === 'gapfix') {
            return;
        }
        
        log && log.log('insert gapfix', index, gapfix);
        data.splice(index, 0, gapfix);
    };
    
    /**
     * Fix the given series (array of series) by expanding gaps (null-value points) to
     * optimize the rendering of the gaps in stacked area charts of Highcharts.
     *
     * @param {Array} series The series to be fixed
     * @return {Object} The fixed series
     */
    var fixSeries = function(series) {
        var gaps = [],
            gapIds = [],
            gapIndex,
            seriesId,
            iSeries,
            lenSeries,
            data;

        // loop over each series
        for (iSeries = 0, lenSeries = series.length; iSeries < lenSeries; iSeries++) {
            data = series[iSeries].data;
            series[iSeries].id = typeof series[iSeries].id !== 'undefined' ? series[iSeries].id : iSeries;

            // Collect gaps
            for (var iData = 0, lenData = data.length; iData < lenData; iData++) {
                // Gap: a data point with value null (y === null)
                if (data[iData].y === null) {
                    data[iData].type = 'gap';
                    seriesId = series[iSeries].id;
                    
                    // Avoid duplicates
                    gapIndex = gapIds.indexOf(iData);
                    if (gapIndex === -1) {
                        gapIds.push(iData);
                        gaps.push({
                            ids: [seriesId],
                            index: iData,
                            x: data[iData].x,
                            y: data[iData].y  // null cause gap
                        });
                    } else {
                        // Add id of the series to the already existing gap (identified by index)
                        gaps[gapIndex].ids.push(seriesId);
                    }
                }
            }
        }

        // Sort gaps descending by their index (avoid corrupting indicies by adding gapfixes)
        gaps = gaps.sort(sortByIndex).reverse();       
        log && log.log('gaps', gaps);

        // loop over each series
        for (iSeries = 0, lenSeries = series.length; iSeries < lenSeries; iSeries++) {
            data = series[iSeries].data;

            log && log.group('Series ' + (iSeries+1));
            
            // Create fix points for the collected gaps and insert them into each data series
            for (var iGap = 0, lenGap = gaps.length; iGap < lenGap; iGap++) {
                var gap = gaps[iGap];
                var prev = getPrev(data, gap.index);
                var next = getNext(data, gap.index);
                var isGap = data[gap.index].y === null;

                log && log.group('gap');
                log && log.log(gap);
                log && log.log('isGap', isGap);
                log && log.log('prev', prev);
                log && log.log('next', next);

                if (next) {
                    // Replace the gaps null value for series that have no gap at the given point with their value
                    var nextValue = isGap ? null : next.y;
                    var gapfix = createGapFixPoint(next.x - fixTimeDistance, nextValue);
                    insertGapFix(data, gap.index + 1, gapfix);
                }

                if (prev) {
                    // Replace the gaps null value for series that have no gap at the given point with their value
                    var prevValue = isGap ? null : prev.y;
                    var gapfix = createGapFixPoint(prev.x + fixTimeDistance, prevValue);
                    insertGapFix(data, gap.index, gapfix);
                }
                
                log && log.groupEnd();
            }
            
            log && log.groupEnd();
        }

        return series;
    };

    // Expose to public
    return {
        fixSeries: fixSeries
    };
}));
