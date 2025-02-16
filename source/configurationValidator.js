import fs from "fs";
import { createLoggingTimeStamp } from "./createLoggingTimeStamp.js";

export class ConfigurationValidator {
	static validate(serverConfiguration) {
		const errorsMessages = [];

		if (Number.isNaN(serverConfiguration.port) === true) {
			errorsMessages.push(
				`${createLoggingTimeStamp()}: 🛑 --port is not a number: ${serverConfiguration.port}`
			);
		}

		if (!fs.existsSync(serverConfiguration.webServerFolder)) {
			errorsMessages.push(
				`${createLoggingTimeStamp()}: 🛑 --folder does not exist: ${serverConfiguration.webServerFolder}`
			);
		}

		if (!fs.existsSync(serverConfiguration.mimeTypeMapFilePath)) {
			errorsMessages.push(
				`${createLoggingTimeStamp()}: 🛑 --mimemap file does not exist: ${serverConfiguration.mimeTypeMapFilePath}`
			);
		}

		return errorsMessages;
	}
}
