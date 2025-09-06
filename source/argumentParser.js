import { resolve } from "path";
import { ApplicationPaths } from "./applicationPaths.js";

export class ArgumentParser {
	static parse(cliArguments) {
		const args = Object.fromEntries(
			cliArguments
				.slice(2)
				.map(
					(argument) => argument.split("=").map(decodeURIComponent)
				)
		);

		return {
			debounceDelay: Number.parseInt(args["--debouncedelay"], 10) || 200,
			enableLiveReload: "--livereload" in args,
			ignoreGit: "--ignore-git" in args,
			ignoreNodeModules: "--ignore-nodemodules" in args,
			indexFile: args["--index"] || "index.html",
			mimeTypeMapFilePath: args["--mimemap"] || resolve(ApplicationPaths.sourceDirectory, "defaultMimeTypeMap.json"),
			port: Number.parseInt(args["--port"], 10) || 8000,
			webServerFolder: args["--folder"] || process.cwd(),
		};
	}
}
