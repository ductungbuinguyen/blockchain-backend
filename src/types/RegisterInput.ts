import { Field, InputType } from 'type-graphql'
import { Gender } from './Gender'

@InputType()
export class RegisterInput {
	@Field()
	email: string

	@Field()
	password: string

	@Field(() => Gender)
	gender: Gender

	@Field()
	fullName: string

	@Field()
	phoneNumber: string

	@Field()
	identityCode: string

	@Field()
	metaMaskPublicKey: string
}
