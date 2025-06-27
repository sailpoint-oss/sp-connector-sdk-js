/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:replace` command
 */
export type StdSsfStreamReplaceInput = {
    streamId: string
    payload: any
    headers: Map<string, string>
}

/**
 * Output object of `std:ssf-stream:replace` command
 */
export type StdSsfStreamReplaceOutput = ObjectOutput
