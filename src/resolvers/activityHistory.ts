import { CreateActivityHistoryInput } from './../types/CreateActivityHistoryInput';
import { ActivityHistoryMutationResponse } from './../types/ActivityHistoryMutationResponse';
import { Arg, Ctx, Mutation, Resolver, Root, Subscription } from 'type-graphql';
import { Context } from '../types/Context';
import { User } from '../entities/User';
import { ActivityHistory } from '../entities/ActivityHistory';
import { ActivityHistoryPayload } from '../types/ActivityHistoryPayload';
import { publishActivityHistory } from '../utils/pubsub';

@Resolver()
export class ActivityHistoryResolver {
	@Mutation((_return) => ActivityHistoryMutationResponse)
	async createActivityHistory(
		@Arg('createOrderInput')
		createActivityHistoryInput: CreateActivityHistoryInput,
		@Ctx() { user }: Context
	): Promise<ActivityHistoryMutationResponse> {
		const ownerId = user.userId;
		const { type, destinationAddress, destinationUserId, transactionHash, targetOrderId } =
			createActivityHistoryInput;
		const existingUser = await User.findOne({
			where: { id: ownerId },
			relations: ['contract'],
		});
		if (!existingUser) {
			return {
				code: 500,
				success: false,
			};
		}
		const newActivity = ActivityHistory.create({
			owner: {
				id: ownerId,
			},
			destinationAddress,
			type,
			transactionHash,
			destinationUser: {
				id: destinationUserId,
			},
			targetOrder: {
				id: targetOrderId,
			}
		});
		const result = await newActivity.save();
		publishActivityHistory({
			userIds: [destinationUserId],
			activityHistory: result
		})
		return {
			code: 200,
			success: true,
			activityHistory: result,
		};
	}

	@Subscription({
		topics: "ACTIVITY_HISTORY",
		filter: ({ payload, context }) => {
			if(payload?.userIds?.includes(context?.user.userId)) return true;
			return false;
		}
	})
	needToRefreshData(
		@Root() activityHistoryPayload: ActivityHistoryPayload,
	): ActivityHistory {
		return activityHistoryPayload.activityHistory
	}
}
