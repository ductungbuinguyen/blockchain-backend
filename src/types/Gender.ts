import { registerEnumType } from "type-graphql";

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

registerEnumType(Gender, {
  name: "Gender",
  description: "The basic genders",
});
