const FROM_CONTINENTS = 1,
  FROM_CONTINENT = 2,
  FROM_REGION = 3,
  FROM_COUNTRY = 4,
  FROM_OCEANIA = 5,
  TO_CANADA = 1,
  TO_PT = 2,
  TO_CMA = 3;

var sgcI18nRoot = "lib/statcan_sgc/i18n/sgc/",
  countryI18nRoot = "lib/statcan_countries/i18n/",
  rootI18nRoot = "src/i18n/",
  sgcDataUrl = "lib/statcan_sgc/sgc.json",
  countriesDataUrl = "lib/statcan_countries/countries.json",
  birthplaceDataUrl = "data/census_birthplace.json",
  container = d3.select(".birthplace .data"),
  chart = container.append("svg")
    .attr("id", "canada_birthplace"),
  rootI18nNs = "census_birthplace",
  canadaSgc = "01",
  getAngleFn = function(angleProp) {
    return function(d) {
      return d[angleProp] - Math.PI;
    };
  },
  getCountryI18n = function(id) {
    return i18next.t(id, {ns: ["continent", "region", "country"]});
  },
  settings = {
    filterData: function(data) {
      var to = this.to.type,
        from = this.from.type,
        fromArg = this.from.arg;
      return data.filter(function(d) {
        var fromTrue = false,
          toTrue = false,
          toCanada = settings.to.getValue.call(settings, d) === canadaSgc,
          toProvince = sgc.sgc.isProvince(settings.to.getValue.call(settings, d)),
          fromId = settings.from.getValue.call(settings, d),
          fromRegion = countriesData.isRegion(fromId) ? countriesData.getRegion(fromId) : null,
          fromCountry = countriesData.isCountry(fromId) ? countriesData.getCountry(fromId) : null;
        if (
          (to === TO_CANADA && toCanada) ||
          (to === TO_PT && toProvince) ||
          (to === TO_CMA && !toCanada && !toProvince)
        )
          toTrue = true;

        if (
          (from === FROM_CONTINENTS && (fromRegion || fromId === "OC")) ||
          (from === FROM_CONTINENT && fromCountry && fromCountry.region && fromCountry.region.continent.id === fromArg) ||
          (from === FROM_OCEANIA && fromCountry && fromCountry.continent && fromCountry.continent.id === "OC") ||
          (from === FROM_REGION && fromCountry && fromCountry.region &&fromCountry.region.id === fromArg) ||
          (from == FROM_COUNTRY && fromCountry)
        )
          fromTrue = true;

        return fromTrue && toTrue;
      });
    },
    from: {
      getValue: function(d) {
        return d.pobId;
      }
    },
    to: {
      getValue: function(d) {
        return d.sgcId;
      }
    },
    arcs: {
      getClass: function(d) {
        return typeof d.index === "object" ? d.index.id + " " + d.index.type : d.index;
      },
      getText: function(d) {
        if (d.endAngle - d.startAngle > 0.4) {
          return typeof d.index === "object" ? getCountryI18n(d.index.id) : "";
        }
      }
    },
    ribbons: {
      getClass: function(d) {
        var cat = d.source.category;
        return cat.id + " " + cat.type;
      }
    },
    startAngle: getAngleFn("startAngle"),
    endAngle: getAngleFn("endAngle"),
    getPointValue: function(d) {
      return d.dataPoint.total;
    },
    getMatrix: function(data) {
      var dataLength = data.length,
        toType = this.to.type,
        fromType = this.from.type,
        topLevel = [],
        tos = [],
        froms = [],
        indexes = [],
        loopData = function(cb) {
          var to, from, i, d;
          for (i = 0; i < dataLength; i++) {
            d = data[i];
            to = settings.to.getValue.call(settings, d);
            from = settings.from.getValue.call(settings, d);
            cb(d, to, from);
          }
        },
        getParent = function(from) {
          if (fromType === FROM_CONTINENTS) {
            if (countriesData.isRegion(from))
              return countriesData.getRegion(from).continent;
            return countriesData.getContinent(from);
          }

          if (fromType === FROM_CONTINENT)
            return countriesData.getCountry(from).region;

          if (fromType === FROM_OCEANIA)
            return countriesData.getCountry(from).continent;

          if (fromType === FROM_REGION)
            return countriesData.getCountry(from);
        },
        getFrom = function(from) {
          if (countriesData.isContinent(from))
            return countriesData.getContinent(from);
          if (countriesData.isRegion(from))
            return countriesData.getRegion(from);
          if (countriesData.isCountry(from))
            return countriesData.getCountry(from);
        },
        m, matrix, t;

      loopData(function(d, to, from) {
        var parent = getParent(from),
          fromObj = getFrom(from),
          parentIndex = topLevel.indexOf(parent);

        if (parentIndex === -1) {
          parentIndex = topLevel.length;
          topLevel.push(parent);
        }

        if (tos.indexOf(to) === -1)
          tos.push(to);

        if (froms.indexOf(fromObj) === -1)
          froms.push(fromObj);
      });

      indexes.push(indexes.concat(topLevel, tos));
      indexes.push(froms);
      matrix = Array(indexes[0].length);
      for (t = 0; t < indexes[0].length; t++) {
        matrix[t] = Array(indexes[0].length);
        for (m = 0; m < matrix[t].length; m++) {
          matrix[t][m] = Array(indexes[1].length).fill(0);
        }
      }

      loopData(function(d, to, from) {
        var parent = getParent(from),
          fromObj = getFrom(from),
          parentIndex = topLevel.indexOf(parent),
          fromIndex = indexes[1].indexOf(fromObj),
          toIndex = indexes[0].indexOf(to);
        matrix[parentIndex][toIndex][fromIndex] = settings.getPointValue.call(settings, d);
      });
      return {
        indexes: indexes,
        matrix: matrix
      };
    }
  },
  processData = function(data) {
    var newData = [],
      xIndexes = data.indexes[0].data,
      yIndexes = data.indexes[1].data,
      props = Object.keys(data.values),
      newObj, x, y, z, id;

    for (x = 0; x < xIndexes.length; x ++) {
      for(y = 0; y < yIndexes.length; y++) {
        id = data.matrix[x][y];
        newObj = {
          pobId: xIndexes[x],
          sgcId: yIndexes[y],
          dataPoint: {}
        };

        for (z = 0; z < props.length; z++) {
          newObj.dataPoint[props[z]] = data.values[props[z]][id];
        }
        newData.push(newObj);
      }
    }
    return newData;
  },
  showData = function(from, to, fromArg, toArg) {
    settings.from.type = from;
    settings.to.type = to;

    if (fromArg) {
      settings.from.arg = fromArg;
    }

    if (toArg) {
      settings.from.arg = toArg;
    }

    chart.select(".data").remove();
    chordChart(chart, settings);
  },
  onMouseOver = function(e) {
    var hoverClass = "hovering",
      obj;
    clearTimeout(hoverTimeout);
    switch (e.type) {
    case "mouseover":
      obj = d3.select(e.target.parentNode).data()[0];
      chart.select(".data").classed("hover", true);
      chart.selectAll("." + hoverClass).classed(hoverClass, false);
      d3.select(e.target.parentNode).classed(hoverClass, true);
      if (obj.source) {
        d3.select("." + obj.source.index.id).classed(hoverClass, true);
      }
      break;
    case "mouseout":
      hoverTimeout = setTimeout(function() {
        $("#canada_birthplace .data").trigger("mouseout");
      }, 100);
      return false;
    }
  },
  onMouseOut = function() {
    chart.select(".data").classed("hover", false);
  },
  onClick = function(e) {
    var classes = e.target.parentNode.className.baseVal.split(" "),
      id = classes[0],
      type = classes[1];

    if (type === "continent") {
      if (id === "OC") {
        showData(FROM_OCEANIA, TO_CANADA);
      } else {
        showData(FROM_CONTINENT, TO_CANADA, id);
      }
    }

    if (type === "region") {
      showData(FROM_REGION, TO_CANADA, id);
    }
  },
  countriesData, birthplaceData, sgcFormatter, hoverTimeout;

i18n.load([sgcI18nRoot, countryI18nRoot, rootI18nRoot], function() {
  d3.queue()
    .defer(d3.json, sgcDataUrl)
    .defer(d3.json, countriesDataUrl)
    .defer(d3.json, birthplaceDataUrl)
    .await(function(error, sgcs, countries, birthplace) {
      sgcFormatter = sgc.getFormatter(sgcs);
      countriesData = statcan_countries(countries);
      birthplaceData = processData(birthplace);

      settings.data = birthplaceData;

      showData(FROM_CONTINENTS, TO_CANADA);

      $(document).on("mouseover mouseout", "#canada_birthplace path", onMouseOver);
      $(document).on("mouseout", "#canada_birthplace .data", onMouseOut);
      $(document).on("click", "#canada_birthplace .arcs path", onClick);
    });
});

if (!Array.prototype.fill) {
  Object.defineProperty(Array.prototype, "fill", {
    value: function(value) {
      var O = Object(this);
      var k = 0;
      while (k < O.length) {
        O[k] = value;
        k++;
      }
      return O;
    }
  });
}
