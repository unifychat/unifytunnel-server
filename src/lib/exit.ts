import process from 'node:process';

const asyncCallbacks = new Set<[() => Promise<void>, number]>();
const callbacks = new Set<() => void>();

let isCalled = false;
let isRegistered = false;

async function exit(shouldManuallyExit: boolean, isSynchronous: boolean, signal: number) {
	if (isCalled) {
		return;
	}

	isCalled = true;

	if (asyncCallbacks.size > 0 && isSynchronous) {
		console.error([
			'SYNCHRONOUS TERMINATION NOTICE:',
			'When explicitly exiting the process via process.exit or via a parent process,',
			'asynchronous tasks in your exitHooks will not run. Either remove these tasks,',
			'use gracefulExit() instead of process.exit(), or ensure your parent process',
			'sends a SIGINT to the process running this code.',
		].join(' '));
	}

	const done = (force = false) => {
		if (force === true || shouldManuallyExit === true) {
			process.exit(128 + signal); // eslint-disable-line unicorn/no-process-exit
		}
	};

	for (const callback of callbacks) {
		callback();
	}

	if (isSynchronous) {
		done();
		return;
	}

	const promises = [];
	let forceAfter = 0;
	for (const [callback, wait] of asyncCallbacks) {
		forceAfter = Math.max(forceAfter, wait);
		promises.push(Promise.resolve(callback()));
	}

	// Force exit if we exceeded our wait value
	const asyncTimer = setTimeout(() => {
		done(true);
	}, forceAfter);

	await Promise.all(promises);
	clearTimeout(asyncTimer);
	done();
}

function addHook(options: Options) {
	const {onExit, minimumWait, isSynchronous} = options;

	if (isSynchronous) {
		callbacks.add(onExit!);
	} else {
		asyncCallbacks.add([<() => Promise<void>>onExit!, minimumWait!]);
	}

	if (!isRegistered) {
		isRegistered = true;

		// Exit cases that support asynchronous handling
		process.once('beforeExit', exit.bind(undefined, true, false, -128));
		process.once('SIGHUP', exit.bind(undefined, true, false, 1)); // ADDED to support nodemon
		process.once('SIGINT', exit.bind(undefined, true, false, 2));
		process.once('SIGTERM', exit.bind(undefined, true, false, 15));

		// Explicit exit events. Calling will force an immediate exit and run all
		// synchronous hooks. Explicit exits must not extend the node process
		// artificially. Will log errors if asynchronous calls exist.
		process.once('exit', exit.bind(undefined, false, true, 0));

		// PM2 Cluster shutdown message. Caught to support async handlers with pm2,
		// needed because explicitly calling process.exit() doesn't trigger the
		// beforeExit event, and the exit event cannot support async handlers,
		// since the event loop is never called after it.
		process.on('message', message => {
			if (message === 'shutdown') {
				exit(true, true, -128);
			}
		});
	}

	return () => {
		if (isSynchronous) {
			callbacks.delete(onExit!);
		} else {
			asyncCallbacks.delete([<() => Promise<void>>onExit!, minimumWait!]);
		}
	};
}

/**
Run some code when the process exits.

The `process.on('exit')` event doesn't catch all the ways a process can exit.

This is useful for cleaning synchronously before exiting.

@param onExit - The callback function to execute when the process exits.
@returns A function that removes the hook when called.

@example
```
import exitHook from 'exit-hook';

exitHook(() => {
	console.log('Exiting');
});

// You can add multiple hooks, even across files
exitHook(() => {
	console.log('Exiting 2');
});

throw new Error('🦄');

//=> 'Exiting'
//=> 'Exiting 2'

// Removing an exit hook:
const unsubscribe = exitHook(() => {});

unsubscribe();
```
*/
export function exitHook(onExit: () => void): () => void {
	if (typeof onExit !== 'function') {
		throw new TypeError('onExit must be a function');
	}

	return addHook({
		onExit,
		isSynchronous: true,
	});
}

/**
Run code asynchronously when the process exits.

@see https://github.com/sindresorhus/exit-hook/blob/main/readme.md#asynchronous-exit-notes
@param onExit - The callback function to execute when the process exits via `gracefulExit`, and will be wrapped in `Promise.resolve`.
@returns A function that removes the hook when called.

@example
```
import {asyncExitHook} from 'exit-hook';

asyncExitHook(() => {
	console.log('Exiting');
}, {
	minimumWait: 500
});

throw new Error('🦄');

//=> 'Exiting'

// Removing an exit hook:
const unsubscribe = asyncExitHook(() => {}, {});

unsubscribe();
```
*/
export function asyncExitHook(onExit: () => Promise<void>, options: Options): () => void {
	if (typeof onExit !== 'function') {
		throw new TypeError('onExit must be a function');
	}

	if (typeof options?.minimumWait !== 'number' || options.minimumWait <= 0) {
		throw new TypeError('minimumWait must be set to a positive numeric value');
	}

	return addHook({
		onExit,
		minimumWait: options.minimumWait,
		isSynchronous: false,
	});
}

/**
Exit the process and make a best-effort to complete all asynchronous hooks.

If you are using `asyncExitHook`, consider using `gracefulExit()` instead of `process.exit()` to ensure all asynchronous tasks are given an opportunity to run.

@param signal - The exit code to use. Same as the argument to `process.exit()`.
@see https://github.com/sindresorhus/exit-hook/blob/main/readme.md#asynchronous-exit-notes

@example
```
import {asyncExitHook, gracefulExit} from 'exit-hook';

asyncExitHook(() => {
	console.log('Exiting');
}, 500);

// Instead of `process.exit()`
gracefulExit();
```
*/
export function gracefulExit(signal?: number): void {
	exit(true, false, -128 + (signal ?? 0));
}

export interface Options {
	/**
	The amount of time in milliseconds that the `onExit` function is expected to take.
	*/
	minimumWait?: number;

  onExit?: () => (void | Promise<void>);
  isSynchronous?: boolean;
}


/**
[`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach((eventType) => {
  process.on(eventType, cleanUpServer.bind(null, eventType));
})
 */