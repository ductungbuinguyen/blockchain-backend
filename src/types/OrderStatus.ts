import { registerEnumType } from "type-graphql";

export enum OrderStatus {
  CREATED = "CREATED",
  PAID = "PAID",
  SHIPPING = "SHIPPING",
  CONFIRMED = "CONFIRMED",
  CANCELED = "CANCELED",
}

registerEnumType(OrderStatus, {
  name: "OrderStatus",
  description: "The order status",
});