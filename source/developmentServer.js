import fs from "fs";
import http from "http";
import path from "path";
import { createLoggingTimeStamp } from "./createLoggingTimeStamp.js";
import { WebSocketServer } from "./webSocketServer.js";

export class DevelopmentServer {
	#enableLiveReload;
	#indexFile;
	#mimeTypeMap;
	#port;
	#webServerFolder;

	constructor({
		enableLiveReload,
		indexFile,
		mimeTypeMapFilePath,
		port,
		webServerFolder,
	}) {
		this.#enableLiveReload = enableLiveReload;
		this.#indexFile = indexFile;
		this.#mimeTypeMap = JSON.parse(
			fs.readFileSync(mimeTypeMapFilePath, "utf8"),
		);
		this.#port = port;
		this.#webServerFolder = webServerFolder;
	}

	#handleRequest(request, response) {
		const parsedUrl = new URL(request.url, `http://localhost:${this.#port}`);
		let pathname = path.join(this.#webServerFolder, decodeURIComponent(parsedUrl.pathname));

		if (!path.extname(pathname) && fs.existsSync(pathname) && fs.statSync(pathname).isDirectory()) {
			if (!request.url.endsWith("/")) {
				response.writeHead(302, { Location: `${request.url}/` });

				return response.end();
			}

			pathname = path.join(pathname, this.#indexFile);
		}

		if (!fs.existsSync(pathname)) {
			response.writeHead(404, { "Content-Type": "text/plain" });

			return response.end("404 Not Found");
		}

		fs.readFile(pathname, "utf8", (error, fileContent) => {
			if (error) {
				response.writeHead(500, { "Content-Type": "text/plain" });

				return response.end("500 Internal Server Error");
			}

			const fileExtension = path.extname(pathname);
			const mimeType = this.#mimeTypeMap[fileExtension] || "application/octet-stream";

			if (pathname.endsWith(this.#indexFile) && this.#enableLiveReload === true) {
				fileContent += this.#browserLiveReloadClient;
			}

			response.writeHead(200, { "Content-Type": mimeType });
			response.end(fileContent);
		});
	}

	get #browserLiveReloadClient() {
		return /*html*/ `
			<script>
				function connectLiveReloadServer() {
					const socket = new WebSocket("ws://localhost:${this.#port}");

					socket.onclose = () => {
						console.warn("Can't connect to livereload server. Attempting to reconnect...");
						setTimeout(connectLiveReloadServer, 3000);
					};

					socket.onerror = () => {
						socket.close();
					};

					socket.onmessage = () => {
						console.info("🔄 Change detected. Reloading...");
						location.reload();
					};

					socket.onopen = () => {
						console.info("✅ Connected to livereload server");
					};
				}

				connectLiveReloadServer();
			</script>`;
	}

	start() {
		const server = http.createServer((request, response) => this.#handleRequest(request, response));

		server.listen(this.#port, () => {
			console.info(
				`${createLoggingTimeStamp()}: 🚀 Server running at http://localhost:${this.#port}/`,
			);
			console.info(
				`${createLoggingTimeStamp()}: 📂 Serving files from: ${this.#webServerFolder}`,
			);

			if (this.#enableLiveReload === true) {
				const socketServer = new WebSocketServer(server);
				console.info(`${createLoggingTimeStamp()}: 🔄 Live Reload enabled`);

				fs.watch(this.#webServerFolder, { recursive: true }, () => {
					console.info(
						`${createLoggingTimeStamp()}: ♻️  Change detected, reloading browser...`,
					);

					socketServer.sendBroadcast("reload");
				});
			}
		});
	}
}
