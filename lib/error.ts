/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

/**
 * Connector error types
 */
export enum ConnectorErrorType {
	Generic = 'generic',
	NotFound = 'notFound'
}

/**
 * Connector error types
 */
export class ConnectorError extends Error {
    type: ConnectorErrorType

    constructor(message:string, type = ConnectorErrorType.Generic) {
        super(message)
		this.type = type
	}
}