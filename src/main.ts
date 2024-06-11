import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import process, { exit } from 'node:process';
import { ZodError } from 'zod';
import { config } from './env.config.js';
import { TorrentClientManager } from './managers/torrent-client-manager.js';
import { createLogger } from './logger.js';
import { type TrenchConfig, configSchema } from './schemas/config.schemas.js';
import { TorrentTrenchManager } from './managers/torrent-trench-manager.js';

const logger = createLogger();

logger.info(`Starting Torrent Trench v${process.env.npm_package_version ?? process.env.CURRENT_VERSION}`);

let trenchConfig: TrenchConfig;

const configPath = join(config.TT_CONFIG_PATH, 'torrent-trench.json');
logger.debug('Attempting to read config json at ' + configPath);
const jsonString = readFileSync(configPath, 'utf8');

try {
	const data = JSON.parse(jsonString) as unknown;
	trenchConfig = configSchema.parse(data);
} catch (error) {
	if (error instanceof ZodError) {
		logger.debug('Failed to validate trench config: ' + JSON.stringify(error.issues, undefined, 2));
		logger.error(
			'Failed to validate trench config: ' +
				JSON.stringify(
					error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
					undefined,
					2,
				),
		);
		exit(1);
	}

	throw error;
}

logger.debug('Loaded trenches: ' + JSON.stringify(trenchConfig.trenches, undefined, 2));

const clientManager = new TorrentClientManager(trenchConfig.connections);
const trenchManager = new TorrentTrenchManager(trenchConfig, clientManager);

trenchManager.scheduleTrenches().catch((error) => {
	throw error; // eslint-disable-line @typescript-eslint/no-throw-literal
});
