/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { AsyncLocalStorage } from 'async_hooks'
import { Context } from './connector-handler'

export const contextState = new AsyncLocalStorage<Context>()
