/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:update` command
 */
export type StdSsfStreamUpdateInput = {
    streamId: string
    payload: any
    headers: Map<string, string>
}

/**
 * Output object of `std:ssf-stream:update` command
 */
export type StdSsfStreamUpdateOutput = ObjectOutput
