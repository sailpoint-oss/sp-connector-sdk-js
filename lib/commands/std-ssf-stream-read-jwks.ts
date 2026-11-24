/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:read-jwks` command
 */
export type StdSsfStreamReadJwksInput = {
    stream: any
    jwksUri: string
}

/**
 * Output object of `std:ssf-stream:read-jwks` command
 */
export type StdSsfStreamReadJwksOutput = ObjectOutput
