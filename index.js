#!/usr/bin/env node

import { ArgumentParser } from "./source/argumentParser.js";
import { ConfigurationValidator } from "./source/configurationValidator.js";
import { createLoggingTimeStamp } from "./source/createLoggingTimeStamp.js";
import { DevelopmentServer } from "./source/developmentServer.js";

console.info(`🤵 Diener ${process.env.npm_package_version} launched ${createLoggingTimeStamp()}`);

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
