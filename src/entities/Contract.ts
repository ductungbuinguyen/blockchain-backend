import { ObjectType, Field, ID } from "type-graphql"
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, OneToOne } from "typeorm"
import { User } from "./User"

@ObjectType()
@Entity()
export class Contract extends BaseEntity {
  @Field(_type => ID)
	@PrimaryGeneratedColumn()
	id!: number

  @Field()
	@Column({ unique: true })
	address!: string

	@Field(() => User)
	@OneToOne(() => User, (user) => user.contract)
  seller!: User
  
}