import { registerEnumType } from "type-graphql";

export enum ActivityHistoryType {
  TRANSFER_MONEY = "TRANSFER_MONEY",
  REGISTER_MERCHANT = "REGISTER_MERCHANT",
  CREATE_ORDER = "CREATE_ORDER",
  PAY_ORDER = "PAY_ORDER",
  SHIP_ORDER = "SHIP_ORDER",
  BUYER_CONFIRM_ORDER_SHIPPED = "BUYER_CONFIRM_ORDER_SHIPPED",
  SELLER_CONFIRM_ORDER_SHIPPED = "SELLER_CONFIRM_ORDER_SHIPPED",
  TIME_OUT_ORDER = "TIME_OUT_ORDER",
  ORDER_COMPLETED = "ORDER_COMPLETED",
}

registerEnumType(ActivityHistoryType, {
  name: "ActivityHistoryType",
  description: "Activity History Type",
});