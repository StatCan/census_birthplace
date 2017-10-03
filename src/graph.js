(function(extend) {
var defaults = {
  margin: {
    top: 2,
    right: 2,
    bottom: 2,
    left: 2
  },
  arcsWidth: 20,
  padding: 0.03,
  aspectRatio: 16 / 9,
  width: 600
};

this.chordChart = function(svg, settings) {
  var mergedSettings = extend(true, {}, defaults, settings),
    outerWidth = mergedSettings.width,
    outerHeight = Math.ceil(outerWidth / mergedSettings.aspectRatio),
    innerHeight = mergedSettings.innerHeight = outerHeight - mergedSettings.margin.top - mergedSettings.margin.bottom,
    innerWidth = mergedSettings.innerWidth = outerWidth - mergedSettings.margin.left - mergedSettings.margin.right,
    chartInner = svg.select("g"),
    dataLayer = chartInner.select(".data"),
    transition = d3.transition()
      .duration(1000),
    draw = function() {
      var sett = this.settings,
        data = (sett.filterData && typeof sett.filterData === "function") ?
          sett.filterData.call(sett, sett.data) : sett.data,
        outerRadius = Math.min(innerHeight, innerWidth) / 2,
        innerRadius = outerRadius - sett.arcsWidth,
        mapIndexes = function(d) {
          var newD = chord(d.matrix),
            g, group, c, ch;
          for (g = 0; g < newD.groups.length; g++) {
            group = newD.groups[g];
            group.index = d.indexes[0][group.index];
          }
          for (c = 0; c < newD.length; c++) {
            ch = newD[c];
            ch.source.category = d.indexes[1][ch.source.category];
            ch.target.category = d.indexes[1][ch.target.category];
            ch.source.index = d.indexes[0][ch.source.index];
            ch.source.subindex = d.indexes[0][ch.source.subindex];
            ch.target.index = d.indexes[0][ch.target.index];
            ch.target.subindex = d.indexes[0][ch.target.subindex];
          }
          return newD;
        },
        arcTween = function(d) {
          var i = d3.interpolate(this._current, d);
          this._current = i(0);

          return function(t) {
            return arc(i(t));
          };
        },
        arcsClass = sett.arcs && sett.arcs.getClass ? sett.arcs.getClass.bind(sett) : null,
        arcsText = sett.arcs && sett.arcs.getText ? sett.arcs.getText.bind(sett) : null,
        ribbonTween = function(d) {
          var i = d3.interpolate(this._current, d);
          this._current = i(0);

          return function(t) {
            return ribbon(i(t));
          };
        },
        ribbonsClass = sett.ribbons ? sett.ribbons.getClass.bind(sett) : null,
        chord = d3.multichord()
          .padAngle(sett.padding),
        arc = d3.arc()
          .innerRadius(innerRadius)
          .outerRadius(outerRadius),
        ribbon = d3.ribbon()
          .radius(innerRadius),
        arcsGroup = dataLayer.select(".arcs"),
        ribbonsGroup = dataLayer.select(".ribbons"),
        arcs, ribbons;

      if (sett.startAngle) {
        arc.startAngle(sett.startAngle.bind(sett));
        ribbon.startAngle(sett.startAngle.bind(sett));
      }

      if (sett.endAngle) {
        arc.endAngle(sett.endAngle.bind(sett));
        ribbon.endAngle(sett.endAngle.bind(sett));
      }

      if (dataLayer.empty()) {
        dataLayer = chartInner.append("g")
          .attr("class", "data")
          .attr("transform", "translate(" + innerWidth / 2 + "," + innerHeight / 2 + ")");
      }
      dataLayer.datum(mapIndexes(sett.getMatrix.call(sett, data)));

      if (arcsGroup.empty()) {
        arcsGroup = dataLayer.append("g")
          .attr("class", "arcs");
      }
      arcs = arcsGroup
        .selectAll("g")
        .data(function(chords) { return chords.groups; });

      if (ribbonsGroup.empty()) {
        ribbonsGroup = dataLayer.append("g")
          .attr("class", "ribbons");
      }
      ribbons = ribbonsGroup
        .selectAll("g")
        .data(function(chords) { return chords; });

      arcs
        .enter()
        .append("g")
          .attr("class", arcsClass)
          .each(function(d, index) {
            var parent = d3.select(this),
              arcId = function() {
                return svg.attr("id") + "arc" + index;
              };

            parent.append("path")
              .attr("d", arc)
              .attr("id", arcId);

            parent.append("text")
              .attr("dy", 15)
              .attr("dx", 5)
                .append("textPath")
                .attr("href", function() {
                  return "#" + arcId.apply(this, arguments);
                })
                .text(arcsText);
          });

      arcs
        .attr("class", arcsClass)
        .each(function() {
          d3.select(this).select("path")
            .transition(transition)
            .attrTween("d", arcTween);
        });

      arcs
        .exit()
        .remove();

      ribbons
        .enter()
        .append("g")
          .attr("class", ribbonsClass)
          .each(function() {
            d3.select(this).append("path")
              .attr("d", ribbon);
          });

      ribbons
        .attr("class", ribbonsClass)
        .each(function() {
          d3.select(this).select("path")
            .transition(transition)
            .attrTween("d", ribbonTween);
        });

      ribbons
        .exit()
        .remove();

    },
    rtnObj, process;

  rtnObj = {
    settings: mergedSettings,
    svg: svg
  };

  svg
    .attr("viewBox", "0 0 " + outerWidth + " " + outerHeight)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("role", "img")
    .attr("aria-label", mergedSettings.altText);

  if (chartInner.empty()) {
    chartInner = svg.append("g")
      .attr("transform", "translate(" + mergedSettings.margin.left + "," + mergedSettings.margin.top + ")");
  }

  process = function() {
    draw.apply(rtnObj);
    if (mergedSettings.datatable === false) return;
    d3.stcExt.addIEShim(svg, outerHeight, outerWidth);
  };
  if (!mergedSettings.data) {
    d3.json(mergedSettings.url, function(error, data) {
      mergedSettings.data = data;
      process();
    });
  } else {
    process();
  }

  return rtnObj;
};

})(jQuery.extend, jQuery);
