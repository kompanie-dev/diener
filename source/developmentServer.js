import fs from "fs";
import http from "http";
import path from "path";
import { createLoggingTimeStamp } from "./createLoggingTimeStamp.js";
import { WebSocketServer } from "./webSocketServer.js";

export class DevelopmentServer {
	#debounceDelay;
	#enableLiveReload;
	#ignoreGit;
	#ignoreNodeModules;
	#indexFile;
	#mimeTypeMap;
	#port;
	#webServerFolder;

	constructor({
		debounceDelay,
		enableLiveReload,
		ignoreGit,
		ignoreNodeModules,
		indexFile,
		mimeTypeMapFilePath,
		port,
		webServerFolder,
	}) {
		this.#debounceDelay = debounceDelay;
		this.#enableLiveReload = enableLiveReload;
		this.#ignoreGit = ignoreGit;
		this.#ignoreNodeModules = ignoreNodeModules;
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

		const fileExtension = path.extname(pathname);
		const mimeType = this.#mimeTypeMap[fileExtension] || "application/octet-stream";

		const textMimeTypes = [
			"text/",
			"application/javascript",
			"application/json",
			"image/svg+xml",
			"application/xml"
		];

		const isTextFile = textMimeTypes.some(type => mimeType.startsWith(type));
		const encoding = isTextFile ? "utf8" : null;

		fs.readFile(pathname, encoding, (error, fileContent) => {
			if (error) {
				response.writeHead(500, { "Content-Type": "text/plain" });

				return response.end("500 Internal Server Error");
			}

			if (isTextFile && pathname.endsWith(this.#indexFile) && this.#enableLiveReload === true) {
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
			console.info(`🚀 Server running at http://localhost:${this.#port}/`);
			console.info(`📂 Serving files from: ${this.#webServerFolder}`);
			console.info(`🔄 Live Reload: ${this.#enableLiveReload} | ⏱️  Debounce delay: ${this.#debounceDelay}ms`);
			console.info(`👾 Ignore folders: .git: ${this.#ignoreGit}, node_modules: ${this.#ignoreNodeModules}`);

			if (this.#enableLiveReload === true) {
				const socketServer = new WebSocketServer(server);
				const debounceMap = new Map();
				let globalReloadTimer = null;

				fs.watch(this.#webServerFolder, { recursive: true }, (_, filePath) => {
					if (
						!filePath ||
						(this.#ignoreGit === true && filePath.includes(".git")) ||
						(this.#ignoreNodeModules === true && filePath.includes("node_modules"))
					) {
						return;
					}

					if (debounceMap.has(filePath)) {
						clearTimeout(debounceMap.get(filePath));
					}

					const fileTimer = setTimeout(() => {
						debounceMap.delete(filePath);
						console.info(`${createLoggingTimeStamp()}: 📁 Change detected in: ${filePath}`);
					}, this.#debounceDelay);

					debounceMap.set(filePath, fileTimer);

					if (globalReloadTimer !== null) {
						clearTimeout(globalReloadTimer);
					}

					globalReloadTimer = setTimeout(() => {
						console.info(`${createLoggingTimeStamp()}: ♻️  Triggering browser reload...`);
						socketServer.sendBroadcast("reload");
						globalReloadTimer = null;
					}, this.#debounceDelay);
				});
			}
		});
	}
}