import cronParser from 'cron-parser';
import { z } from 'zod';
import { trenchActionSchema } from './action.schemas.js';
import { trenchFilterSchema } from './filter.schemas.js';
import { superRefineTrenchAliasValidate, trenchForkSchema } from './fork.schemas.js';

const connectionSchema = z.strictObject({
	client: z.enum(['qbit']),
	url: z.string().url(),
	username: z.string().optional(),
	password: z.string().optional(),
});

export type Connection = z.infer<typeof connectionSchema>;

export const configSchema = z.strictObject({
	version: z.number().default(1),
	connections: connectionSchema.array(),
	trenches: z
		.strictObject({
			name: z.string().trim(),
			enabled: z.boolean().default(false),
			trench: z.union([trenchFilterSchema, trenchActionSchema, trenchForkSchema]).array(),
			schedule: z
				.string()
				.default('*/30 * * * *')
				.refine((argument) => {
					try {
						if (argument !== undefined) {
							cronParser.parseExpression(argument);
						}

						return true;
					} catch {
						return false;
					}
				}, 'Invalid cron expression'),
		})
		.array()
		.refine(
			(trenches) => {
				const trenchNames = trenches.map((trench) => trench.name);
				return trenchNames.length === new Set(trenchNames).size;
			},
			{ message: 'Trench names must be unique' },
		)
		.superRefine(superRefineTrenchAliasValidate),
});

export type TrenchConfig = z.infer<typeof configSchema>;
export type Trench = z.infer<typeof configSchema.shape.trenches>[number];
