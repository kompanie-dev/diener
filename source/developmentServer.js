import fs from "fs";
import http from "http";
import path from "path";
import { createLoggingTimeStamp } from "./createLoggingTimeStamp.js";
import { MimeTypeMapper } from "./mimeTypeMapper.js";
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

	#mimeTypeMapper;

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

		this.#mimeTypeMapper = new MimeTypeMapper(this.#mimeTypeMap);
	}

	#convertUrlToPath(requestUrl) {
		const parsedUrl = new URL(requestUrl, `http://localhost:${this.#port}`);
		let pathname = path.join(this.#webServerFolder, decodeURIComponent(parsedUrl.pathname));

		if (!path.extname(pathname) && fs.existsSync(pathname) && fs.statSync(pathname).isDirectory()) {
			return path.join(pathname, this.#indexFile);
		}

		return pathname;
	}

	async #handleRequest(request, response) {
		try {
			const pathname = this.#convertUrlToPath(request.url);

			if (!request.url.endsWith("/") && fs.statSync(pathname).isDirectory()) {
				return this.#sendResponse(response, 302, null, { Location: `${request.url}/` });
			}

			await fs.promises.access(pathname);

			const mimeType = this.#mimeTypeMapper.getMimeTypeByFileExtension(path.extname(pathname));
			const isTextFile = this.#mimeTypeMapper.isTextMimeType(mimeType);
			const encoding = isTextFile ? "utf8" : null;

			let fileContent = await fs.promises.readFile(pathname, encoding);

			if (isTextFile && pathname.endsWith(this.#indexFile) && this.#enableLiveReload === true) {
				fileContent += this.#browserLiveReloadClient;
			}

			this.#sendResponse(response, 200, fileContent, { "Content-Type": mimeType });
		}
		catch {
			this.#sendResponse(response, 404, "404 Not Found");
		}
	}

	#isIgnoredFileOrFolder(filePath) {
		return !filePath ||
			(this.#ignoreGit === true && filePath.includes(".git")) ||
			(this.#ignoreNodeModules === true && filePath.includes("node_modules")) ||
			filePath.endsWith(".DS_Store") ||
			filePath.endsWith(".tmp");
	}

	#sendResponse(response, status, content, headers = { "Content-Type": "text/plain" }) {
		response.writeHead(status, headers);
		response.end(content);
	}

	#setupLiveReload(server) {
		const socketServer = new WebSocketServer(server);
		const fileDebounceTimerMap = new Map();
		let globalReloadTimer = null;

		fs.watch(this.#webServerFolder, { recursive: true }, (_, filePath) => {
			if (this.#isIgnoredFileOrFolder(filePath)) {
				return;
			}

			if (fileDebounceTimerMap.has(filePath)) {
				clearTimeout(fileDebounceTimerMap.get(filePath));
			}

			const fileTimer = setTimeout(() => {
				fileDebounceTimerMap.delete(filePath);

				console.info(`${createLoggingTimeStamp()}: 📁 Change detected in: ${filePath}`);
			}, this.#debounceDelay);

			fileDebounceTimerMap.set(filePath, fileTimer);

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
				this.#setupLiveReload(server);
			}
		});
	}
}