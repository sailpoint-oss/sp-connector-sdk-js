import { StdSpecReadInput } from './commands'
import { StdSpecReadOutput } from './commands/std-spec-read'
import { Response } from './response'
import { Context } from './connector-handler'

import { promisify } from 'util'
import { readFile, existsSync } from 'fs'
import path from 'path'

const specFilePath = 'connector-spec.json'

export const StdSpecReadDefaultHandler = async (
	_context: Context,
	_input: StdSpecReadInput,
	res: Response<StdSpecReadOutput>
) => {
	// Read from CWD if exists, otherwise check if it is in the same directory as this file
	if (existsSync(specFilePath)) {
		const data = await promisify(readFile)(specFilePath)
		res.send({
			specification: JSON.parse(data.toString()),
		})
	} else {
		const data = await promisify(readFile)(path.join(__dirname, specFilePath))
		res.send({
			specification: JSON.parse(data.toString()),
		})
	}
}
