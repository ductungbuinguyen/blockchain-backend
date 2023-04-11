import { Field, InputType } from "type-graphql";
import { ActivityHistoryType } from "./ActivityHistoryType";

@InputType()
export class CreateActivityHistoryInput {
  @Field({nullable: false})
  type: ActivityHistoryType

  @Field()
  destinationAddress: string

  @Field()
  destinationUserId: number 

  @Field()
  transactionHash: string

  @Field()
  targetOrderId: number
}