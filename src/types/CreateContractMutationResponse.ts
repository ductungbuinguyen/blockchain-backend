import { Contract } from './../entities/Contract';
import { Field, ObjectType } from 'type-graphql'
import { IMutationResponse } from './MutationResponse'

@ObjectType({ implements: IMutationResponse })
export class CreateContractMutationResponse implements IMutationResponse {
	code: number
	success: boolean
	message?: string

	@Field({ nullable: true })
	contract?: Contract
}
