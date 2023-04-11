import { Order } from '../entities/Order';
import { Field, ObjectType } from 'type-graphql'
import { IMutationResponse } from './IMutationResponse'

@ObjectType({ implements: IMutationResponse })
export class CreateOrderMutationResponse implements IMutationResponse {
	code: number
	success: boolean
	message?: string

	@Field({ nullable: true })
	order?: Order
}