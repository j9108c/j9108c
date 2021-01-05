let config = null;
if (process.argv[0].slice(0, 13) == "/home/j9108c/") {
	config = "dev";
} else {
	config = "prod";
}
console.log(config);

let project_root = __dirname.split("/");
project_root.pop();
project_root = project_root.join("/");
console.log(project_root);

const secrets = require(`${project_root}/_secrets.js`);
const sql_operations = require(`${project_root}/model/sql_operations.js`);
const cloudflare_stats = require(`${project_root}/model/cloudflare_stats.js`);

const express = require("express");
const exp_hbs = require("express-handlebars");
const http = require("http");
const socket_io = require("socket.io");
const axios = require("axios");

sql_operations.set_client(config);
sql_operations.connect_to_db().then(() => sql_operations.init_db(config)).catch((error) => console.error(error));

let stats = null;
let stats_ready = false;
cloudflare_stats.store_domain_request_info().then(() => {
	stats = cloudflare_stats.get_domain_request_info();
	stats_ready = true;
}).catch((error) => console.error(error));

let countdown = 30;
setInterval(() => {
	io.emit("update_countdown", countdown-=1);
	if (countdown == 0) {
		countdown = 30;
		console.log("countdown reset");
	}
}, 1000);
setInterval(() => {
	cloudflare_stats.store_domain_request_info().then(() => {
		console.log("stored domain request info");
		stats = cloudflare_stats.get_domain_request_info();
		io.emit("update_domain_request_info", stats[0], stats[1], stats[2], stats[3], stats[4], stats[5]);
	}).catch((error) => console.error(error));
}, 30000); // 30s

const app = express();
const server = http.createServer(app);
const io = socket_io(server);
app.use(express.static(`${project_root}/view`));
app.set("views", `${project_root}/view/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", exp_hbs({
	layoutsDir: `${project_root}/view/html`,
	defaultLayout: "template.handlebars"
}));

app.get(["/"], (req, res) => {
	res.render("index.handlebars", {
		title: "dev portfolio — j9108c",
		description: "dev portfolio"
	});
});

app.get("/apps", (req, res) => {
	res.render("apps.handlebars", {
		title: "apps — j9108c",
		description: "apps"
	});
});

app.get("/stats", (req, res) => {
	res.render("stats.handlebars", {
		title: "stats — j9108c",
		description: "stats"
	});
});

io.on("connect", (socket) => {
	io.to(socket.id).emit("update_countdown", countdown);
	// if (stats_ready) {
	// 	io.to(socket.id).emit("update_domain_request_info", stats[0], stats[1], stats[2], stats[3], stats[4], stats[5]);
	// } else {
	// 	setTimeout(() => io.to(socket.id).emit("update_domain_request_info", stats[0], stats[1], stats[2], stats[3], stats[4], stats[5]), 5000);
	// }

	if (socket.request["headers"]["user-agent"] == "node-XMLHttpRequest") { // other localhost node server connected as client
		console.log(`other localhost node server (${socket.request["headers"]["app"]}) connected as client`);
	} else {
		console.log(`socket connected: ${socket.id}`);

		sql_operations.add_visit();

		switch (socket.request["headers"]["referer"].split(socket.request["headers"]["host"]).pop()) {
			case "/":
				let ip = null;
				if (config == "dev") {
					ip = secrets.ip_address;
				} else if (config == "prod") {
					if ("x-forwarded-for" in socket.request["headers"]) {
						ip = socket.handshake["headers"]["x-forwarded-for"];
					} else {
						((socket.handshake.address.slice(0, 7) == "::ffff:") ? ip = socket.handshake.address.split(":").pop() : ip = socket.handshake.address);
					}
				}
				console.log(ip);
			
				axios.get(`http://ip-api.com/json/${ip}?fields=status,city,timezone`).then((response) => {
					const city = response.data["city"].toLowerCase();
					console.log(city);
					const timezone = response.data["timezone"];
					console.log(timezone);
		
					setTimeout(() => {
						io.to(socket.id).emit("message", `greetings, ${ip} @ ${city} !`);
					}, 2000);
		
					setTimeout(() => {
						io.to(socket.id).emit("message", "welcome to my dev portfolio !");
					}, 2500);
		
					setTimeout(() => {
						io.to(socket.id).emit("datetime", timezone);
					}, 3000);
				}).catch((error) => console.error(error));
				break;
			case "/apps":
	
				break;
			case "/stats":
	
				break;
			default:
				break;
		}
	}
});

// port and listen
const port = process.env.PORT || 1025;
server.listen(port, () => console.log(`server started on localhost:${port}`));
