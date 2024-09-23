/* Copyright (c) 2024. SailPoint Technologies, Inc. All rights reserved. */
export class Partition {
    public name: string
	public size: number
	public attributes: Map<string, any>
    public objectType: string

    constructor(name: string, size: number, attributes: Map<string, any>, objectType: string) {
        this.name = name;
        this.size = size;
        this.attributes = attributes;
        this.objectType = objectType;
    }
}