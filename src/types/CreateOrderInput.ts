import { Field, InputType } from 'type-graphql'

@InputType()
export class CreateOrderInput {
	@Field()
	sellerEmail: string

	@Field()
	buyerEmail: string

	@Field()
	price: number

	@Field()
	shipDeadlineAmount: number

	@Field()
	nonce: number

	@Field()
	signature: string
}
