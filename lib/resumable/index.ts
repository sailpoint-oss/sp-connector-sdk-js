import {
  Context,
  Response,
  StdAccountListInput,
  StdAccountListOutput,
  StdAccountListHandler,
  readConfig
} from '..'

import vm from "node:vm"
import fs from "node:fs"
import {createWriteStream, WriteStream} from 'node:fs'


import PQueue from "p-queue"

import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { Tracer, Span, trace, context } from '@opentelemetry/api';

export interface Value {
	id?: string

	type: string
	value: any
}

export interface Values {
	byType(type: string, handler: (v: Value) => void): void

	byTypeGen(type: string): Generator<any>

	byTypeAndId(type: string, id: string, handler: (v: Value) => void): void

  store(type: string, value: any): void

  display(): void
}

export class ValuesMem {
	values: Array<Value>

	constructor() {
		this.values = new Array()
	}

	byType(type: string, handler: (v: Value) => undefined) {
		for (let v of this.values) {
			if (v.type == type) {
				handler(v)
			}
		}
	}

	*byTypeGen(type: string) {
		for (let v of this.values) {
			if (v.type == type) {
        yield v
			}
		}
	}

	byTypeAndId(type: string, id: string, handler: (v: Value) => void) {}

  store(type: string, value: any) {
    this.values.push({
      type,
      value,
    })
  }

  display(): void {
    JSON.stringify(this.values)
  }
}

export interface ResumableOperation {
  retrieve: Function,
  transform: any,
}

export interface X {
  client: any
  get(resource: Function, args: any): void
  store(type: string, obj: any): void
  inspect(obj: any): void
}

interface RunnerOptions {
  logGets: boolean
  tracer?: Tracer
}

interface ResourceFetch {
  name: string
  elapsedMs: number
}

interface Summary {
  elapsedMs: number
  storedBytes: number
  fetches: ResourceFetch[]
}

export interface LogEntry {
  startTimestamp: string,
  endTimestamp: string,
  sequenceId: number,

  retriever: string,
  retriever_args: any,

  to_retrieve: Array<[string,any]>
  values: Array<[string,any]>
}

export interface LogWriter {
  write(e: LogEntry): void
}

export class LogWriterFile {
  writer: WriteStream

  constructor() {
    this.writer = createWriteStream("agg.jsonl")
  }

  write(e: LogEntry) {
    this.writer.write(JSON.stringify(e))
  }
}

export interface LogReader {                                                                                                                                                                                                   
  read(): Generator<LogEntry>
} 

export class Runner {
  values: Values
  queue: PQueue
  context: any
  myCtx: any
  opts: RunnerOptions
  initialTs: any
  tracer?: Tracer
  summary: Summary
  log_writer: LogWriter

	constructor(context: any, myCtx: any, opts: RunnerOptions) {
    this.values = new ValuesMem()
    this.queue = new PQueue({concurrency: 32})
    this.context = context
    this.myCtx = myCtx
    this.opts = opts
    this.initialTs = process.hrtime.bigint()
    // TODO noop tracer
    this.tracer = opts.tracer
    this.summary = {
      elapsedMs: 0,
      storedBytes: 0,
      fetches: [],
    }
    this.log_writer = new LogWriterFile()
  }

  async run(roots: Array<[Function,any]>) {
    const rootSpan = this.tracer!!.startSpan(`op`);
    const ctx = trace.setSpan(context.active(), rootSpan);


    const drive = (resource: Function, args: any) => {
      this.queue.add(async () => {
        const startTs = process.hrtime.bigint();
        const activeSpan = trace.getActiveSpan();
        await this.tracer!!.startActiveSpan(`resource ${resource.name} - ${JSON.stringify(args)}`, {}, ctx, async (span: Span) => {
          span.setAttribute('args', JSON.stringify(args))
          await runOp(this, this.context, this.myCtx, resource.name, args, drive);
          span.end()
        })
        const endTs = process.hrtime.bigint();
        if (this.opts.logGets) {
          console.log(`[GET] [${resource.name}] [${JSON.stringify(args)}] stores=TODO elapsed=${(endTs - startTs)/BigInt("1000000")}ms`)
        }
        this.summary.fetches.push({
          name: resource.name,
          elapsedMs: Number(endTs / BigInt("1000000") - startTs / BigInt("1000000")),
        })
      })
    }

    const startTs = process.hrtime.bigint();
    for (const root of roots) {
      drive(root[0], root[1])
    }

    await this.queue.onIdle()
    const endTs = process.hrtime.bigint();
    this.summary.elapsedMs = Number(endTs / BigInt("1000000") - startTs / BigInt("1000000"))
    rootSpan.end()
  }
}

export function HandleAccountList(op: ResumableOperation): StdAccountListHandler {
  return async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
    const myCtx = await context.resources['client'](await readConfig());

    const r = new Runner(context, myCtx, {logGets: false})
    const roots: Array<[Function,any]> = new Array(
      [op.retrieve, {}]
    )
    await r.run(roots)

    op.transform(r.values, res)
  }
}

async function runOp(r: Runner, ctx: any, myCtx: any, name: string, args: any, get: (resource: Function, args: any) => void) {
  // TODO add store and get events
  const x = {
    ...myCtx, 
    get: (resource: Function, args: any) => {
      const activeSpan = trace.getActiveSpan()!!;
      activeSpan.addEvent(`get ${resource.name} - ${JSON.stringify(args)}`)
      get(resource, args)
    },
    store: (type: string, obj: any) => {
      const activeSpan = trace.getActiveSpan()!!;
      const size = JSON.stringify(obj).length;
      activeSpan.addEvent(`store ${type}`, {
        size,
      })
      r.summary.storedBytes += size;
      r.values.store(type, obj)
    },
    inspect: (obj: any) => {
      console.log(obj)
    },
  }

  await ctx.resources[name](x, args);
}
