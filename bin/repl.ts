#!/usr/bin/env node
import path from 'path'
import vm from "node:vm";
import fs from "node:fs";
const repl = require('node:repl');

const { parse, each } = require("abstract-syntax-tree")
import { attribute, Digraph, Subgraph, Node, Edge, toDot } from 'ts-graphviz';
import { toFile } from 'ts-graphviz/adapter';
const execSync = require('child_process').execSync;

import opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';



import { Runner, ValuesMem } from "../lib/resumable"
import inspector from "node:inspector";

const tsNode = require('ts-node')

const argv: string[] = process.argv.slice(2)

let connectorPath: string = path.resolve(process.cwd(), argv[0])

const loadConnector = async (connectorPath: string) => {
  let c = require(connectorPath)
  const connector = c.connector
  const connectorCustomizer = c.connectorCustomizer
  Object.keys(require.cache)
    .filter((key: string) => !key.includes('node_modules'))
    .forEach((key: string) => delete require.cache[key])

  return {
    connector: typeof connector === 'function' ? await connector() : connector,
    connectorCustomizer: typeof connectorCustomizer === 'function' ? await connectorCustomizer() : connectorCustomizer
  }
}

class X {
  get(name: Function, args: any) {
    console.log(`=> ${name.name}(${JSON.stringify(args)})`)
  }

  inspect(obj: any) {
    console.log(obj)
  }

  store(type: string, value: any) {
  }
}

const gets = (ast: any): Array<string> => {
  const out = new Array();
      each(ast, "CallExpression", (node: any) => {
        //console.log(JSON.stringify(node, null, 2))
        const functionName = node.callee.property.name
        if (functionName == "get") {
          var resourceName = ""
          if (node.arguments[0].type == "MemberExpression") {
            resourceName = node.arguments[0].property.name
          } else {
            resourceName = node.arguments[0].name
          }
          out.push(resourceName)
        }
      })
      return out
}

(async () => {
  inspector.open()
  const sdk = new NodeSDK({
    //traceExporter: new ConsoleSpanExporter(),
  });

  sdk.start();

  const c = await loadConnector(connectorPath)
  console.log(c.connector._resources)

  const config = JSON.parse(fs.readFileSync("config.json").toString())
  console.log(config)

  const client = await c.connector._resources["client"](config)

  const x = new X()
  Object.assign(x, client);
  //x.client = client

  const r = repl.start('> ')
  r.context.c = c
  r.context.x = x
  Object.assign(r.context, c.connector._resources);
  Object.assign(r.context, c.connector._resumable_ops);

  const go = async (resource: Function, args: any) => {
    await resource(x, args)
  }
  r.context.go = go

  const collect = async (resource: Function, args: any, outPath?: string): Promise<any> => {
    // TODO track elapsed time and memory usage?
    const tracer = opentelemetry.trace.getTracer(
      'instrumentation-scope-name',
      'instrumentation-scope-version',
    );
    const r = new Runner({
      resources: c.connector._resources,
    }, client, { logGets: true, tracer });
    await r.run([[resource, args]]);
    console.log(r.values);
    if (outPath !== null && outPath !== undefined) {
      fs.writeFileSync(outPath, JSON.stringify(r.values))
    }
    console.log(JSON.stringify(r.summary))

    return r.values
  }
  r.context.collect = collect

  r.defineCommand('viz',
    {
      action: async function(resourceName: string) {
        const resource = c.connector._resources[resourceName];
        const edges = new Array();
        const nodes = new Map<string,Node>();

        const G = new Digraph();
        const A = new Subgraph('A');

        const addEdges = (name: string) => {
          const node = new Node(name);
          nodes.set(name, node);
          A.addNode(node);
          const ast = parse((c.connector._resources[name] as Function).toString())
          console.log(gets(ast))
          for (const dest of gets(ast)) {
            edges.push([name, dest]);
            if (!nodes.has(dest)) {
              addEdges(dest);
            }
          }
        }

        addEdges(resourceName)
        console.log(edges)

        for (const edge of edges) {
          A.addEdge(new Edge([nodes.get(edge[0])!!, nodes.get(edge[1])!!]))
        }

        G.addSubgraph(A)
        const dot = toDot(G)
        console.log(dot)

        await toFile(dot, './result.svg', { format: 'svg' });
        execSync(`open file:///${process.cwd()}/result.svg`)

        this.displayPrompt()
      }
    }
  )


  r.defineCommand('resources',
    {
      action: function() {
        for (const [name,f] of Object.entries(c.connector._resources)) {
          // TODO check type signature
          if (name == "client") {
            continue
          }
          const ast = parse((f as Function).toString())
          //console.log(JSON.stringify(ast))
          //console.log((f as Function).toString())
          console.log(name)
          each(ast, "CallExpression", (node: any) => {
            //console.log(JSON.stringify(node, null, 2))
            const functionName = node.callee.property.name
            if (functionName == "get") {
              //const resourceName = node.arguments[0].property.name
              var resourceName = ""
              if (node.arguments[0].type == "MemberExpression") {
                resourceName = node.arguments[0].property.name
              } else {
                resourceName = node.arguments[0].name
              }
              console.log(`  ➡ "${resourceName}"`)
            } else if (functionName == "store") {
              const resourceName = node.arguments[0].value
              console.log(`  💾 "${resourceName}"`)
            }
          })

        }
        this.displayPrompt();
      }
    }
  )
})()
