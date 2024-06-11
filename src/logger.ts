import process from 'node:process';
import { Chalk } from 'chalk';
import { config } from './env.config.js';

const chalk = new Chalk();

enum LogLevel {
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error',
	DEBUG = 'debug',
}

function getAppLogLevel() {
	switch (config.LOG_LEVEL) {
		case 'error': {
			return 1;
		}

		case 'warn': {
			return 2;
		}

		case 'info': {
			return 3;
		}

		case 'debug': {
			return 4;
		}
	}
}

function error(message: string, context?: string) {
	if (getAppLogLevel() >= 1) {
		print(message, LogLevel.ERROR, context);
	}
}

function warn(message: string, context?: string) {
	if (getAppLogLevel() >= 2) {
		print(message, LogLevel.WARN, context);
	}
}

function info(message: string, context?: string) {
	if (getAppLogLevel() >= 3) {
		print(message, LogLevel.INFO, context);
	}
}

function debug(message: string, context?: string) {
	if (getAppLogLevel() >= 4) {
		print(message, LogLevel.DEBUG, context);
	}
}

function print(logString: string, level: LogLevel, context?: string) {
	const segments: string[] = [];
	segments.push(new Date().toISOString());

	let logLevel = '';
	switch (level) {
		case LogLevel.INFO: {
			logLevel = chalk.cyan(LogLevel.INFO);
			break;
		}

		case LogLevel.DEBUG: {
			logLevel = chalk.white(LogLevel.DEBUG);
			break;
		}

		case LogLevel.ERROR: {
			logLevel = chalk.red(LogLevel.ERROR);
			break;
		}

		case LogLevel.WARN: {
			logLevel = chalk.yellow(LogLevel.WARN);
			break;
		}
	}

	segments.push(logLevel);

	if (context) {
		segments.push('[' + chalk.magenta(context) + ']');
	}

	segments.push(logString);

	console.log(segments.join(' '));
}

export function createLogger(context?: string) {
	return {
		info(message: string, ...variables: unknown[]) {
			info(chalkVariables(message, ...variables), context);
		},
		warn(message: string, ...variables: unknown[]) {
			warn(chalkVariables(message, ...variables), context);
		},
		printError(exception: Error, message: string, ...variables: unknown[]) {
			error(`${chalkVariables(message, ...variables)}\n${exception.message}:\n${exception.stack}`, context);
		},
		error(messageOrObject: string | any) {
			if (typeof messageOrObject === 'string') {
				error(messageOrObject, context);
				return;
			}

			error(JSON.stringify(messageOrObject), context);
		},
		debug(message: string, ...variables: unknown[]) {
			debug(chalkVariables(message, ...variables), context);
		},
	};
}

export function chalkVariables(message: string, ...variables: any[]) {
	let result = message;
	for (const variable of variables) {
		result = result.replace('{}', chalk.blueBright(variable));
	}

	return result;
}

const exceptionLogger = createLogger();

process.on('uncaughtException', (error) => {
	exceptionLogger.error([error.message, error.stack].join('\n'));
	process.exit(1);
});
