import { QBittorrent } from '@ctrl/qbittorrent';
import { type Connection } from '../schemas/config.schemas.js';
import { createLogger } from '../logger.js';

export type TorrentClient = QBittorrent;

export class TorrentClientManager {
	private readonly logger = createLogger('TorrentClientManager');
	private readonly qbitClients: TorrentClient[] = [];

	constructor(connections: Connection[]) {
		this.setupTorrentClientConnections(connections);
	}

	setupTorrentClientConnections(connections: Connection[]) {
		for (const connection of connections) {
			switch (connection.client) {
				case 'qbit': {
					this.qbitClients.push(
						new QBittorrent({
							baseUrl: connection.url,
							username: connection.username,
							password: connection.password,
						}),
					);
					break;
				}
			}
		}

		this.logger.info(`Detected {} qBittorrent client connections`, this.qbitClients.length);
	}

	getClients() {
		return this.qbitClients;
	}

	async testClientConnections() {
		this.logger.debug('Testing client connections');

		for (const client of this.getClients()) {
			try {
				// eslint-disable-next-line no-await-in-loop
				if (!(await client.login())) {
					this.logger.error(`Unable to login to client ${client.config.baseUrl}`);
				}
			} catch (error) {
				if (error instanceof Error) {
					this.logger.error(`Unable to login to client ${client.config.baseUrl}: ${error.message}`);
				}

				throw error;
			}
		}

		this.logger.debug('All clients connected successfully');
	}
}
