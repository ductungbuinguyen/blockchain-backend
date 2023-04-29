import { Field, InputType } from "type-graphql";

@InputType()
export class UpdatePasswordInput {
  @Field()
  oldPassword: string

  @Field()
  newPassword: string

  @Field()
  reEnterNewPassword: string
}