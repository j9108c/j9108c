let index = null;
const socket = io({ // triggers server's io.on connect
	path: `${index = document.getElementById("index").getAttribute("content")}/socket.io`
});

const dropdown_btn = document.getElementById("dropdown_btn");
const dropdown_menu = document.getElementById("dropdown_menu");
const last24hours_total_wrappers = document.getElementsByClassName("last24hours_total_wrapper");
const last7days_total_wrappers = document.getElementsByClassName("last7days_total_wrapper");
const last30days_total_wrappers = document.getElementsByClassName("last30days_total_wrapper");
const last24hours_list_wrapper = document.getElementById("last24hours_list_wrapper");
const last7days_list_wrapper = document.getElementById("last7days_list_wrapper");
const last30days_list_wrapper = document.getElementById("last30days_list_wrapper");
const countdown_wrappers = document.getElementsByClassName("countdown_wrapper");
const dropright_btn = document.getElementById("dropright_btn");
const dropright_menu = document.getElementById("dropright_menu");
const last24hours_table_body_wrapper = document.getElementById("last24hours_table_body_wrapper");
const last7days_table_body_wrapper = document.getElementById("last7days_table_body_wrapper");
const last30days_table_body_wrapper = document.getElementById("last30days_table_body_wrapper");
const terminal = document.getElementById("terminal");
const messages = document.getElementById("messages");

let light_mode = null;
if (document.cookie) {
	light_mode = document.cookie.split("; ").find((cookie) => cookie.startsWith("light_mode")).split("=")[1];
	(light_mode == "on" ? toggle_invert() : null);
}
if (window.location.pathname == "/") {
	const light_mode_btn = document.getElementById("light_mode_btn");
	light_mode_btn.addEventListener("click", (evt) => {
		toggle_invert();
		if (!document.cookie) {
			document.cookie = "light_mode=on";
			document.cookie = "max-age=1000*60*60*24*365*999";
		} else {
			if (light_mode == "on") {
				light_mode = "off";
				document.cookie = "light_mode=off";
			} else if (light_mode == "off") {
				light_mode = "on";
				document.cookie = "light_mode=on";
			}
		}
	});
}

document.addEventListener("keydown", (evt) => {
	if (evt.code == "Escape") {
		setTimeout(() => (!dropdown_menu.classList.contains("show") ? dropdown_btn.blur() : null), 100);
		setTimeout(() => (!dropright_menu.classList.contains("show") ? dropright_btn.blur() : null), 100);
	}
});

dropdown_btn.addEventListener("click", (evt) => {
	setTimeout(() => (!dropdown_menu.classList.contains("show") ? dropdown_btn.blur() : null), 100);

	setTimeout(() => {
		dropdown_menu.scrollIntoView({
			behavior: "smooth",
			block: "end"
		});
	}, 250);
});

dropright_btn.addEventListener("click", (evt) => setTimeout(() => (!dropright_menu.classList.contains("show") ? dropright_btn.blur() : null), 100));

socket.on("replace localhost with dev private ip", (dev_private_ip) => {
	const all_a_tags = document.getElementsByTagName("a");
	[...all_a_tags].forEach((a_tag) => a_tag.href = a_tag.href.replace("localhost", dev_private_ip));
});

socket.on("update countdown", (countdown) => [...countdown_wrappers].forEach((countdown_wrapper) => countdown_wrapper.innerHTML = countdown));

socket.on("update domain request info", (domain_request_info) => {
	[...last24hours_total_wrappers].forEach((last24hours_total_wrapper) => last24hours_total_wrapper.innerHTML = domain_request_info.last24hours_total);
	[...last7days_total_wrappers].forEach((last7days_total_wrapper) => last7days_total_wrapper.innerHTML = domain_request_info.last7days_total);
	[...last30days_total_wrappers].forEach((last30days_total_wrapper) => last30days_total_wrapper.innerHTML = domain_request_info.last30days_total);

	last24hours_list_wrapper.innerHTML = "";
	last7days_list_wrapper.innerHTML = "";
	last30days_list_wrapper.innerHTML = "";

	list_domain_request_info(domain_request_info.last24hours_countries, last24hours_list_wrapper);
	list_domain_request_info(domain_request_info.last7days_countries, last7days_list_wrapper);
	list_domain_request_info(domain_request_info.last30days_countries, last30days_list_wrapper);

	if (window.location.pathname == "/stats") {
		last24hours_table_body_wrapper.innerHTML = "";
		last7days_table_body_wrapper.innerHTML = "";
		last30days_table_body_wrapper.innerHTML = "";
	
		fill_stats_table(domain_request_info.last24hours_total, domain_request_info.last24hours_countries, last24hours_table_body_wrapper);
		fill_stats_table(domain_request_info.last7days_total, domain_request_info.last7days_countries, last7days_table_body_wrapper);
		fill_stats_table(domain_request_info.last30days_total, domain_request_info.last30days_countries, last30days_table_body_wrapper);
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

socket.on("clear terminal", () => messages.innerHTML = "<p id='gt_sign'>> <span id='blinking_caret'>|</span></p>");

function list_domain_request_info(countries_array, parent_ul) {
	let li = null;

	if (countries_array.length == 0) {
		return;
	} else if (countries_array.length <= 3) {
		countries_array.forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country.clientCountryName}: ${country.requests}`;
			parent_ul.appendChild(li);
		});
	} else {
		countries_array.slice(0, 3).forEach((country) => {
			li = document.createElement("li");
			li.classList.add("mt-n1");
			li.innerHTML = `${country.clientCountryName}: ${country.requests}`;
			parent_ul.appendChild(li);
		});

		li = document.createElement("li");
		li.classList.add("mt-n1");
		li.innerHTML = `${countries_array.length - 3} more`;
		parent_ul.appendChild(li);
	}
}

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
	const hour = (dt.getHours() > 12 ? ("0" + (dt.getHours()-12)).slice(-2) : ("0" + dt.getHours()).slice(-2));
	const minute = ("0" + dt.getMinutes()).slice(-2);
	const second = ("0" + dt.getSeconds()).slice(-2);

	const formatted_dt = `${day}-${month}-${year} ${hour}:${minute}:${second} ${period} ${tz_short}`;
	
	try {
		document.getElementById("datetime").innerHTML = `> info: ${formatted_dt}`;
	} catch {
		null;
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

function toggle_invert() {
	document.documentElement.classList.toggle("invert");
	document.body.classList.toggle("light_mode");
	dropdown_btn.classList.toggle("anti_invert");
	dropdown_menu.classList.toggle("anti_invert");
	dropdown_menu.classList.toggle("light_mode");
	dropright_btn.classList.toggle("anti_invert");
	dropright_menu.classList.toggle("anti_invert");
}
