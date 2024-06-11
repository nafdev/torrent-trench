import { z } from 'zod';
import { type Trench } from './config.schemas.js';

export const trenchForkSchema = z.strictObject({
	type: z.literal('fork'),
	fork: z.string().trim(),
});

/**
 * Ensures that fork trench alias is defined somewhere in the config, and is not a recursive reference
 */
export const superRefineTrenchAliasValidate = (trenches: unknown[], context: z.RefinementCtx) => {
	const definedTrenches = new Map<string, Trench>();

	for (const trench of trenches as Trench[]) {
		definedTrenches.set(trench.name, trench);
	}

	for (const [trenchIndex, trench] of (trenches as Trench[]).entries()) {
		for (const [stepIndex, step] of trench.trench.entries()) {
			if (step.type !== 'fork') {
				continue;
			}

			const stepPath = [trenchIndex, 'trench', stepIndex, 'fork'];

			if (step.fork === trench.name) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: stepPath,
					message: 'Trench fork references itself, recursive trenches are not supported',
				});

				continue;
			}

			const fork = definedTrenches.get(step.fork);
			if (!fork) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: stepPath,
					message: `Unrecognised trench name, valid options are '${Array.from(definedTrenches.keys()).join("' | '")}'`,
				});

				continue;
			}

			// Could change this to allow sub forks and check for circular refs
			const hasSubFork = fork.trench.find((step) => step.type === 'fork');

			if (hasSubFork) {
				context.addIssue({
					code: z.ZodIssueCode.custom,
					path: stepPath,
					message: `Forked trench should not fork another trench (no sub forks)`,
				});
			}
		}
	}
};
