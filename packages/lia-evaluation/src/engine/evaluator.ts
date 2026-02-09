import chalk from 'chalk';

export interface EvalResult {
    iteration: number;
    success: boolean;
    durationMs: number;
    output: any;
    error?: string;
}

export interface EvalStats {
    totalRuns: number;
    successRate: number;
    avgLatency: number;
    p95Latency: number;
}

export class LiaEvaluator {
    async runN(
        taskName: string,
        taskFn: () => Promise<any>,
        n: number = 5
    ): Promise<{ results: EvalResult[]; stats: EvalStats }> {
        console.log(chalk.blue(`\n🚀 Starting evaluation: ${chalk.bold(taskName)} (${n} iterations)`));

        const results: EvalResult[] = [];
        const startTotal = Date.now();

        for (let i = 1; i <= n; i++) {
            const start = Date.now();
            let success = false;
            let output: any = null;
            let errorMsg: string | undefined;

            try {
                process.stdout.write(chalk.gray(`  [${i}/${n}] Executing... `));
                output = await taskFn();
                success = true;
                process.stdout.write(chalk.green('✅\n'));
            } catch (err: any) {
                errorMsg = err.message;
                process.stdout.write(chalk.red('❌\n'));
            }

            results.push({
                iteration: i,
                success,
                durationMs: Date.now() - start,
                output,
                error: errorMsg
            });
        }

        const stats = this.calculateStats(results);
        this.printStats(taskName, stats);

        return { results, stats };
    }

    private calculateStats(results: EvalResult[]): EvalStats {
        const totalRuns = results.length;
        const successes = results.filter(r => r.success).length;
        const latencies = results.map(r => r.durationMs).sort((a, b) => a - b);

        const avgLatency = latencies.reduce((a, b) => a + b, 0) / totalRuns;
        const p95Idx = Math.floor(totalRuns * 0.95);
        const p95Latency = latencies[p95Idx] || latencies[latencies.length - 1];

        return {
            totalRuns,
            successRate: (successes / totalRuns) * 100,
            avgLatency,
            p95Latency
        };
    }

    private printStats(name: string, stats: EvalStats) {
        console.log(chalk.cyan(`\n📊 Stats for ${chalk.bold(name)}:`));
        console.log(`  Success Rate: ${stats.successRate === 100 ? chalk.green('100%') : chalk.yellow(`${stats.successRate}%`)}`);
        console.log(`  Avg Latency:  ${stats.avgLatency.toFixed(2)}ms`);
        console.log(`  P95 Latency:  ${stats.p95Latency}ms`);
        console.log('-'.repeat(40));
    }
}
