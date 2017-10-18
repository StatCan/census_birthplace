const FROM_WORLD = 1,
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
  birthplaceDataRootUrl = "data/census_birthplace_{{pi}}.json",
  fromId = "canada_birthplace_from",
  fromContainer = d3.select(".birthplace .data.from"),
  fromChart = fromContainer.append("svg")
    .attr("id", fromId),
  toContainer = d3.select(".birthplace .data.to"),
  toChart = toContainer.append("svg")
    .attr("id", "canada_birthplace_to"),
  rootI18nNs = "census_birthplace",
  canadaSgc = "01",
  oceaniaId = "CONT_OC",
  allGeoId = "OUTSIDE",
  outsideCMASuffix = "-x-nie",
  hiddenClass = "text-hidden",
  immigrationPeriodCount = 7,
  getAngleFn = function(angleProp) {
    return function(d) {
      return d[angleProp] - Math.PI;
    };
  },
  getCountryI18n = function(id, ns) {
    ns = ns || ["continent", "region", "country"];
    return i18next.t(id, {ns: ns});
  },
  getSgcI18n = function(sgcId) {
    if (sgcId.indexOf(outsideCMASuffix) !== -1)
      return i18next.t("out_of_cma", {
        ns: rootI18nNs,
        sgc: sgcFormatter.format(sgcId.substr(0,2))
      });

    return sgcFormatter.format(sgcId);
  },
  getToClass = function(sgcId) {
    var cl = "sgc_" + sgcId,
      province;

    if (!sgc.sgc.isProvince(sgcId)) {
      if (sgcId.indexOf(outsideCMASuffix) !== -1) {
        province = sgcId.substr(0, 2);
      } else {
        province = sgc.sgc.getProvince(sgcId);
      }
      cl += " " + "pt_" + province;
    }

    return cl;
  },
  baseSettings = {
    aspectRatio: 1,
    margin: {
      top: 20
    },
    filterData: function(data) {
      var sett = this,
        toType = sett.to.type,
        toArg = sett.to.arg,
        fromType = sett.from.type,
        fromArg = sett.from.arg;

      return data.filter(function(d) {
        var toId = sett.to.getValue.call(sett, d),
          isCanada = toId === canadaSgc,
          isProvince = sgc.sgc.isProvince(toId),
          from = sett.from.getValue.call(sett, d),
          fromRegion = from.type === "region",
          fromCountry = from.type === "country";

        if (sett.name === "from") {
          if (
            (toType === TO_CANADA && !isCanada) ||
            ((toType === TO_PT || toType === TO_CMA) && toId !== toArg) ||
            (fromType === FROM_WORLD && (!fromRegion && from.id !== oceaniaId)) ||
            (fromType === FROM_CONTINENT && (!fromCountry || !from.region || from.region.continent.id !== fromArg)) ||
            (fromType === FROM_OCEANIA && (!fromCountry || !from.continent || from.continent.id !== oceaniaId)) ||
            (fromType === FROM_REGION && (!fromCountry || !from.region || from.region.id !== fromArg)) ||
            (fromType === FROM_COUNTRY && (!fromCountry || from.id !== fromArg))
          )
            return false;
        } else {
          if (
            isCanada ||
            (toType === TO_CANADA && isProvince) ||
            (toType === TO_PT && (isProvince || isCanada || (toId.indexOf(outsideCMASuffix) !== -1 && toId.substr(0, 2) !== toArg) || (toId.length == 3 && sgc.sgc.getProvince(toId) !== toArg))) ||
            (toType === TO_CMA && toId !== toArg) ||
            (fromType === FROM_WORLD && from !== allGeoId) ||
            (fromType === FROM_OCEANIA && from.id !== oceaniaId) ||
            (fromType !== FROM_WORLD && fromType !== FROM_OCEANIA && from.id !== fromArg)
          )
            return false;
        }

        return true;
      });
    },
    from: {
      getValue: function(d) {
        if (countriesData.isContinent(d.pobId)) {
          return countriesData.getContinent(d.pobId);
        } else if (countriesData.isRegion(d.pobId)) {
          return countriesData.getRegion(d.pobId);
        } else if (countriesData.isCountry(d.pobId)) {
          return countriesData.getCountry(d.pobId);
        }
        return d.pobId;
      }
    },
    to: {
      getValue: function(d) {
        return d.sgcId;
      }
    },
    getPointValue: function(d) {
      return d.dataPoint[immStatus];
    },
    getMatrix: function(data) {
      var sett = this,
        dataLength = data.length,
        chartName = sett.name,
        fromType = sett.from.type,
        toType = sett.to.type,
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
          if (fromType === FROM_WORLD) {
            if (from.type === "region")
              return from.continent;
            return from;
          }

          if (fromType === FROM_CONTINENT)
            return from.region;

          if (fromType === FROM_OCEANIA || fromType === FROM_REGION || fromType === FROM_COUNTRY)
            return from;
        },
        getToParent = function(to) {
          if (toType !== TO_CANADA)
            return to;
          return sgc.sgc.getProvince(to.replace(outsideCMASuffix, ""));
        },
        m, matrix, t;

      loopData(function(d, to, from) {
        var parent = chartName === "from" ? getFromParent(from) : getToParent(to),
          parentIndex = topLevel.indexOf(parent);

        if (parentIndex === -1) {
          parentIndex = topLevel.length;
          topLevel.push(parent);
        }

        if (tos.indexOf(to) === -1)
          tos.push(to);

        if (froms.indexOf(from) === -1)
          froms.push(from);
      });

      if (chartName === "from") {
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
        var parent = chartName === "from" ? getFromParent(from) : getToParent(to),
          parentIndex = topLevel.indexOf(parent),
          fromIndex, toIndex;

        if (chartName === "from") {
          fromIndex = indexes[1].indexOf(from);
          toIndex = indexes[0].indexOf(to);
          matrix[parentIndex][toIndex][fromIndex] = sett.getPointValue.call(sett, d);
        } else {
          fromIndex = indexes[0].indexOf(from);
          toIndex = indexes[1].indexOf(to);
          matrix[parentIndex][fromIndex][toIndex] = sett.getPointValue.call(sett, d);
        }
      });
      return {
        indexes: indexes,
        matrix: matrix
      };
    }
  },
  fromSettings = {
    name: "from",
    arcs: {
      getId: function(d) {
        return d.index.id;
      },
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

        if (d.endAngle - d.startAngle < 0.4) {
          cl += " " + hiddenClass;
        }

        return cl;
      },
      getText: function(d) {
        return typeof d.index === "object" ? getCountryI18n(d.index.id, d.index.type) : "";
      }
    },
    ribbons: {
      getId: function(d) {
        return d.source.category.id;
      },
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
    name: "to",
    arcs: {
      getId: function(d) {
        return d.index;
      },
      getClass: function(d) {
        var cl;
        if (typeof d.index !== "string" || d.index === "OUTSIDE")
          return null;

        cl = getToClass(d.index);
        if (d.endAngle - d.startAngle < 0.4) {
          cl += " " + hiddenClass;
        }

        return cl;
      },
      getText: function(d) {
        if (typeof d.index === "string" && d.index !== "OUTSIDE")
          return getSgcI18n(d.index);
      }
    },
    ribbons: {
      getId: function(d) {
        return d.target.category;
      },
      getClass: function(d) {
        if (typeof d.source.index === "string" && d.source.index !== "OUTSIDE")
          return getToClass(d.source.category);
      }
    }
  },
  getImmigrationPeriod = function(immId) {
    var getbirthplaceDataUrl = function(pi) {
        return birthplaceDataRootUrl.replace("{{pi}}", (pi + 1));
      },
      cb = function() {
        fromSettings.data = birthplaceData[immId];
        toSettings.data = birthplaceData[immId];
        showData();
      };

    if (isNaN(immId) || immId >= immigrationPeriodCount)
      return false;

    if (birthplaceData[immId] !== undefined) {
      cb();
    } else {
      d3.queue()
        .defer(d3.json, getbirthplaceDataUrl(immId))
        .await(function(error, birthplace) {
          birthplaceData[immId] = processData.call(baseSettings, birthplace);
          fillPobSelect(birthplace);
          fillResidenceSelect(birthplace);
          cb();
        });
    }
  },
  processData = function(data) {
    var newData = [],
      xIndexes = data.indexes[0].data,
      yIndexes = data.indexes[1].data,
      props = Object.keys(data.values),
      newObj, x, y, z, dataId, pobId;

    for (x = 0; x < xIndexes.length; x ++) {
      pobId = xIndexes[x];
      for(y = 0; y < yIndexes.length; y++) {
        dataId = data.matrix[x][y];
        newObj = {
          pobId: pobId,
          sgcId: yIndexes[y],
          dataPoint: {}
        };

        for (z = 0; z < props.length; z++) {
          newObj.dataPoint[props[z]] = data.values[props[z]][dataId];
        }
        newData.push(newObj);
      }
    }
    return newData;
  },
  showData = function() {
    var str = JSON.stringify(show);
    fromSettings.from.type = show.from.type;
    toSettings.from.type = show.from.type;
    fromSettings.to.type = show.to.type;
    toSettings.to.type = show.to.type;

    if (show.from.arg) {
      fromSettings.from.arg = show.from.arg;
      toSettings.from.arg = show.from.arg;
    }

    if (show.to.type) {
      fromSettings.to.arg = show.to.arg;
      toSettings.to.arg = show.to.arg;
    }

    if (!oldState || str !== oldState) {
      toChart.select(".data").remove();
      fromChart.select(".data").remove();
      oldState = str;
    }
    clearMouseOverText();
    chordChart(fromChart, fromSettings);
    chordChart(toChart, toSettings);
  },

  fillPobSelect = function(pobData) {
    var pobs = pobData.indexes[0].data,
      $pob = $(window.pob || document.getElementById("pob")),
      createOption = function(id, type) {
        var text = getCountryI18n(id, type);

        if (type === "region") {
          text = "&emsp;" + text;
        } else if (type === "country") {
          text = "&emsp;&emsp;" + text;
        }
        $("<option></option>")
          .attr("value", id)
          .html(text)
          .appendTo($pob);
      },
      loopCountries = function(geo) {
        var ct, country;
        for (ct = 0; ct < geo.countries.length; ct++) {
          country = geo.countries[ct];
          if (pobs.indexOf(country.id) !== -1) {
            createOption(country.id, country.type);
          }
        }
      },
      c, continent, r, region;

  //Fix for Issue #3:  $pob.find("option:gt(0)").remove();

    for (c = 0; c < countriesData.continents.length; c++) {
      continent = countriesData.continents[c];
      createOption(continent.id, continent.type);

      if (continent.regions) {
        for (r = 0; r < continent.regions.length; r++) {
          region = continent.regions[r];
          createOption(region.id, region.type);

          if (region.countries) {
            loopCountries(region);
          }
        }
      } else if (continent.countries) {
        loopCountries(continent);
      }
    }
  },
  fillResidenceSelect = function(pobData) {
    var $dest = $(window.dest || document.getElementById("dest")),
      por = sgcData.filter(function(d) {
        var id = d.sgcId;
        if (id === canadaSgc || pobData.indexes[1].data.indexOf(id) === -1)
          return false;
        return true;
      }).map(function(d) {
        return d.sgcId;
      }).sort(sgc.sortCW),
      s, id, text;

    for (s = 0; s < por.length; s++) {
      id = por[s];
      text = sgcFormatter.format(id);

      $("<option></option>")
        .attr("value", id)
        .html(text)
        .appendTo($dest);
    }
  },
  onMouseOver = function(e) {
    var chart = e.target.ownerSVGElement,
      chartId = chart.id,
      hoverClass = "hovering",
      obj, d3Chart, selector;
    clearTimeout(hoverTimeout[chartId]);
    switch (e.type) {
    case "mouseover":
      obj = d3.select(e.target.parentNode).data()[0];
      d3Chart = d3.select(chart);
      d3Chart.select(".data").classed("hover", true);
      d3Chart.selectAll("." + hoverClass).classed(hoverClass, false);
      d3.select(e.target.parentNode).classed(hoverClass, true);

      if (obj.source) {
        selector = "." + (chartId === fromId ? obj.source.index.id : "sgc_" + obj.source.index);
        d3.select(selector).classed(hoverClass, true);
      }
      break;
    case "mouseout":
      hoverTimeout[chartId] = setTimeout(function() {
        $("#" + chartId + " .data").trigger("mouseout");
      }, 100);
      return false;
    }
  },
  onMouseOut = function(e) {
    d3.select(e.target.ownerSVGElement).select(".data").classed("hover", false);
  },
  onMouseOverText = function(e) {
    var d = d3.select(e.target).datum(),
      svg = d3.select(e.target.ownerSVGElement),
      from, to, value, text;

    if (e.target.parentNode.className.baseVal !== "") {
      if (e.target.ownerSVGElement.id === fromId) {
        if (d.index) {
          from = d.index;
          value = d.value.in;
        } else {
          from = d.source.category;
          value = d.source.value;
        }
        text = i18next.t("flow", {
          ns: rootI18nNs,
          from: getCountryI18n(from.id, from.type),
          to: sgcFormatter.format(show.to.arg || canadaSgc)
        });
      } else {
        if (d.index) {
          to = d.index;
          value = d.value.in;
        } else {
          to = d.source.category;
          value = d.source.value;
        }
        text = i18next.t("flow", {
          ns: rootI18nNs,
          from: getCountryI18n(show.from.arg) || i18next.t("OUTSIDE", {ns: rootI18nNs}),
          to: getSgcI18n(to)
        });
      }

      svg.select(".hover_from")
        .text(text);

      svg.select(".hover_value")
        .text(value);
    }
  },
  clearMouseOverText = function() {
    d3.selectAll(".hover tspan").text("");
  },
  onClick = function(e) {
    var target = e.target,
      classes = target.parentNode.className.baseVal.split(" "),
      id, type;

      //TODO Ensure that the following is following the d3.js standards
      var patt = new RegExp("^sgc_*");
       if (!(patt.test(classes[0]))){
         document.getElementById("pob").value=classes[0];
       }

    if (target.ownerSVGElement.id === fromId) {
      id = classes[0];
      type = classes[1];

      if (type === "continent" && id === oceaniaId) {
        show.from.type = FROM_OCEANIA;
        show.from.arg = null;
      } else {
        switch (type) {
        case "continent":
          show.from.type = FROM_CONTINENT;
          break;
        case "region":
          show.from.type = FROM_REGION;
          break;
        case "country":
          show.from.type = FROM_COUNTRY;
        }
        show.from.arg = id;
      }
    } else {
      id = classes[0].replace("sgc_", "");
      if (show.to.type === TO_CANADA) {
        show.to.type = TO_PT;
      }
      show.to.arg = id;
      document.getElementById("dest").value=id;
    }
    showData();
  },
  onSelect = function(e) {
    var id;
    switch(e.target.id){
    case "pob":
      id = e.target.value;
      if (id === allGeoId) {
        show.from.type = FROM_WORLD;
        show.from.arg = null;
      } else if (id === oceaniaId) {
        show.from.type = FROM_OCEANIA;
        show.from.arg = null;
      } else {
        if (countriesData.isContinent(id)) {
          show.from.type = FROM_CONTINENT;
        } else if (countriesData.isRegion(id)) {
          show.from.type = FROM_REGION;
        } else if (countriesData.isCountry(id)) {
          show.from.type = FROM_COUNTRY;
        } else {
          return false;
        }

        show.from.arg = id;
      }
      break;
    case "dest":
      id = e.target.value;

      if (id === canadaSgc) {
        show.to.type = TO_CANADA;
      } else {
        show.to.arg = id;
        show.to.type = sgc.sgc.isProvince(show.to.arg) ? TO_PT : TO_CMA;
      }

      break;
    case "status":
      immStatus = e.target.value;
      break;
    case "immperiod":
      return getImmigrationPeriod(parseInt(e.target.value, 10));
    }
    showData();
  },
  show = {
    from: {
      type: FROM_WORLD,
      arg: null
    },
    to: {
      type: TO_CANADA,
      arg: null
    }
  },
  immStatus = "total",
  birthplaceData = Array(immigrationPeriodCount),
  hoverTimeout = {},
  countriesData, sgcData, sgcFormatter, oldState;

