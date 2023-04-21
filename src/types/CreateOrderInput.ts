import { Field, InputType } from 'type-graphql'

@InputType()
export class CreateOrderInput {
	@Field()
	buyerAddress: string

	@Field()
	price: number

	@Field()
	name: string

	@Field()
	shipDeadline: number

	@Field()
	nonce: number

	@Field()
	signature: string
}
