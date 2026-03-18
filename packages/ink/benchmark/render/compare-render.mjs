import {mkdtempSync, rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {spawnSync} from 'node:child_process';

const repositoryRoot = process.cwd();
const baseRef = process.env.BASE_REF ?? 'HEAD~1';
const headRef = process.env.HEAD_REF ?? 'WORKTREE';
const workloads = (process.env.WORKLOADS ?? 'dense,unicode,sparse')
	.split(',')
	.map(item => item.trim())
	.filter(Boolean);
const rounds = Number(process.env.ROUNDS ?? 4);

const benchEnvironment = {
	...process.env,
	REPETITIONS: process.env.REPETITIONS ?? '5',
	RUNS: process.env.RUNS ?? '120',
	WARMUP: process.env.WARMUP ?? '20',
};

const worktreeTemporaryDirectory = mkdtempSync(
	path.join(os.tmpdir(), 'ink-fast-compare-'),
);
let baseWorktreePath;
let headWorktreePath;

const run = (command, args, options = {}) => {
	const result = spawnSync(command, args, {
		cwd: repositoryRoot,
		encoding: 'utf8',
		stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
	});

	if (result.status !== 0) {
		throw new Error(
			[
				`Command failed: ${command} ${args.join(' ')}`,
				result.stdout,
				result.stderr,
			]
				.filter(Boolean)
				.join('\n'),
		);
	}

	return result;
};

const runInDirectory = (cwd, command, args, environment = process.env) => {
	const result = spawnSync(command, args, {
		cwd,
		encoding: 'utf8',
		env: environment,
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	if (result.status !== 0) {
		throw new Error(
			[
				`Command failed in ${cwd}: ${command} ${args.join(' ')}`,
				result.stdout,
				result.stderr,
			]
				.filter(Boolean)
				.join('\n'),
		);
	}

	return result;
};

const parseBenchResult = output => {
	const start = output.indexOf('{');
	const end = output.lastIndexOf('}');
	if (start === -1 || end < start) {
		throw new Error(`Unable to parse benchmark JSON:\n${output}`);
	}

	return JSON.parse(output.slice(start, end + 1));
};

const median = values => {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

const prepareWorktree = (label, ref) => {
	const worktreePath = path.join(worktreeTemporaryDirectory, label);
	run('git', ['worktree', 'add', '--force', worktreePath, ref]);
	return worktreePath;
};

const ensureBuilt = cwd => {
	runInDirectory(cwd, 'npm', ['install']);
	runInDirectory(cwd, 'npm', ['run', 'build']);
};

const runBench = (cwd, workload) => {
	const result = runInDirectory(
		cwd,
		'node',
		['benchmark/render/bench-render.mjs'],
		{...benchEnvironment, WORKLOADS: workload},
	);
	const parsed = parseBenchResult(result.stdout);
	return parsed.results[0]?.medianOfMedians ?? 0;
};

try {
	run('git', ['worktree', 'prune']);

	baseWorktreePath = prepareWorktree('base', baseRef);
	headWorktreePath =
		headRef === 'WORKTREE' ? repositoryRoot : prepareWorktree('head', headRef);

	ensureBuilt(baseWorktreePath);
	if (headWorktreePath === repositoryRoot) {
		run('npm', ['run', 'build'], {stdio: ['ignore', 'pipe', 'pipe']});
	} else {
		ensureBuilt(headWorktreePath);
	}

	const report = {
		config: {
			baseRef,
			headRef,
			workloads,
			rounds,
			repetitions: Number(benchEnvironment.REPETITIONS),
			runs: Number(benchEnvironment.RUNS),
			warmup: Number(benchEnvironment.WARMUP),
		},
		results: [],
	};

	for (const workload of workloads) {
		const baseRuns = [];
		const headRuns = [];

		for (let round = 0; round < rounds; round++) {
			const firstHead = runBench(headWorktreePath, workload);
			const firstBase = runBench(baseWorktreePath, workload);
			const secondBase = runBench(baseWorktreePath, workload);
			const secondHead = runBench(headWorktreePath, workload);

			headRuns.push(firstHead, secondHead);
			baseRuns.push(firstBase, secondBase);
		}

		const headMedian = median(headRuns);
		const baseMedian = median(baseRuns);
		const deltaPercent =
			baseMedian === 0 ? 0 : ((headMedian - baseMedian) / baseMedian) * 100;

		report.results.push({
			workload,
			headMedian,
			baseMedian,
			deltaPercent,
			headRuns,
			baseRuns,
		});
	}

	console.log(JSON.stringify(report, null, 2));
} finally {
	const removeWorktree = worktreePath => {
		if (worktreePath && worktreePath !== repositoryRoot) {
			spawnSync('git', ['worktree', 'remove', '--force', worktreePath], {
				cwd: repositoryRoot,
				stdio: ['ignore', 'ignore', 'ignore'],
			});
		}
	};

	removeWorktree(baseWorktreePath);
	removeWorktree(headWorktreePath);
	rmSync(worktreeTemporaryDirectory, {recursive: true, force: true});
}
