let config = null;
((process.argv[0].slice(0, 13) == "/home/j9108c/") ? config = "dev" : config = "prod");
console.log(config);

let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");
console.log(project_root);

const secrets = require(`${project_root}/_secrets.js`);
const sql_operations = require(`${project_root}/model/sql_operations.js`);
const cloudflare_stats = require(`${project_root}/model/cloudflare_stats.js`);

const express = require("express");
const express_hbs = require("express-handlebars");
const http = require("http");
const socket_io = require("socket.io");
const axios = require("axios");

sql_operations.set_client(config);
sql_operations.connect_to_db().then(() => sql_operations.init_db(config)).catch((err) => console.error(err));

let stats = null;
cloudflare_stats.store_domain_request_info().then(() => stats = cloudflare_stats.get_domain_request_info()).catch((err) => console.error(err));

let countdown = 30;
setInterval(() => {
	io.emit("update countdown", countdown-=1);
	if (countdown == 0) {
		countdown = 30;
		// console.log("countdown reset");
	}
}, 1000);
setInterval(async () => {
	try {
		await cloudflare_stats.store_domain_request_info();
		stats = cloudflare_stats.get_domain_request_info();
		io.emit("update domain request info", stats);
	} catch (err) {
		console.error(err);
	}
}, 30000); // 30s

const index = ""; // index of this server relative to domain. use as project root for non-html static file links in hbs html

const app = express();
const server = http.createServer(app);
const io = socket_io(server, {path: `${index}/socket.io`});
app.use(`${index}/view`, express.static(`${project_root}/view`));
app.set("views", `${project_root}/view/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", express_hbs({
	layoutsDir: `${project_root}/view/html`,
	defaultLayout: "template.handlebars"
}));

app.get(index, (req, res) => {
	res.render("index.handlebars", {
		title: "dev portfolio — j9108c",
		description: "dev portfolio"
	});
});

app.get(`${index}/apps`, (req, res) => {
	res.render("apps.handlebars", {
		title: "apps — j9108c",
		description: "apps"
	});
});

app.get(`${index}/stats`, (req, res) => {
	res.render("stats.handlebars", {
		title: "stats — j9108c",
		description: "stats"
	});
});

io.on("connect", async (socket) => {
	io.to(socket.id).emit("update countdown", countdown);
	if (stats != null) {
		io.to(socket.id).emit("update domain request info", stats);
	} else {
		setTimeout(() => ((stats != null) ? io.to(socket.id).emit("update domain request info", stats) : null), 5000);
	}

	const headers = socket.handshake["headers"];
	if (headers["user-agent"] == "node-XMLHttpRequest") { // other localhost node server connected as client
		console.log(`other localhost server (${headers["app"]}) connected as client`);

		io.to(socket.id).emit("store hosts", hosts);

		io.to(socket.id).emit("store dev private ip", secrets.dev_private_ip);
	} else {
		console.log(`socket "${socket.id}" connected`);

		const socket_address = headers["host"].split(":")[0];
		((socket_address == secrets.dev_private_ip) ? io.to(socket.id).emit("replace localhost with dev private ip", secrets.dev_private_ip) : null);

		try {
			sql_operations.add_visit();
		} catch (err) {
			console.error(err);
		}

		const urlpath = headers["referer"].split(headers["host"]).pop();
		// console.log(urlpath);
		// conditional based on urlpath (i.e., everything in the url after the domain) prefixes rather than exact urlpath. this is to account for sites adding their own queries to the url, like fb does with their "?fbclid"
		if (urlpath.startsWith("/apps")) {
			null;
		} else if (urlpath.startsWith("/stats")) {
			null;
		} else { // index
			io.to(socket.id).emit("clear terminal");

			let ip = null;
			if (config == "dev") {
				ip = secrets.dev_public_ip;
			} else if (config == "prod") {
				if ("x-forwarded-for" in headers) { // from nginx reverse proxy
					ip = headers["x-forwarded-for"].split(", ")[0];
				} else {
					ip = ((socket.handshake.address.slice(0, 7) == "::ffff:") ? socket.handshake.address.split(":").pop() : socket.handshake.address);
				}
			}
			// console.log(ip);

			try {
				const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,city,timezone`);

				const city = response.data["city"].toLowerCase();
				// console.log(city);
				const timezone = response.data["timezone"];
				// console.log(timezone);

				setTimeout(() => {
					io.to(socket.id).emit("message", `greetings, ${ip} @ ${city} !`);
				}, 2000);

				setTimeout(() => {
					io.to(socket.id).emit("message", "welcome to my dev portfolio !");
				}, 2500);

				setTimeout(() => {
					io.to(socket.id).emit("datetime", timezone);
				}, 3000);
			} catch (err) {
				console.error(err);
			}
		}
	}
});

// set hosts var for dynamic html hrefs wrt launch config
let hosts = null;
if (config == "dev") {
	hosts = {
		1025: "http://localhost:1025",
		2000: "http://localhost:2000",
		3000: "http://localhost:3000"
	};
} else if (config == "prod") {
	hosts = {
		// http on purpose, for testing before ssl. after ssl, auto redirects to https
		1025: "http://j9108c.com",
		2000: "http://j9108c.com",
		3000: "http://j9108c.com"
	};
}

// set app local vars (auto passed as data to all hbs renders)
app.locals.hosts = hosts;
app.locals.index = index;
app.locals.repo = "https://github.com/j9108c/j9108c";

// port and listen
const port = process.env.PORT || 1025;
server.listen(port, () => console.log(`(j9108c) server started on localhost:${port}`));
