const project_root = process.cwd();
const run_config = (project_root.toLowerCase().slice(0, 20) == "/mnt/c/users/j9108c/" ? "dev" : "prod");
console.log(`${run_config}: ${project_root}`);

const secrets = (run_config == "dev" ? require(`${project_root}/_secrets.js`).dev : require(`${project_root}/_secrets.js`).prod);
const sql_operations = require(`${project_root}/model/sql_operations.js`);
const cloudflare_stats = require(`${project_root}/model/cloudflare_stats.js`);

const express = require("express");
const express_hbs = require("express-handlebars");
const http = require("http");
const socket_io = require("socket.io");
const axios = require("axios");

sql_operations.connect_to_db().then(() => sql_operations.init_db()).catch((err) => console.error(err));
process.nextTick(() => cloudflare_stats.update(io).then(() => {
	cloudflare_stats.cycle_update(io);
	cloudflare_stats.cycle_countdown(io);
}).catch((err) => console.error(err)));

const app_name = "j9108c";
const app_index = ""; // index of this server relative to domain

const app = express();
const server = http.createServer(app);
const io = socket_io(server, {
	path: `${app_index}/socket.io`
});

app.use(`${app_index}/static`, express.static(`${project_root}/static`));
app.set("views", `${project_root}/static/html`);
app.set("view engine", "handlebars");
app.engine("handlebars", express_hbs({
	layoutsDir: `${project_root}/static/html`,
	defaultLayout: "template.handlebars"
}));

app.get(app_index, (req, res) => {
	res.render("index.handlebars", {
		title: "dev portfolio — j9108c",
		description: "dev portfolio"
	});
});

app.get(`${app_index}/apps`, (req, res) => {
	res.render("apps.handlebars", {
		title: "apps — j9108c",
		description: "apps"
	});
});

app.get(`${app_index}/stats`, (req, res) => {
	res.render("stats.handlebars", {
		title: "stats — j9108c",
		description: "stats"
	});
});

io.on("connect", async (socket) => {
	if (Object.keys(cloudflare_stats.domain_request_info).length != 0) {
		io.to(socket.id).emit("update domain request info", cloudflare_stats.domain_request_info);
	} else {
		setTimeout(() => (Object.keys(cloudflare_stats.domain_request_info).length != 0 ? io.to(socket.id).emit("update domain request info", cloudflare_stats.domain_request_info) : null), 5000);
	}

	const headers = socket.handshake.headers;
	// console.log(headers);
	if (headers["user-agent"] == "node-XMLHttpRequest") { // other localhost node server connected as client
		console.log(`other localhost server (${headers.app}) connected as client`);

		io.to(socket.id).emit("store hosts", hosts);

		io.to(socket.id).emit("store dev private ip", secrets.dev_private_ip);
	} else {
		console.log(`socket (${socket.id}) connected`);

		const socket_address = headers.host.split(":")[0];
		(socket_address == secrets.dev_private_ip ? io.to(socket.id).emit("replace localhost with dev private ip", secrets.dev_private_ip) : null);

		sql_operations.add_visit().catch((err) => console.error(err));

		const urlpath = headers.referer.split(headers.host).pop();
		// console.log(urlpath);
		if (urlpath.startsWith("/apps")) {
			null;
		} else if (urlpath.startsWith("/stats")) {
			null;
		} else { // index
			io.to(socket.id).emit("clear terminal");

			let ip = null;
			if (run_config == "dev") {
				ip = secrets.dev_public_ip;
			} else if (run_config == "prod") {
				if ("x-forwarded-for" in headers) { // from nginx reverse proxy
					ip = headers["x-forwarded-for"].split(", ")[0];
				} else {
					ip = (socket.handshake.address.slice(0, 7) == "::ffff:" ? socket.handshake.address.split(":").pop() : socket.handshake.address);
				}
			}
			// console.log(ip);

			try {
				const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,city,timezone`);

				const city = response.data.city.toLowerCase();
				// console.log(city);
				const timezone = response.data.timezone;
				// console.log(timezone);

				setTimeout(() => io.to(socket.id).emit("message", `greetings, ${ip} @ ${city} !`), 2000);

				setTimeout(() => io.to(socket.id).emit("message", "welcome to my dev portfolio !"), 2500);

				setTimeout(() => io.to(socket.id).emit("datetime", timezone), 3000);
			} catch (err) {
				console.error(err);
			}
		}
	}
});

// set hosts var for dynamic html hrefs wrt launch run_config
let hosts = null;
if (run_config == "dev") {
	hosts = {
		1025: "http://localhost:1025",
		2000: "http://localhost:2000",
		3000: "http://localhost:3000"
	};
} else if (run_config == "prod") {
	hosts = {
		// http on purpose, for testing before ssl. after ssl, auto redirects to https
		1025: "http://j9108c.com",
		2000: "http://j9108c.com",
		3000: "http://j9108c.com"
	};
}

// set app local vars (auto passed as data to all hbs renders)
app.locals.hosts = hosts;
app.locals.app_index = app_index;
app.locals.repo = `https://github.com/j9108c/${app_name}`;
app.locals.current_year = new Date().getFullYear();

// port and listen
const port = process.env.PORT || 1025;
server.listen(port, () => console.log(`server (${app_name}) started on (localhost:${port})`));
