import { z } from 'zod';

const stringConditions = z
	.strictObject({
		caseInsensitive: z.boolean().default(false),
		startsWith: z.string(),
		includes: z.string(),
		endsWith: z.string(),
		notStartsWith: z.string(),
		notEndsWith: z.string(),
		notIncludes: z.string(),
		match: z
			.string()
			.refine(
				(argument) => {
					try {
						new RegExp(argument); // eslint-disable-line no-new
						return true;
					} catch {
						return false;
					}
				},
				{ message: 'String must be a valid regular expression' },
			)
			.transform((argument) => new RegExp(argument)),
	})
	.partial()
	.refine(
		({ startsWith, includes, endsWith, match }) =>
			startsWith !== undefined || includes !== undefined || endsWith !== undefined || match !== undefined,
		{ message: 'At least one string condition must be provided' },
	);

export type StringConditionsFilter = z.infer<typeof stringConditions>;

const trenchBaseFilter = z.object({
	type: z.literal('filter'),
});

const complete = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('complete'),
		condition: z.boolean(),
	}),
);

const tracker = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('tracker'),
		condition: stringConditions,
	}),
);

const progress = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('progress'),
		condition: z
			.strictObject({
				lte: z.number().min(0).max(100),
				gte: z.number().min(0).max(100),
			})
			.partial(),
	}),
);

const ratio = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('ratio'),
		condition: z
			.strictObject({
				lte: z.number().min(0),
				gte: z.number().min(0),
			})
			.partial(),
	}),
);

const seedTime = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('seedTime'),
		condition: z
			.strictObject({
				lte: z.number().min(0),
				gte: z.number().min(0),
			})
			.partial(),
	}),
);

const timeActive = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('timeActive'),
		condition: z
			.strictObject({
				lte: z.number().min(0),
				gte: z.number().min(0),
			})
			.partial(),
	}),
);

const label = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('label'),
		condition: stringConditions,
	}),
);

const savePath = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('savePath'),
		condition: stringConditions,
	}),
);

const name = trenchBaseFilter.merge(
	z.strictObject({
		filter: z.literal('name'),
		condition: stringConditions,
	}),
);

export const trenchFilterSchema = z.discriminatedUnion('filter', [
	complete,
	tracker,
	progress,
	ratio,
	label,
	savePath,
	name,
	seedTime,
	timeActive,
]);

export type TrenchFilter = z.infer<typeof trenchFilterSchema>;
