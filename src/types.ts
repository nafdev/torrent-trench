import type { normalizeTorrentData } from '@ctrl/qbittorrent/dist/src/normalizeTorrentData' with { 'resolution-mode': 'require' };

export type NormalizedTorrent = Omit<ReturnType<typeof normalizeTorrentData>, 'raw'> & {
	raw: QbitRawTorrent;
};

export type QbitRawTorrent = {
	// API ver v4.6.2
	added_on: number;
	amount_left: number;
	auto_tmm: boolean;
	availability: number;
	category: string;
	completed: number;
	completion_on: number;
	content_path: string;
	dl_limit: number;
	dlspeed: number;
	download_path: string;
	downloaded: number;
	downloaded_session: number;
	eta: number;
	f_l_piece_prio: boolean;
	force_start: boolean;
	hash: string;
	inactive_seeding_time_limit: number;
	infohash_v1: string;
	infohash_v2: string;
	last_activity: number;
	magnet_uri: string;
	max_inactive_seeding_time: number;
	max_ratio: number;
	max_seeding_time: number;
	name: string;
	num_complete: number;
	num_incomplete: number;
	num_leechs: number;
	num_seeds: number;
	priority: number;
	progress: number;
	ratio: number;
	ratio_limit: number;
	save_path: string;
	seeding_time: number;
	seeding_time_limit: number;
	seen_complete: number;
	seq_dl: boolean;
	size: number;
	state: string;
	super_seeding: boolean;
	tags: string;
	time_active: number;
	total_size: number;
	tracker: string;
	trackers_count: number;
	up_limit: number;
	uploaded: number;
	uploaded_session: number;
	upspeed: number;
};
