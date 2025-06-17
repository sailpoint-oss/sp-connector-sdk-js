/* Copyright (c) 2025. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:update` command
 */
export type StdSsfStreamUpdateInput = {
    id: string
    payload: any
    headers: any
}

/**
 * Output object of `std:ssf-stream:update` command
 */
export type StdSsfStreamUpdateOutput = ObjectOutput
