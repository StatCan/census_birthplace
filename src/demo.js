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
  fromContainer = d3.select(".birthplace .data.from"),
  fromChart = fromContainer.append("svg")
    .attr("id", "canada_birthplace_from"),
  toContainer = d3.select(".birthplace .data.to"),
  toChart = toContainer.append("svg")
    .attr("id", "canada_birthplace_to"),
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
  baseSettings = {
    aspectRatio: 1,
    filterData: function(data) {
      var sett = this,
        to = sett.to.type,
        from = sett.from.type,
        fromArg = sett.from.arg;
      return data.filter(function(d) {
        var toId = sett.to.getValue.call(sett, d),
          toCanada = toId === canadaSgc,
          toProvince = sgc.sgc.isProvince(toId),
          fromId = sett.from.getValue.call(sett, d),
          fromRegion = countriesData.isRegion(fromId) ? countriesData.getRegion(fromId) : null,
          fromCountry = countriesData.isCountry(fromId) ? countriesData.getCountry(fromId) : null;

        if (to === TO_CANADA) {
          if (!toCanada)
            return false;

          if (
            (from === FROM_CONTINENTS && (fromRegion || fromId === "OC")) ||
            (from === FROM_CONTINENT && fromCountry && fromCountry.region && fromCountry.region.continent.id === fromArg) ||
            (from === FROM_OCEANIA && fromCountry && fromCountry.continent && fromCountry.continent.id === "OC") ||
            (from === FROM_REGION && fromCountry && fromCountry.region && fromCountry.region.id === fromArg) ||
            (from === FROM_COUNTRY && fromCountry && fromCountry.id === fromArg)
          )
            return true;
        } else {
          if (
            (from === FROM_CONTINENTS && fromId !== "OUTSIDE") ||
            (from === FROM_OCEANIA && fromId !== "OC") ||
            (from !== FROM_CONTINENTS && from !== FROM_OCEANIA && fromId !== fromArg)
          )
            return false;

          if (
            toId !== "01"
          )
            return true;
        }
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
    getPointValue: function(d) {
      return d.dataPoint.total;
    },
    getMatrix: function(data) {
      var sett = this,
        dataLength = data.length,
        toType = sett.to.type,
        fromType = sett.from.type,
        topLevel = [],
        tos = [],
        froms = [],
        indexes = [],
        loopData = function(cb) {
          var to, from, i, d;
          for (i = 0; i < dataLength; i++) {
            d = data[i];
            to = sett.to.getValue.call(sett, d);
            from = sett.from.getValue.call(sett, d);
            cb(d, to, from);
          }
        },
        getFromParent = function(from) {
          if (fromType === FROM_CONTINENTS) {
            if (countriesData.isRegion(from))
              return countriesData.getRegion(from).continent;
            return countriesData.getContinent(from);
          }

          if (fromType === FROM_CONTINENT)
            return countriesData.getCountry(from).region;

          if (fromType === FROM_OCEANIA)
            return countriesData.getCountry(from);

          if (fromType === FROM_REGION)
            return countriesData.getCountry(from);

          if (fromType === FROM_COUNTRY)
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
        getToParent = function(to) {
          return to;
        },
        m, matrix, t;

      loopData(function(d, to, from) {
        var parent = toType === TO_CANADA ? getFromParent(from) : getToParent(to),
          fromObj = getFrom(from),
          parentIndex = topLevel.indexOf(parent);

        if (parentIndex === -1) {
            //this value is never used
          parentIndex = topLevel.length;
          topLevel.push(parent);
        }

        if (tos.indexOf(to) === -1)
          tos.push(to);

        if (froms.indexOf(fromObj) === -1)
          froms.push(fromObj);
      });

      if (toType === TO_CANADA) {
        indexes.push(indexes.concat(topLevel, tos));
        indexes.push(froms);
      } else {
        indexes.push(indexes.concat(topLevel, froms));
        indexes.push(tos);
      }

      matrix = Array(indexes[0].length);
      for (t = 0; t < indexes[0].length; t++) {
        matrix[t] = Array(indexes[0].length);
        for (m = 0; m < matrix[t].length; m++) {
          matrix[t][m] = Array(indexes[1].length).fill(0);
        }
      }

      loopData(function(d, to, from) {
        var parent = toType === TO_CANADA ? getFromParent(from) : getToParent(to),
          fromObj = getFrom(from),
          parentIndex = topLevel.indexOf(parent),
          fromIndex, toIndex;

        if (toType === TO_CANADA) {
          fromIndex = indexes[1].indexOf(fromObj);
          toIndex = indexes[0].indexOf(to);
          matrix[parentIndex][toIndex][fromIndex] = sett.getPointValue.call(sett, d);
          //TODO: Remove when using real data
          //matrix[parentIndex][toIndex][fromIndex] = Math.round(Math.random() * 200);
        } else {
          fromIndex = indexes[0].indexOf(fromObj);
          toIndex = indexes[1].indexOf(to);
          matrix[parentIndex][fromIndex][toIndex] = sett.getPointValue.call(sett, d);
          //TODO: Remove when using real data
          //matrix[parentIndex][fromIndex][toIndex] = Math.round(Math.random() * 200);
        }
      });
      return {
        indexes: indexes,
        matrix: matrix
      };
    }
  },
  fromSettings = {
    to: {
      type: TO_CANADA
    },

    arcs: {
      getClass: function(d) {
        var cl = "";
        if (typeof d.index === "object") {
          cl += d.index.id + " " + d.index.type;

          if (d.index.type === "country"){
            cl += " " + (d.index.region || d.index.continent).id + "-ct";
          }
        } else {
          d.index;
        }

        return cl;
      },
      getText: function(d) {
        if (d.endAngle - d.startAngle > 0.4) {
          return typeof d.index === "object" ? getCountryI18n(d.index.id) : "";
        }
      }
    },
    ribbons: {
      getClass: function(d) {
        var cat = d.source.category,
          cl = cat.id + " " + cat.type;

        if (cat.type === "country") {
          cl += " " + (cat.region || cat.continent).id + "-ct";
        }
        return cl;
      }
    },
    startAngle: getAngleFn("startAngle"),
    endAngle: getAngleFn("endAngle")
  },
  toSettings = {
    arcs: {
      getClass: function(d) {
        return "sgc_" + d.index;
      },
      getText: function(d) {
        if (d.endAngle - d.startAngle > 0.4) {
          return sgcFormatter.format(d.index);
        }
      }
    },
    ribbons: {
      getClass: function(d) {
        return "sgc_" + d.source.index;
      }
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
  showData = function() {
    fromSettings.from.type = showFrom;
    toSettings.from.type = showFrom;
    toSettings.to.type = showTo;

    if (showFromArg) {
      fromSettings.from.arg = showFromArg;
      toSettings.from.arg = showFromArg;
    }

    if (showToArg) {
      toSettings.from.arg = showToArg;
    }

    toChart.select(".data").remove();
    fromChart.select(".data").remove();
    chordChart(fromChart, fromSettings);
    chordChart(toChart, toSettings);
  },

  fillPobSelect = function(pobData) {
    var pobs = pobData.indexes[0].data,
      createOption = function(id) {
        var $pob = $(window.pob);
        $("<option></option>")
          .attr("value", id)
          .text(getCountryI18n(id))
          .appendTo($pob);
      },
      loopCountries = function(geo) {
        var ct, country;
        for (ct = 0; ct < geo.countries.length; ct++) {
          country = geo.countries[ct];
          if (pobs.indexOf(country.id) !== -1) {
            createOption(country.id);
          }
        }
      },
      c, continent, r, region;

    for (c = 0; c < countriesData.continents.length; c++) {
      continent = countriesData.continents[c];
      createOption(continent.id);

      if (continent.regions) {
        for (r = 0; r < continent.regions.length; r++) {
          region = continent.regions[r];
          createOption(region.id);

          if (region.countries) {
            loopCountries(region);
          }
        }
      } else if (continent.countries) {
        loopCountries(continent);
      }
    }
  },
  onMouseOver = function(e) {
    var hoverClass = "hovering",
      obj;
    clearTimeout(hoverTimeout);
    switch (e.type) {
    case "mouseover":
      obj = d3.select(e.target.parentNode).data()[0];
      fromChart.select(".data").classed("hover", true);
      fromChart.selectAll("." + hoverClass).classed(hoverClass, false);
      d3.select(e.target.parentNode).classed(hoverClass, true);
      if (obj.source) {
        d3.select("." + obj.source.index.id).classed(hoverClass, true);
      }
      break;
    case "mouseout":
      hoverTimeout = setTimeout(function() {
        $("#canada_birthplace_from .data").trigger("mouseout");
      }, 100);
      return false;
    }
  },
  onMouseOut = function() {
    fromChart.select(".data").classed("hover", false);
  },
  onClick = function(e) {
    var classes = e.target.parentNode.className.baseVal.split(" "),
      id = classes[0],
      type = classes[1];

    if (type === "continent" && id === "OC") {
      showFrom = FROM_OCEANIA;
      showFromArg = null;
    } else {
      switch (type) {
      case "continent":
        showFrom = FROM_CONTINENT;
        break;
      case "region":
        showFrom = FROM_REGION;
        break;
      case "country":
        showFrom = FROM_COUNTRY;
      }
      showFromArg = id;
    }
    showData();
  },
  showFrom = FROM_CONTINENTS,
  showFromArg = null,
  showTo = TO_PT,
  showToArg = null,
  countriesData, birthplaceData, sgcFormatter, hoverTimeout;

i18n.load([sgcI18nRoot, countryI18nRoot, rootI18nRoot], function() {
  d3.queue()
    .defer(d3.json, sgcDataUrl)
    .defer(d3.json, countriesDataUrl)
    .defer(d3.json, birthplaceDataUrl)
    .await(function(error, sgcs, countries, birthplace) {
      var extra = {};
      sgcFormatter = sgc.getFormatter(sgcs);
      countriesData = statcan_countries(countries);
      birthplaceData = processData.call(baseSettings, birthplace);
      fillPobSelect(birthplace);

      extra.data = birthplaceData;

      fromSettings = $.extend(true, {}, baseSettings, fromSettings, extra);
      toSettings = $.extend(true, {}, baseSettings, toSettings, extra);

      showData();

      $(document).on("mouseover mouseout", "#canada_birthplace_from path", onMouseOver);
      $(document).on("mouseout", "#canada_birthplace_from .data", onMouseOut);
      $(document).on("click", "#canada_birthplace_from .arcs path", onClick);
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
