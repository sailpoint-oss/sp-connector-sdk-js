/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:delete` command
 */
export type StdSsfStreamDeleteInput = {
    streamId: string
    headers: Map<string, string>
}

/**
 * Output object of `std:ssf-stream:delete` command
 */
export type StdSsfStreamDeleteOutput = ObjectOutput
