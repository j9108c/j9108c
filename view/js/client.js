let index = null;
const socket = io({path: `${index = document.getElementById("index").getAttribute("content")}/socket.io`}); // triggers controller's io.on connect

const terminal = document.getElementById("terminal");
const messages = document.getElementById("messages");
const dropdown_button = document.getElementById("dropdown_button");
const dropdown_menu = document.getElementById("dropdown_menu");
const today_total_wrappers = document.getElementsByClassName("today_total_wrapper");
const last7days_total_wrappers = document.getElementsByClassName("last7days_total_wrapper");
const last30days_total_wrappers = document.getElementsByClassName("last30days_total_wrapper");
const today_list_wrapper = document.getElementById("today_list_wrapper");
const last7days_list_wrapper = document.getElementById("last7days_list_wrapper");
const last30days_list_wrapper = document.getElementById("last30days_list_wrapper");
const countdown_wrappers = document.getElementsByClassName("countdown_wrapper");
const today_table_body_wrapper = document.getElementById("today_table_body_wrapper");
const last7days_table_body_wrapper = document.getElementById("last7days_table_body_wrapper");
const last30days_table_body_wrapper = document.getElementById("last30days_table_body_wrapper");

dropdown_button.addEventListener("click", (event) => {
	setTimeout(() => dropdown_menu.scrollIntoView({behavior: "smooth"}), 250);
});

socket.on("check_dev_mobile", (socket_address, dev_private_ip) => {
	if (socket_address == dev_private_ip) { // dev mobile
		const all_a_tags = document.getElementsByTagName("a");

		[...all_a_tags].forEach((a_tag) => a_tag.href = a_tag.href.replace("localhost", dev_private_ip));
	}
});

socket.on("message", (message) => {
	remove_blinking_caret();
	output_message(message);
	add_blinking_caret();

	terminal.scrollTop = terminal.scrollHeight; // scroll down
});

socket.on("datetime", (timezone) => {
	remove_blinking_caret();

	const p = document.createElement("p");
	p.id = "datetime";
	p.classList.add("message");
	p.classList.add("mb-1");
	p.innerHTML = ">";
	messages.appendChild(p);
	update_datetime(timezone);
	setInterval(() => update_datetime(timezone), 1000);

	add_blinking_caret();
});

socket.on("update_domain_request_info", (today_total, last7days_total, last30days_total, today_countries, last7days_countries, last30days_countries) => {
	[...today_total_wrappers].forEach((today_total_wrapper) => today_total_wrapper.innerHTML = today_total);
	[...last7days_total_wrappers].forEach((last7days_total_wrapper) => last7days_total_wrapper.innerHTML = last7days_total);
	[...last30days_total_wrappers].forEach((last30days_total_wrapper) => last30days_total_wrapper.innerHTML = last30days_total);

	today_list_wrapper.innerHTML= "";
	last7days_list_wrapper.innerHTML= "";
	last30days_list_wrapper.innerHTML = "";

	list_domain_request_info(today_countries, today_list_wrapper);
	list_domain_request_info(last7days_countries, last7days_list_wrapper);
	list_domain_request_info(last30days_countries, last30days_list_wrapper);

	if (window.location.pathname == "/stats") {
		today_table_body_wrapper.innerHTML = "";
		last7days_table_body_wrapper.innerHTML = "";
		last30days_table_body_wrapper.innerHTML = "";
	
		fill_stats_table(today_total, today_countries, today_table_body_wrapper);
		fill_stats_table(last7days_total, last7days_countries, last7days_table_body_wrapper);
		fill_stats_table(last30days_total, last30days_countries, last30days_table_body_wrapper);
	}
});

socket.on("update_countdown", (countdown) => {
	[...countdown_wrappers].forEach((countdown_wrapper) => countdown_wrapper.innerHTML = countdown);
});

function output_message(message) {
	const p = document.createElement("p");
	p.classList.add("message");
	p.classList.add("mb-1");
	p.innerHTML = `> ${message}`;
	messages.appendChild(p);
}

function remove_blinking_caret() {
	messages.removeChild(document.getElementById("gt_sign"));
}

function add_blinking_caret() {
	const p = document.createElement("p");
	p.id = "gt_sign";
	p.classList.add("mb-1");
	p.innerHTML = "> <span id='blinking_caret'>|</span>";
	messages.appendChild(p);
}

function update_datetime(timezone) {
	const dt_string = new Date().toLocaleString("en-US", {
		timeZone: timezone,
		timeZoneName: "short"
	});
	const period = dt_string.split(" ")[2];
	const tz_short = dt_string.split(" ")[3];

	const dt = new Date(dt_string);
	const day = ("0" + dt.getDate()).slice(-2);
	const month = ("0" + (dt.getMonth()+1)).slice(-2);
	const year = dt.getFullYear();
	const hour = ("0" + dt.getHours()).slice(-2);
	const minute = ("0" + dt.getMinutes()).slice(-2);
	const second = ("0" + dt.getSeconds()).slice(-2);

	const formatted_dt = `${day}-${month}-${year} ${hour}:${minute}:${second} ${period} ${tz_short}`;
	
	document.getElementById("datetime").innerHTML = `> info: ${formatted_dt}`;
}

function list_domain_request_info(countries_array, parent_ul) {
	let li = null;

	if (countries_array.length == 0) {
		return;
	} else if (countries_array.length <= 3) {
		countries_array.forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country["clientCountryName"]}: ${country["requests"]}`;
			parent_ul.appendChild(li);
		});
	} else {
		countries_array.slice(0, 3).forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country["clientCountryName"]}: ${country["requests"]}`;
			parent_ul.appendChild(li);
		});

		li = document.createElement("li");
		li.classList.add("mt-n1");
		li.innerHTML = `${countries_array.length - 3} more`;
		parent_ul.appendChild(li);
	}
}

function fill_stats_table(requests_total, countries_array, parent_tbody) {
	let tr = null;
	let td_country = null;
	let td_num = null;
	let td_requests = null;
	let num = 0;

	countries_array.forEach((country) => {
		tr = document.createElement("tr");

		td_country = document.createElement("td");
		td_country.innerHTML = country["clientCountryName"];
		tr.appendChild(td_country);

		td_num = document.createElement("td");
		td_num.innerHTML = num+=1;
		tr.appendChild(td_num);

		td_requests = document.createElement("td");
		td_requests.innerHTML = country["requests"];
		tr.appendChild(td_requests);

		parent_tbody.appendChild(tr);
	});

	tr = document.createElement("tr");

	td_country = document.createElement("td");
	td_country.innerHTML = "TOTAL";
	tr.appendChild(td_country);

	td_num = document.createElement("td");
	td_num.innerHTML = num;
	tr.appendChild(td_num);

	td_requests = document.createElement("td");
	td_requests.innerHTML = requests_total;
	tr.appendChild(td_requests);

	parent_tbody.appendChild(tr);
}
