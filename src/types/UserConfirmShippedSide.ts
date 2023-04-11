import { registerEnumType } from "type-graphql";

export enum UserConfirmShippedSide {
  SELLER = "SELLER",
  BUYER = "BUYER",
}

registerEnumType(UserConfirmShippedSide, {
  name: "UserConfirmShippedSide",
  description: "merchant or seller call confirm shipped",
});