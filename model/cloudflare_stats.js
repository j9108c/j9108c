let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");
console.log(project_root);

const secrets = require(`${project_root}/_secrets.js`);

const axios = require("axios");

let now = null;
let from = null;
let to = null;

function set_dates(range) {
	now = new Date(); // UTC
	to = now.toISOString().slice(0, 10);
	if (range == "today") {
		from = new Date(now.setDate(now.getDate())).toISOString().slice(0, 10);
	} else if (range == "last7days") {
		from = new Date(now.setDate(now.getDate() - 7)).toISOString().slice(0, 10);
	} else if (range == "last30days") {
		from = new Date(now.setDate(now.getDate() - 30)).toISOString().slice(0, 10);
	}
}

const url = "https://api.cloudflare.com/client/v4/graphql";
let data = null;
const config = {
	headers: {
		Authorization: `bearer ${secrets.cloudflare_auth_token}`
	}
};

function get_requests_by_country(range) {
	return new Promise((resolve, reject) => {
		set_dates(range);

		data = {
			query: `
				query {
					viewer {
						zones(filter: {zoneTag: "${secrets.cloudflare_zone_id}"}) {
							httpRequests1dGroups(limit: 10000, filter: {date_geq: "${from}", date_leq: "${to}"}) {
								sum {
									countryMap {
										clientCountryName
										requests
									}
								}
							}
						}
					}
				}
			`
		};
	
		axios.post(url, data, config).then((response) => {
			if (response.data["data"]["viewer"]["zones"][0]["httpRequests1dGroups"].length == 0) { // no requests
				resolve([]);
			} else {
				resolve(response.data["data"]["viewer"]["zones"][0]["httpRequests1dGroups"][0]["sum"]["countryMap"].sort((a, b) => b.requests - a.requests)); // sort by number of requests, descending
			}
		}).catch((error) => console.error(error));
	});
}

let today_total = null;
let last7days_total = null;
let last30days_total = null;
let today_countries = null;
let last7days_countries = null;
let last30days_countries = null;

async function store_domain_request_info() {
	today_countries = await get_requests_by_country("today");
	last7days_countries = await get_requests_by_country("last7days");
	last30days_countries = await get_requests_by_country("last30days");

	return new Promise((resolve, reject) => {
		today_total = 0;
		last7days_total = 0;
		last30days_total = 0;
	
		today_countries.forEach((country) => today_total += country["requests"]);
		last7days_countries.forEach((country) => last7days_total += country["requests"]);
		last30days_countries.forEach((country) => last30days_total += country["requests"]);
	
		resolve();
	});
}

function get_domain_request_info() {
	return [
		today_total,
		last7days_total,
		last30days_total,
		today_countries,
		last7days_countries,
		last30days_countries
	];
}

module.exports.store_domain_request_info = store_domain_request_info;
module.exports.get_domain_request_info = get_domain_request_info;