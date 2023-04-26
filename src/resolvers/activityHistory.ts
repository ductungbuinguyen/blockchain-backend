import { CreateActivityHistoryInput } from './../types/CreateActivityHistoryInput';
import { ActivityHistoryMutationResponse } from './../types/ActivityHistoryMutationResponse';
import {
	Arg,
	Ctx,
	Mutation,
	Resolver,
	Root,
	Subscription,
	UseMiddleware,
} from 'type-graphql';
import { Context } from '../types/Context';
import { User } from '../entities/User';
import { ActivityHistory } from '../entities/ActivityHistory';
import { ActivityHistoryPayload } from '../types/ActivityHistoryPayload';
import { publishActivityHistory } from '../utils/pubsub';
import { checkAuth } from '../middleware/checkAuth';

@Resolver()
export class ActivityHistoryResolver {
	@Mutation((_return) => ActivityHistoryMutationResponse)
	@UseMiddleware(checkAuth)
	async createActivityHistory(
		@Arg('createActivityHistoryInput')
		createActivityHistoryInput: CreateActivityHistoryInput,
		@Ctx() { user }: Context
	): Promise<ActivityHistoryMutationResponse> {
		const senderId = user.userId;
		const {
			type,
			destinationAddress,
			destinationUserId,
			transactionHash,
			amount,
		} = createActivityHistoryInput;
		const existingUser = await User.findOne({
			where: { id: senderId },
		});
		if (!existingUser) {
			return {
				code: 500,
				success: false,
			};
		}
		const newActivity = ActivityHistory.create({
			sender: {
				id: senderId,
			},
			type,
			amount,
			transactionHash,
			...(destinationUserId
				? {
						receiver: {
							id: destinationUserId,
						},
				  }
				: {
						receiverAddress: destinationAddress,
				  }),
		});
		const result = await newActivity.save();
		const newActivityWithRelations = await ActivityHistory.findOne(result.id, {
			relations: ['sender', 'receiver'],
		});
		if (!newActivityWithRelations)
			return {
				code: 500,
				success: false,
			};
		if(destinationUserId) {
			publishActivityHistory({
				userIds: [destinationUserId],
				activityHistory: newActivityWithRelations,
			});
		}
		return {
			code: 200,
			success: true,
			activityHistory: newActivityWithRelations,
		};
	}

	@Subscription({
		topics: 'ACTIVITY_HISTORY',
		filter: ({ payload, context }) => {
			console.log('payload', payload);
			console.log('context', context);
			const checker = payload?.userIds?.includes(context?.user.userId);
			console.log('checker', checker);
			if (checker) return true;
			return false;
		},
	})
	activityHistory(
		@Root() activityHistoryPayload: ActivityHistoryPayload
	): ActivityHistory {
		console.log("activityHistoryPayload",activityHistoryPayload.activityHistory)
		return activityHistoryPayload.activityHistory;
	}
}
