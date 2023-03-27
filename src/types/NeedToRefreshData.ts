import { ObjectType, Field } from "type-graphql";
import { NeedToRefreshDataType } from "./NeedToRefreshDataType";

@ObjectType()
export class NeedToRefreshData {
  @Field()
  type: NeedToRefreshDataType
}

export interface NeedToRefreshDataPayload {
  type: NeedToRefreshDataType,
  userIds: number[];
}
