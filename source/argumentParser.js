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
			enableLiveReload: "--livereload" in args,
			indexFile: args["--index"] || "index.html",
			mimeTypeMapFilePath: args["--mimemap"] || "./source/defaultMimeTypeMap.json",
			port: Number.parseInt(args["--port"], 10) || 8000,
			webServerFolder: args["--folder"] || process.cwd(),
		};
	}
}
