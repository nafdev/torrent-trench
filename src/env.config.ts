import process from 'node:process';
import { cleanEnv, str } from 'envalid';

export const config = cleanEnv(process.env, {
	/* eslint-disable @typescript-eslint/naming-convention */

	NODE_ENV: str({
		choices: ['development', 'production'],
		default: 'development',
	}),

	TT_CONFIG_PATH: str({ devDefault: '.local', default: '/data' }),

	LOG_LEVEL: str({
		choices: ['warn', 'error', 'info', 'debug'],
		default: 'info',
		devDefault: 'debug',
	}),
	/* eslint-enable @typescript-eslint/naming-convention */
});
