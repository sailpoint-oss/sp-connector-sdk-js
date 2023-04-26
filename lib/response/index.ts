/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { Writable } from 'stream'

/**
 * Response interface
 */
export interface Response<T> {
	send(output: T): void
	saveState(state: any): void
	keepAlive(): void
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

	keepAlive(): void {
		this._writable.write(new RawResponse({}, ResponseType.KeepAlive))
	}
}

/**
 * Enum representing different types of responses
 */
enum ResponseType {
	Output = 'output',
	State = 'state',
	KeepAlive = 'keepAlive'
}

/**
 * RawResponse is the response that sdk sends out as command output
 */
class RawResponse {
    type: ResponseType
	data: string

    constructor(data: any, type = ResponseType.Output) {
       this.data = data
		this.type = type
	}
}
