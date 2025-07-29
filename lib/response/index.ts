/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Writable } from 'stream'

/**
 * Response interface
 */
export interface Response<T> {
	send(output: T): void
	saveState(state: any): void
	keepAlive(): void
	patchConfig(patches: Patch[]): void
}

/**
 * Response implementation for sending command output in chunks
 */
export class ResponseStream<T> implements Response<T> {
	protected readonly _writable: Writable

	constructor(writable: Writable) {
		this._writable = writable
	}

	/**
	 * Send command output
	 * @param chunk output chunk
	 */
	send(chunk: T): void {
		this._writable.write(new RawResponse(chunk))
	}

	/**
	 * Save state for stateful command
	 * @param state the end state of running the stateful command
	 */
	saveState(state: any): void {
		this._writable.write(new RawResponse(state, ResponseType.State))
	}

	/**
	 * Indicates that the commands is still running.
	 *
	 * Can be used to avoid a timeout error in the case when a command
	 * is unable to return responses in a timely manner but is still
	 * actively processing the command.
	 */
	keepAlive(): void {
		this._writable.write(new RawResponse({}, ResponseType.KeepAlive))
	}

	patchConfig(patches: Patch[]): void {
		this._writable.write(new RawResponse(patches, ResponseType.Config))
	}
}

/**
 * Enum representing different types of responses
 */
export enum ResponseType {
	Output = 'output',
	State = 'state',
	KeepAlive = 'keepAlive',
	Config = 'config'
}

/**
 * RawResponse is the response that sdk sends out as command output
 */
export class RawResponse {
    type: ResponseType
	data: string

    constructor(data: any, type = ResponseType.Output) {
       this.data = data
		this.type = type
	}
}

/**
 * Enum PatchOp is the config patch operations
 */
export enum PatchOp {
	Add = 'add',
	Replace = 'replace',
	Remove = 'remove'
}

/**
 * Patch is a JSON patch for source config
 */
export type Patch = { op: PatchOp, path: string, value?: any }

/**
 * Response implementation which transforms output from I to O.
 */
export class ResponseStreamTransform<I, O> implements Response<I> {
	protected readonly _inner: Response<O>
	protected readonly _transform: (v: I) => O

	constructor(inner: Response<O>, transform: (v: I) => O) {
		this._inner = inner;
		this._transform = transform;
	}

	/**
	 * Send command output
	 * @param chunk output chunk
	 */
	send(chunk: I): void {
		this._inner.send(this._transform(chunk));
	}

	/**
	 * Save state for stateful command
	 * @param state the end state of running the stateful command
	 */
	saveState(state: any): void {
		this._inner.saveState(state);
	}

	/**
	 * Indicates that the commands is still running.
	 *
	 * Can be used to avoid a timeout error in the case when a command
	 * is unable to return responses in a timely manner but is still
	 * actively processing the command.
	 */
	keepAlive(): void {
		this._inner.keepAlive();
	}

	patchConfig(patches: Patch[]): void {
		this._inner.patchConfig(patches);
	}
}
