import { ObjectType, Field, ID } from "type-graphql"
import { Entity, BaseEntity, PrimaryGeneratedColumn, Column, OneToOne, OneToMany } from "typeorm"
import { User } from "./User"
import { ActivityHistory } from "./ActivityHistory"
import { Order } from "./Order"

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

	@Field(() => [Order])
	@OneToMany(() => Order, (order) => order.contract)
	orders: Order[]

	@Field(() => ActivityHistory)
	@OneToOne(() => ActivityHistory, (activityHistory) => activityHistory.targetContract)
  activityHistory: ActivityHistory
}