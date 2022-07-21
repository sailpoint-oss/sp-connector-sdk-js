import { StdSpecReadInput } from './commands'
import { StdSpecReadOutput } from './commands/std-spec-read'
import { Response } from './response'
import { Context } from './handler'

import { promisify } from 'util'
import { readFile } from 'fs'

const specFilePath = "connector-spec.json"

export const StdSpecReadDefaultHandler = async (_context: Context, _input: StdSpecReadInput, res: Response<StdSpecReadOutput>) => {
	const data = await promisify(readFile)(specFilePath)
	res.send({
		specification: JSON.parse(data.toString())
	})
}
