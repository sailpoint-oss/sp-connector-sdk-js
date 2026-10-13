/* Copyright (c) 2026. SailPoint Technologies, Inc. All rights reserved. */

import { ObjectOutput } from './command'

/**
 * Input object of `std:ssf-stream:jwks` command
 */
export type StdSsfStreamJwksInput = {
    stream: any
    jwksUri: string
}

/**
 * Output object of `std:ssf-stream:jwks` command
 */
export type StdSsfStreamJwksOutput = ObjectOutput
