/* global module:true */
(function() {
	var countries = function(data) {
		var props = {
				continent: {
					id: "contId"
				},
				region: {
					id: "rId"
				},
				country: {
					id: "cId"
				}
			},
			getGetFn = function(prop) {
				return function(id) {
					var index = this["_" + prop + "Index"].indexOf(id);
					return this[prop][index];
				};
			},
			getIsFn = function(prop) {
				return function(id) {
					return this["_" + prop + "Index"].indexOf(id) !== -1;
				};
			},
			indexGeo = function(obj, type) {
				obj.id = obj[props[type].id];
				obj.type = type;

				props[type].index.push(obj.id);

				return obj;
			},
			loopContinents = function() {
				var c, continent;
				for (c = 0; c < data.continents.length; c++) {
					continent = indexGeo(data.continents[c], "continent");
					if (continent.id !== "CONT_OC")
						continent.regions = [];
				}
			},
			loopRegions = function() {
				var r, region, regionContinent;
				for (r = 0; r < data.regions.length; r++) {
					region = indexGeo(data.regions[r], "region");

					regionContinent = data.continents[region.continent];

					region.continent = regionContinent;
					regionContinent.regions.push(region);
					region.countries = [];
				}
			},
			loopCountries = function() {
				var c, country, countryRegion, countryContinent;
				for (c = 0; c < data.countries.length; c++) {
					country = indexGeo(data.countries[c], "country");

					if (country.region !== undefined) {
						countryRegion = data.regions[country.region];
						country.region = countryRegion;

						if (countryRegion.countries === undefined)
							countryRegion.countries = [];

						countryRegion.countries.push(country);
					} else if (country.continent !== undefined) {
						countryContinent = data.continents[country.continent];
						country.continent = countryContinent;

						if (countryContinent.countries === undefined)
							countryContinent.countries = [];

						countryContinent.countries.push(country);
					}
				}
			};

		data.isContinent = getIsFn("continents");
		data.isRegion = getIsFn("regions");
		data.isCountry = getIsFn("countries");
		data.getContinent = getGetFn("continents");
		data.getRegion = getGetFn("regions");
		data.getCountry = getGetFn("countries");
		props.continent.index = data._continentsIndex = [];
		props.region.index = data._regionsIndex = [];
		props.country.index = data._countriesIndex = [];

		loopContinents();
		loopRegions();
		loopCountries();

		return data;
	};

	if (typeof module !== "undefined") {
		module.exports = countries;
	} else {
		this.statcan_countries = countries;
	}
})();
