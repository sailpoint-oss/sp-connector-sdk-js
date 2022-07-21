/* Copyright (c) 2021. SailPoint Technologies, Inc. All rights reserved. */

import { SchemaAttribute } from "./command";

/**
 * Output object of `std:account:discover-schema` command
 */
export type StdAccountDiscoverSchemaOutput = {
	displayAttribute: string
	groupAttribute: string
	identityAttribute: string
	attributes: SchemaAttribute[]
}
