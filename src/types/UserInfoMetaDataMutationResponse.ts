import { Field, ObjectType } from 'type-graphql'
import { IMutationResponse } from './IMutationResponse'
import { UserInfoMetaData } from './UserInfoMetaData'

@ObjectType({ implements: IMutationResponse })
export class UserInfoMetaDataMutationResponse implements IMutationResponse {
	code: number
	success: boolean
	message?: string

	@Field({ nullable: true })
	user?: UserInfoMetaData

	@Field({ nullable: true })
	accessToken?: string
}
