/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */

import { Partition } from '../partition'
import { ObjectInput, ObjectOutput} from './command'

/**
 * Input object of `std:partitions:list` command
 */
export type StdPartitionListInput = ObjectInput & {
    count: number
}

/**
 * Output object of `std:partitions:list` command
 */
export type StdPartitionListOutput = Partition