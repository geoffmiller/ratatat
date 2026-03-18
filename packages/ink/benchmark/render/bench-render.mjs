import {Buffer} from 'node:buffer';
import fs from 'node:fs';
import process from 'node:process';
import {PassThrough, Writable} from 'node:stream';
import React, {useEffect, useMemo, useState} from 'react';

const workloadFactories = {
	dense: makeDenseFrame,
	sparse: makeSparseFrame,
	unicode: makeUnicodeFrame,
};

const workloads = (process.env.WORKLOADS ?? 'dense,unicode,sparse')
	.split(',')
	.map(item => item.trim())
	.filter(Boolean);
const repetitions = Number(process.env.REPETITIONS ?? 9);
const warmup = Number(process.env.WARMUP ?? 20);
const measuredFrames = Number(process.env.RUNS ?? 120);
const columns = Number(process.env.COLS ?? 80);
const rows = Number(process.env.ROWS ?? 24);

for (const workload of workloads) {
	if (!Object.hasOwn(workloadFactories, workload)) {
		throw new Error(`Unknown workload: ${workload}`);
	}
}

const {render, Box, Text, useApp} = await import('../../build/index.js');
const totalFrames = warmup + measuredFrames;

class DevNullTtyStream extends Writable {
	constructor() {
		super();
		this.isTTY = true;
		this.columns = columns;
		this.rows = rows;
		this.fd = 1;
		this._fd = fs.openSync('/dev/null', 'w');
	}

	_write(chunk, encoding, callback) {
		const buffer = Buffer.isBuffer(chunk)
			? chunk
			: Buffer.from(String(chunk), encoding);
		fs.writeSync(this._fd, buffer);
		callback();
	}

	closeSink() {
		if (this._fd !== null) {
			fs.closeSync(this._fd);
			this._fd = null;
		}
	}
}

function makeDenseFrame(frame, width, height) {
	const chars = '█▓▒░▪▫●○◆◇';
	let output = '';
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			output += chars[(x * 3 + y * 7 + frame) % chars.length];
		}

		if (y < height - 1) {
			output += '\n';
		}
	}

	return output;
}

function makeSparseFrame(frame, width, height) {
	const pointX = frame % width;
	const pointY = Math.floor(frame / width) % height;
	let output = '';
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			output += x === pointX && y === pointY ? '@' : '.';
		}

		if (y < height - 1) {
			output += '\n';
		}
	}

	return output;
}

function makeUnicodeFrame(frame, width, height) {
	const chars = ['漢', '字', '語', '🙂', '🚀', '界', '火', '水', '🌊', '🌲'];
	let output = '';
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			output += chars[(x * 5 + y * 11 + frame) % chars.length];
		}

		if (y < height - 1) {
			output += '\n';
		}
	}

	return output;
}

function calculateStats(samples) {
	const sorted = [...samples].sort((left, right) => left - right);
	const sum = sorted.reduce((total, value) => total + value, 0);
	const percentile95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);

	return {
		median: sorted[Math.floor(sorted.length / 2)] ?? 0,
		mean: sorted.length === 0 ? 0 : sum / sorted.length,
		p95: sorted[percentile95Index] ?? 0,
		min: sorted[0] ?? 0,
		max: sorted.at(-1) ?? 0,
	};
}

async function runSingle(workload) {
	const renderTimes = [];
	let frameCount = 0;

	function App() {
		const {exit} = useApp();
		const [frame, setFrame] = useState(0);

		useEffect(() => {
			if (frame >= totalFrames) {
				const timeout = setTimeout(() => exit(), 0);
				return () => clearTimeout(timeout);
			}

			const timeout = setTimeout(() => setFrame(value => value + 1), 0);
			return () => clearTimeout(timeout);
		}, [frame, exit]);

		const text = useMemo(
			() => workloadFactories[workload](frame, columns, rows),
			[frame],
		);

		return React.createElement(
			Box,
			{width: columns, height: rows, flexDirection: 'column'},
			React.createElement(Text, null, text),
		);
	}

	const stdout = new DevNullTtyStream();
	const stdin = new PassThrough();
	stdin.isTTY = false;
	stdin.setRawMode = () => {};

	const app = render(React.createElement(App), {
		stdout,
		stdin,
		stderr: process.stderr,
		patchConsole: false,
		exitOnCtrlC: false,
		maxFps: 1000,
		concurrent: false,
		onRender({renderTime}) {
			if (frameCount >= warmup && frameCount < totalFrames) {
				renderTimes.push(renderTime);
			}

			frameCount++;
		},
	});

	await app.waitUntilExit();
	stdout.closeSink();
	stdin.destroy();

	return calculateStats(renderTimes);
}

const report = {
	config: {
		workloads,
		repetitions,
		warmup,
		measuredFrames,
		columns,
		rows,
	},
	results: [],
};

for (const workload of workloads) {
	const medians = [];
	const means = [];
	const p95Values = [];

	for (let repetition = 0; repetition < repetitions; repetition++) {
		// eslint-disable-next-line no-await-in-loop
		const run = await runSingle(workload);
		medians.push(run.median);
		means.push(run.mean);
		p95Values.push(run.p95);
	}

	report.results.push({
		workload,
		medianOfMedians: calculateStats(medians).median,
		meanOfMeans: calculateStats(means).mean,
		medianOfP95: calculateStats(p95Values).median,
		minMedian: calculateStats(medians).min,
		maxMedian: calculateStats(medians).max,
		rawMedians: medians,
	});
}

console.log(JSON.stringify(report, null, 2));
