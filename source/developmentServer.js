import fs from "fs";
import http from "http";
import path from "path";

import { ApplicationPaths } from "./applicationPaths.js";
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
	#verbose;
	#webServerFolder;

	#browserLiveReloadClient;

	constructor({
		debounceDelay,
		enableLiveReload,
		ignoreGit,
		ignoreNodeModules,
		indexFile,
		mimeTypeMapFilePath,
		port,
		verbose,
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
		this.#verbose = verbose;
		this.#webServerFolder = webServerFolder;

		const browserLiveReloadClientCode = fs.readFileSync(`${ApplicationPaths.sourceDirectory}/browserLiveReloadClient.js`, { encoding: "utf8", flag: "r" });
		this.#browserLiveReloadClient = browserLiveReloadClientCode.replace("{{PORT}}", port);
	}

	#convertUrlToPath(requestUrl) {
		const parsedUrl = new URL(requestUrl, `http://localhost:${this.#port}`);
		const pathname = path.join(this.#webServerFolder, decodeURIComponent(parsedUrl.pathname));

		return (!path.extname(pathname) && fs.existsSync(pathname) && fs.statSync(pathname).isDirectory()) ?
			path.join(pathname, this.#indexFile) :
			pathname;
	}

	async #handleRequest(request, response) {
		try {
			const pathname = this.#convertUrlToPath(request.url);

			if (!request.url.endsWith("/") && fs.statSync(pathname).isDirectory()) {
				this.#sendResponse(request, response, 302, null, { Location: `${request.url}/` });

				return;
			}
			
			let fileContent = await fs.promises.readFile(pathname);

			if (this.#enableLiveReload === true && pathname.endsWith(this.#indexFile)) {
				const textContent = fileContent.toString("utf8") + `<script>${this.#browserLiveReloadClient}</script>`;

				fileContent = Buffer.from(textContent, "utf8");
			}

			const mimeType = this.#mimeTypeMap[path.extname(pathname)] || "application/octet-stream";
			
			this.#sendResponse(request, response, 200, fileContent, { "Content-Type": mimeType });
		}
		catch {
			this.#sendResponse(request, response, 404, "404 Not Found");
		}
	}

	#log(message) {
		if (this.#verbose === true) {
			console.info(`${createLoggingTimeStamp()}: ${message}`);
		}
		else {
			process.stdout.clearLine(0);
			process.stdout.cursorTo(0);
			process.stdout.write(`${message} at ${createLoggingTimeStamp()}`);
		}
	}

	#isIgnoredFileOrFolder(filePath) {
		return !filePath ||
			(this.#ignoreGit === true && filePath.includes(".git")) ||
			(this.#ignoreNodeModules === true && filePath.includes("node_modules")) ||
			filePath.endsWith(".DS_Store") ||
			filePath.endsWith(".tmp");
	}

	#sendResponse(request, response, status, content, headers = { "Content-Type": "text/plain" }) {
		if (this.#verbose === true) {
			this.#log(`➡️  ${request.method} | ${status} | ${request.url}`);
		}

		response.writeHead(status, headers);
		response.end(content);
	}

	#setupLiveReload(httpServer) {
		const socketServer = new WebSocketServer(httpServer);
		const fileDebounceTimers = new Map();
		let reloadTimerID = null;

		fs.watch(this.#webServerFolder, { recursive: true }, (_, filePath) => {
			if (this.#isIgnoredFileOrFolder(filePath)) {
				return;
			}

			clearTimeout(fileDebounceTimers.get(filePath));

			const fileTimerID = setTimeout(() => {
				fileDebounceTimers.delete(filePath);

				this.#log(`📁 Change detected in ${filePath}`);
			}, this.#debounceDelay);

			fileDebounceTimers.set(filePath, fileTimerID);

			clearTimeout(reloadTimerID);

			reloadTimerID = setTimeout(() => {
				socketServer.sendBroadcast("reload");

				this.#log(`♻️  Triggered browser reload`);
			}, this.#debounceDelay);
		});
	}

	start() {
		const httpServer = http.createServer((request, response) => this.#handleRequest(request, response));

		httpServer.listen(this.#port, () => {
			console.info(`🚀 Server running at http://localhost:${this.#port}/`);
			console.info(`📂 Serving files from: ${this.#webServerFolder}`);
			console.info(`🔄 Live Reload: ${this.#enableLiveReload} | ⏱️  Debounce delay: ${this.#debounceDelay}ms`);
			console.info(`👾 Ignore folders: .git: ${this.#ignoreGit}, node_modules: ${this.#ignoreNodeModules}`);

			if (this.#enableLiveReload === true) {
				this.#setupLiveReload(httpServer);
			}
		});
	}
}