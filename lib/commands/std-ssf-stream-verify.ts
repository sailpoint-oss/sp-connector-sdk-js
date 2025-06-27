/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:verify` command
 */
export type StdSsfStreamVerifyInput = {
    streamId: string
    payload: any
    headers: Map<string, string>
}

/**
 * Output object of `std:ssf-stream:verify` command
 */
export type StdSsfStreamVerifyOutput = ObjectOutput
