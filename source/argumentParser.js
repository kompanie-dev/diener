import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

export class ArgumentParser {
	static parse(cliArguments) {
		const currentFileName = fileURLToPath(import.meta.url);
		const currentDirectory = dirname(currentFileName);

		const args = Object.fromEntries(
			cliArguments
				.slice(2)
				.map(
					(argument) => argument.split("=").map(decodeURIComponent)
				)
		);

		return {
			enableLiveReload: "--livereload" in args,
			indexFile: args["--index"] || "index.html",
			mimeTypeMapFilePath: args["--mimemap"] || resolve(currentDirectory, "defaultMimeTypeMap.json"),
			port: Number.parseInt(args["--port"], 10) || 8000,
			webServerFolder: args["--folder"] || process.cwd(),
		};
	}
}
