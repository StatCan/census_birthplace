var sgcI18nRoot = "lib/statcan_sgc/i18n/sgc/",
  rootI18nRoot = "src/i18n/",
  countryI18nRoot = "lib/statcan_countries/i18n/",
  sgcDataUrl = "lib/statcan_sgc/sgc.json",
  birthplaceDataUrl = "data/census_birthplace.json",
  container = d3.select(".birthplace .data"),
  chart = container.append("svg")
    .attr("id", "canada_birthplace"),
  rootI18nNs = "census_birthplace",
  settings = {

  },
  showData = function() {
    chordChart(chart, settings);
  },
  sgcData, birthplaceData;

i18n.load([sgcI18nRoot, countryI18nRoot, rootI18nRoot], function() {
  d3.queue()
    .defer(d3.json, sgcDataUrl)
    .defer(d3.json, birthplaceDataUrl)
    .await(function(error, sgcs, birthplace) {
      sgcData = sgcs;
      birthplaceData = birthplace;

      showData();
    });
});
