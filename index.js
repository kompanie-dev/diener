#!/usr/bin/env node

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ArgumentParser } from "./source/argumentParser.js";
import { ConfigurationValidator } from "./source/configurationValidator.js";
import { createLoggingTimeStamp } from "./source/createLoggingTimeStamp.js";
import { DevelopmentServer } from "./source/developmentServer.js";

const currentFileName = fileURLToPath(import.meta.url);
const currentDirectory = dirname(currentFileName);
const packageJsonPath = join(currentDirectory, "./package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

console.info(`🤵 Diener ${packageJson.version} launched ${createLoggingTimeStamp()}`);

const serverConfiguration = ArgumentParser.parse(process.argv);

const errors = ConfigurationValidator.validate(serverConfiguration);

if (errors.length !== 0) {
	errors.forEach((errorMessage) => {
		console.error(errorMessage);
	});

	process.exit(1);
}

const developmentServer = new DevelopmentServer(serverConfiguration);
developmentServer.start();
