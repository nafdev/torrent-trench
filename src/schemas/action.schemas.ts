import { z } from 'zod';

const trenchBaseAction = z.object({
	type: z.literal('action'),
});

const resumeTorrent = trenchBaseAction.merge(z.strictObject({ action: z.literal('resume') }));
const pauseTorrent = trenchBaseAction.merge(z.strictObject({ action: z.literal('pause') }));
const recheckTorrent = trenchBaseAction.merge(z.strictObject({ action: z.literal('recheck') }));
const reannounceTorrent = trenchBaseAction.merge(z.strictObject({ action: z.literal('reannounce') }));
const increasePriority = trenchBaseAction.merge(z.strictObject({ action: z.literal('increasePriority') }));
const decreasePriority = trenchBaseAction.merge(z.strictObject({ action: z.literal('decreasePriority') }));
const maximisePriority = trenchBaseAction.merge(z.strictObject({ action: z.literal('maximisePriority') }));
const minimisePriority = trenchBaseAction.merge(z.strictObject({ action: z.literal('minimisePriority') }));

const deleteTorrent = trenchBaseAction.merge(
	z.strictObject({
		action: z.literal('delete'),
		options: z
			.strictObject({
				deleteFiles: z.boolean().default(false),
			})
			.partial()
			.optional(),
	}),
);

export const trenchActionSchema = z.discriminatedUnion('action', [
	resumeTorrent,
	pauseTorrent,
	recheckTorrent,
	reannounceTorrent,
	increasePriority,
	decreasePriority,
	maximisePriority,
	minimisePriority,
	deleteTorrent,
]);

export type TrenchAction = z.infer<typeof trenchActionSchema>;