i18n.load([sgcI18nRoot, countryI18nRoot, rootI18nRoot], function() {
  d3.queue()
    .defer(d3.json, sgcDataUrl)
    .defer(d3.json, countriesDataUrl)
    .await(function(error, sgcs, countries) {
      var createHover = function(svg) {
        var hoverText = svg.append("text")
          .attr("class", "hover")
          .attr("aria-hidden", "true");

        hoverText.append("tspan")
          .attr("dy", "1em")
          .attr("class", "hover_from");

        hoverText.append("tspan")
          .attr("x", 0)
          .attr("dy", "1.5em")
          .attr("class", "hover_value");
      };
      sgcData = sgcs.sgcs;
      sgcFormatter = sgc.getFormatter(sgcs, {province: false});
      countriesData = statcan_countries(countries);

      fromSettings = $.extend(true, {}, baseSettings, fromSettings);
      toSettings = $.extend(true, {}, baseSettings, toSettings);

      createHover(fromChart);
      createHover(toChart);

      getImmigrationPeriod(0);

      $(document).on("mouseover mouseout", ".birthplace svg path", onMouseOver);
      $(document).on("mouseout", ".birthplace svg .data", onMouseOut);
      $(document).on("mouseover", ".birthplace svg path", onMouseOverText);
      $(document).on("click", ".birthplace svg .arcs path", onClick);
      $(document).on("change", ".birthplace", onSelect);
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
