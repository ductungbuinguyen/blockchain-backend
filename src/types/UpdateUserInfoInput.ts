import { Field, InputType } from "type-graphql";
import { Gender } from "./Gender";

@InputType()
export class UpdateUserInfoInput {
  @Field()
	email: string

  @Field(() => Gender)
	gender: Gender

	@Field()
	fullName: string

	@Field()
	phoneNumber: string

	@Field()
	identityCode: string

	@Field()
	base64Avatar: string
}