import { AttributeChangeOp, StdAccountUpdateInput } from './std-account-update'

describe('account update input deserialization', () => {
	it('should deserialize to AttributeChangeOp', () => {
		const jsonRaw =
			'{"identity":"john.doe","changes":[{"op":"Add","attribute":"groups","value":["Group1","Group2"]},{"op":"Set","attribute":"phone","value":2223334444},{"op":"Remove","attribute":"location"}]}'

		const input: StdAccountUpdateInput = JSON.parse(jsonRaw)

		expect(input.identity).toStrictEqual('john.doe')
		expect(input.changes[0]?.op).toStrictEqual(AttributeChangeOp.Add)
		expect(input.changes[1]?.op).toStrictEqual(AttributeChangeOp.Set)
		expect(input.changes[2]?.op).toStrictEqual(AttributeChangeOp.Remove)
	})

	it('invalid AttributeChange op should not deserialize to enum', () => {
		const jsonRaw =
			'{"identity":"john.doe","changes":[{"op":"****","attribute":"groups","value":["Group1","Group2"]}]}'

		const input: StdAccountUpdateInput = JSON.parse(jsonRaw)

		expect(input.changes[0]?.op).toStrictEqual('****')
	})
})
