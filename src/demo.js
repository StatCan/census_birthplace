const FROM_CONTINENTS = 1,
  FROM_REGION = 2,
  FROM_COUNTRY = 3,
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
  settings = {
    filterData: function(data) {
      var to = this.to.type,
        from = this.from.type;
      return data.filter(function(d) {
        var fromTrue = false,
          toTrue = false,
          toCanada = settings.to.getValue.call(settings, d) === canadaSgc,
          toProvince = sgc.sgc.isProvince(settings.to.getValue.call(settings, d)),
          fromId = settings.from.getValue.call(settings, d),
          fromRegion = countriesData.isRegion(fromId),
          fromCountry = countriesData.isCountry(fromId);
        if (
          (to === TO_CANADA && toCanada) ||
          (to === TO_PT && toProvince) ||
          (to === TO_CMA && !toCanada && !toProvince)
        )
          toTrue = true;


        if (
          (from === FROM_CONTINENTS) ||
          (from === FROM_REGION && (fromRegion || fromCountry)) ||
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
        return d.index;
      }
    },
    ribbons: {
      getClass: function(d) {
        return "sgc_" + d.target.index;
      }
    },
    startAngle: getAngleFn("startAngle"),
    endAngle: getAngleFn("endAngle"),
    getPointValue: function() {
      return this.dataPoint.total;
    },
    getMatrix: function(data) {
      var dataLength = data.length,
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
        m, matrix;

      loopData(function(d, to, from) {
        if (tos.indexOf(to) === -1)
          tos.push(to);

        if (froms.indexOf(from) === -1)
          froms.push(from);
      });

      indexes = indexes.concat(froms, tos);
      matrix = Array(indexes.length);
      for (m = 0; m < matrix.length; m++) {
        matrix[m] = Array(indexes.length).fill(0);
      }
      loopData(function(d, to, from) {
        matrix[indexes.indexOf(from)][indexes.indexOf(to)] = d;
      });
      return {
        indexes: indexes,
        matrix: matrix
      };
    }
  },
  processData = function(data) {
    var dataLength = data.mappings.length,
      pointsLength = data.dataPoints.length,
      i, d, p;

    for (i = 0; i < dataLength; i++) {
      d = data.mappings[i];
      d.valueOf = settings.getPointValue;
      for (p = 0; p < pointsLength; p ++) {
        if (d.dpId === data.dataPoints[p].id) {
          d.dataPoint = data.dataPoints[p];
        }
      }
    }

    return data;
  },
  showData = function() {
    settings.from.type = FROM_CONTINENTS;
    settings.to.type = TO_CANADA;
    chordChart(chart, settings);
  },
  countriesData, birthplaceData, sgcFormatter;

i18n.load([sgcI18nRoot, countryI18nRoot, rootI18nRoot], function() {
  d3.queue()
    .defer(d3.json, sgcDataUrl)
    .defer(d3.json, countriesDataUrl)
    .defer(d3.json, birthplaceDataUrl)
    .await(function(error, sgcs, countries, birthplace) {
      sgcFormatter = sgc.getFormatter(sgcs);
      countriesData = statcan_countries(countries);
      birthplaceData = processData(birthplace.pob);

      settings.data = birthplaceData.mappings;

      showData();
    });
});
