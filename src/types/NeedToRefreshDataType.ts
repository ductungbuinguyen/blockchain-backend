import { registerEnumType } from "type-graphql";

export enum NeedToRefreshDataType {
  CONTRACT = "CONTRACT",
  ORDER = "ORDER",
}

registerEnumType(NeedToRefreshDataType, {
  name: "NeedToRefreshDataType",
});