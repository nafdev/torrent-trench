import { CronJob } from 'cron';
import cronstrue from 'cronstrue';
import { type TrenchConfig, type Trench } from '../schemas/config.schemas.js';
import { type NormalizedTorrent } from '../types.js';
import { type StringConditionsFilter, type TrenchFilter } from '../schemas/filter.schemas.js';
import { chalkVariables, createLogger } from '../logger.js';
import { type TrenchAction } from '../schemas/action.schemas.js';
import { type TorrentClientManager, type TorrentClient } from './torrent-client-manager.js';

export class TorrentTrenchManager {
	private readonly logger = createLogger(TorrentTrenchManager.name);

	constructor(
		private readonly trenchConfig: TrenchConfig,
		private readonly clientManager: TorrentClientManager,
	) {}

	async scheduleTrenches() {
		await this.clientManager.testClientConnections();

		const clients = this.clientManager.getClients();

		const run = async (trench: Trench) => {
			let clientData;
			try {
				this.logger.debug(`Fetching torrent data for trench {}`, trench.name);

				clientData = await Promise.all(
					clients.map(async (client) => {
						const data = await client.getAllData();
						return { data, client };
					}),
				);
			} catch (error) {
				if (error instanceof Error) {
					this.logger.printError(error, 'Error while fetching torrent data');
				} else {
					this.logger.error(error);
				}

				return;
			}

			for (const { client, data } of clientData) {
				for (const torrent of data.torrents) {
					this.runTrench(trench, torrent, client).catch((error) => {
						if (error instanceof Error) {
							this.logger.printError(
								error,
								chalkVariables(`Uncaught error running trench {} on client {}`, trench.name, client.config.baseUrl),
							);
						} else {
							this.logger.error(error);
						}

						trench.enabled = false;
						this.logger.warn(`Trench {} has been disabled due to a previous error`, trench.name);
					});
				}
			}
		};

		for (const trench of this.trenchConfig.trenches) {
			if (!trench.enabled) {
				continue;
			}

			this.logger.info(`Scheduling trench {} to run {}`, trench.name, cronstrue.toString(trench.schedule));

			CronJob.from({
				cronTime: trench.schedule,
				onTick() {
					void run(trench);
				},
				start: true,
			});
		}
	}

	private async runTrench(trench: Trench, torrent: NormalizedTorrent, client: TorrentClient, isFork = false) {
		const trenchLogger = createLogger(
			chalkVariables(`Trench {}${isFork ? ' (fork) ' : ' '}on {}`, trench.name, client.config.baseUrl),
		);

		trenchLogger.debug(`Starting trench`);

		if (!isFork && !trench.enabled) {
			trenchLogger.debug(`Trench is disabled and will not run`);
			return;
		}

		/* eslint-disable no-await-in-loop */
		for (const step of trench.trench) {
			if (step.type === 'filter') {
				try {
					this.filter(step, torrent, trenchLogger);
				} catch (error) {
					if (error instanceof TrenchSkippedByFilterException) {
						trenchLogger.debug(`Skipped trench: ` + error.message + ` - ${torrent.name}`);
					}

					return;
				}
			}

			if (step.type === 'action') {
				trenchLogger.info(`Running action {} on torrent {}`, step.action, torrent.name);
				await this.action(step, torrent, client);
			}

			if (step.type === 'fork') {
				trenchLogger.info(`Forking trench {} for torrent {}`, step.fork, torrent.name);
				const fork = this.trenchConfig.trenches.find((trench) => trench.name === step.fork);

				if (fork === undefined) {
					throw new Error(`Fork ${step.fork} not found`);
				}

				await this.runTrench(fork, torrent, client, true);
			}
		}
		/* eslint-enable no-await-in-loop */

		trenchLogger.debug(`Finished trench`);
	}

	private async action(step: TrenchAction, torrent: NormalizedTorrent, client: TorrentClient) {
		switch (step.action) {
			case 'pause': {
				await client.pauseTorrent(torrent.id);
				break;
			}

			case 'resume': {
				await client.resumeTorrent(torrent.id);
				break;
			}

			case 'recheck': {
				await client.recheckTorrent(torrent.id);
				break;
			}

			case 'reannounce': {
				await client.reannounceTorrent(torrent.id);
				break;
			}

			case 'increasePriority': {
				await client.queueUp(torrent.id);
				break;
			}

			case 'decreasePriority': {
				await client.queueDown(torrent.id);
				break;
			}

			case 'maximisePriority': {
				await client.topPriority(torrent.id);
				break;
			}

			case 'minimisePriority': {
				await client.bottomPriority(torrent.id);
				break;
			}

			case 'delete': {
				await client.removeTorrent(torrent.id, step.options?.deleteFiles === true);
				break;
			}
		}
	}

