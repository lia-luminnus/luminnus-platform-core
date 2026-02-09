import { LiaEvaluator } from '../engine/evaluator.js';
import { BehavioralContract } from '../engine/contracts.js';
import { z } from 'zod';
import chalk from 'chalk';

async function runDemoEval() {
    const evaluator = new LiaEvaluator();

    // 1. Reliability Test (Simulated Voice Command)
    await evaluator.runN("Voice Intent: 'Send Email'", async () => {
        // Simulate a flakey AI call
        await new Promise(r => setTimeout(r, 500));
        if (Math.random() < 0.2) throw new Error("AI Hallucination: Wrong tool selected");
        return {
            intent: 'gmail.send_email',
            params: { to: 'boss@luminnus.com', subject: 'Report' },
            conversationId: 'uuid-123'
        };
    }, 10);

    // 2. Behavioral Contract Test
    await evaluator.runN("Behavioral Contract: Response Format", async () => {
        const output = {
            intent: 'calendar.create_event',
            conversationId: 'uuid-456',
            // Missing params in some runs to simulate bugs
            params: Math.random() < 0.3 ? undefined : { time: '10am' }
        };

        const result = BehavioralContract.validate(output, [
            BehavioralContract.requiredFields(['intent', 'conversationId', 'params'])
        ]);

        if (!result.isValid) {
            throw new Error(`Contract Failure: ${result.failures.map(f => f.reason).join(', ')}`);
        }
        return output;
    }, 5);
}

runDemoEval().catch(err => {
    console.error(chalk.red("Final Eval Error:"), err);
    process.exit(1);
});
