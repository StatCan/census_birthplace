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
  settings = {
    getPointValue: function() {
      return this.dataPoint.total;
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
