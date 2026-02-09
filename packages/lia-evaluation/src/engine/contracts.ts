import { z } from 'zod';

export interface Contract {
    name: string;
    validate: (output: any) => { isValid: boolean; reason?: string };
}

/**
 * Validates that the agent follows behavioral invariants
 */
export class BehavioralContract {
    static validate(output: any, contracts: Contract[]) {
        const failures = [];
        for (const contract of contracts) {
            const result = contract.validate(output);
            if (!result.isValid) {
                failures.push({ name: contract.name, reason: result.reason });
            }
        }
        return {
            isValid: failures.length === 0,
            failures
        };
    }

    /**
     * Preset: Ensure output is valid JSON according to schema
     */
    static jsonSchema(name: string, schema: z.ZodTypeAny): Contract {
        return {
            name,
            validate: (output) => {
                const res = schema.safeParse(output);
                return { isValid: res.success, reason: res.success ? undefined : res.error.message };
            }
        };
    }

    /**
     * Preset: Ensure specific fields are present and not empty
     */
    static requiredFields(fields: string[]): Contract {
        return {
            name: `Required Fields: ${fields.join(', ')}`,
            validate: (output) => {
                const missing = fields.filter(f => !output[f]);
                return {
                    isValid: missing.length === 0,
                    reason: missing.length > 0 ? `Missing fields: ${missing.join(', ')}` : undefined
                };
            }
        };
    }
}