	private filter(step: TrenchFilter, torrent: NormalizedTorrent, logger: typeof this.logger) {
		switch (step.filter) {
			case 'complete': {
				if (torrent.isCompleted !== step.condition) {
					throw new TrenchSkippedByFilterException(`Torrent completion status is ${torrent.isCompleted}`);
				}

				break;
			}

			case 'label': {
				this.filterStepByStringCondition(torrent.label, step.condition, 'label');
				break;
			}

			case 'tracker': {
				const tracker = torrent.raw.tracker;
				if (tracker === undefined) {
					this.warnRawAccess('tracker', logger);
				}

				this.filterStepByStringCondition(torrent.raw.tracker, step.condition, 'tracker');
				break;
			}

			case 'progress': {
				this.filterStepByNumberCondition(
					torrent.progress * 100,
					{
						lte: step.condition.lte,
						gte: step.condition.gte,
					},
					'progress',
				);
				break;
			}

			case 'ratio': {
				this.filterStepByNumberCondition(
					torrent.ratio,
					{
						lte: step.condition.lte,
						gte: step.condition.gte,
					},
					'ratio',
				);
				break;
			}

			case 'savePath': {
				this.filterStepByStringCondition(torrent.savePath, step.condition, 'tracker');
				break;
			}

			case 'name': {
				this.filterStepByStringCondition(torrent.name, step.condition, 'name');
				break;
			}

			case 'seedTime': {
				const seedTime = torrent.raw.seeding_time;
				if (seedTime === undefined) {
					this.warnRawAccess('seedTime', logger);
				}

				this.filterStepByNumberCondition(
					torrent.raw.seeding_time,
					{
						lte: step.condition.lte,
						gte: step.condition.gte,
					},
					'seedTime',
				);
				break;
			}

			case 'timeActive': {
				const timeActive = torrent.raw.time_active;
				if (timeActive === undefined) {
					this.warnRawAccess('timeActive', logger);
				}

				this.filterStepByNumberCondition(
					timeActive,
					{
						lte: step.condition.lte,
						gte: step.condition.gte,
					},
					'timeActive',
				);
				break;
			}
		}
	}

	private filterStepByNumberCondition(
		property: number | undefined,
		numericConditions: {
			lte?: number;
			gte?: number;
		},
		propertyName: string,
	) {
		const { gte, lte } = numericConditions;

		if (property === undefined) {
			throw new TrenchSkippedByFilterException(chalkVariables(`Torrent has no property {}`, propertyName));
		}

		if (gte && !(property >= gte)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} is not greater than or equal to {}`, propertyName, gte),
			);
		}

		if (lte && !(property <= lte)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} is not less than or equal to {}`, propertyName, lte),
			);
		}
	}

	private filterStepByStringCondition(
		property: string | undefined,
		stringConditions: StringConditionsFilter,
		propertyName: string,
	) {
		let endsWith = stringConditions.endsWith;
		let notEndsWith = stringConditions.notEndsWith;
		let startsWith = stringConditions.startsWith;
		let notStartsWith = stringConditions.notStartsWith;
		let includes = stringConditions.includes;
		let notIncludes = stringConditions.notIncludes;

		if (stringConditions.caseInsensitive) {
			endsWith = endsWith?.toLowerCase();
			notEndsWith = notEndsWith?.toLowerCase();
			startsWith = startsWith?.toLowerCase();
			notStartsWith = notStartsWith?.toLowerCase();
			includes = includes?.toLowerCase();
			notIncludes = notIncludes?.toLowerCase();
		}

		if (property === undefined) {
			throw new TrenchSkippedByFilterException(chalkVariables(`Torrent has no {}`, propertyName));
		}

		const propertyString = stringConditions.caseInsensitive ? property.toLowerCase() : property;

		if (endsWith && !propertyString.endsWith(endsWith)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does not end with string {}`, propertyName, endsWith),
			);
		}

		if (notEndsWith && propertyString.endsWith(notEndsWith)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does end with string {}`, propertyName, notEndsWith),
			);
		}

		if (startsWith && !propertyString.startsWith(startsWith)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does not start with string {}`, propertyName, startsWith),
			);
		}

		if (notStartsWith && propertyString.startsWith(notStartsWith)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does start with string {}`, propertyName, notStartsWith),
			);
		}

		if (includes && !propertyString.includes(includes)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does not include string {}`, propertyName, includes),
			);
		}

		if (notIncludes && propertyString.includes(notIncludes)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does include string {}`, propertyName, notIncludes),
			);
		}

		const matches = stringConditions.match;
		if (matches && !matches.test(propertyString)) {
			throw new TrenchSkippedByFilterException(
				chalkVariables(`Torrent {} does match regex {}`, propertyName, matches.source),
			);
		}
	}

	private warnRawAccess(propertyName: string, logger: typeof this.logger) {
		logger.warn(
			`Attempted to read undefined property {} from raw torrent data. The torrent client may not provide this property and will cause this trench to be skipped.`,
			propertyName,
		);
	}
}

export class TrenchSkippedByFilterException extends Error {
	constructor(message: string) {
		super(message);
		this.name = TrenchSkippedByFilterException.name;
	}
}
