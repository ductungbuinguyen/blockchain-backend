import { Field, InputType } from "type-graphql";

@InputType()
export class InformationForCreateOrderInput {
  @Field()
  buyerEmail: string
}