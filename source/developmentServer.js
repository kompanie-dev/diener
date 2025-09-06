import fs from "fs";
import http from "http";
import path from "path";

import { ApplicationPaths } from "./applicationPaths.js";
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

	#browserLiveReloadClient;
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

		const browserLiveReloadClientCode = fs.readFileSync(`${ApplicationPaths.sourceDirectory}/browserLiveReloadClient.js`, { encoding: "utf8", flag: "r" });
		this.#browserLiveReloadClient = browserLiveReloadClientCode.replace("{{PORT}}", port);
		this.#mimeTypeMapper = new MimeTypeMapper(this.#mimeTypeMap);
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
				this.#sendResponse(response, 302, null, { Location: `${request.url}/` });
				return;
			}

			await fs.promises.access(pathname);

			const mimeType = this.#mimeTypeMapper.getMimeTypeByFileExtension(path.extname(pathname));
			const isTextFile = this.#mimeTypeMapper.isTextMimeType(mimeType);
			const encoding = isTextFile ? "utf8" : null;

			let fileContent = await fs.promises.readFile(pathname, encoding);

			if (isTextFile && pathname.endsWith(this.#indexFile) && this.#enableLiveReload === true) {
				fileContent += /*html*/ `<script>${ this.#browserLiveReloadClient }</script>`;
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
		const fileDebounceTimers = new Map();
		let reloadTimerID = null;

		fs.watch(this.#webServerFolder, { recursive: true }, (_, filePath) => {
			if (this.#isIgnoredFileOrFolder(filePath)) {
				return;
			}

			clearTimeout(fileDebounceTimers.get(filePath));

			const fileTimerID = setTimeout(() => {
				fileDebounceTimers.delete(filePath);

				console.info(`${createLoggingTimeStamp()}: 📁 Change detected in: ${filePath}`);
			}, this.#debounceDelay);

			fileDebounceTimers.set(filePath, fileTimerID);

			clearTimeout(reloadTimerID);

			reloadTimerID = setTimeout(() => {
				console.info(`${createLoggingTimeStamp()}: ♻️  Triggering browser reload...`);

				socketServer.sendBroadcast("reload");

				reloadTimerID = null;
			}, this.#debounceDelay);
		});
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