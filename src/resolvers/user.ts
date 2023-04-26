import { RegisterMerchantInput } from './../types/RegisterMerchantInput';
import { RegisterInput } from '../types/RegisterInput';
import {
	Arg,
	Ctx,
	ID,
	Mutation,
	Query,
	Resolver,
	UseMiddleware,
} from 'type-graphql';
import { User } from '../entities/User';
import argon2 from 'argon2';
import { UserMutationResponse } from '../types/UserMutationResponse';
import { LoginInput } from '../types/LoginInput';
import { createToken, sendRefreshToken } from '../utils/auth';
import { Context } from '../types/Context';
import { MerchantMetaData } from '../entities/MerchantMetaData';
import { generateMerchantSecretKey } from '../utils/contract';
import { checkAuth } from '../middleware/checkAuth';
import { MerchantMutationResponse } from '../types/MerchantMutationResponse';
import { UserInfoMetaData } from '../types/UserInfoMetaData';

@Resolver()
export class UserResolver {
	@Query((_return) => [User])
	@UseMiddleware(checkAuth)
	async users(): Promise<User[]> {
		return await User.find();
	}

	@Query((_return) => UserInfoMetaData)
	@UseMiddleware(checkAuth)
	async user(@Ctx() { user }: Context): Promise<UserInfoMetaData | undefined> {
		const currentUser = await User.findOne({
			where: { id: user.userId },
			relations: [
				'contract',
				'contract.activityHistory',
				'contract.activityHistory.targetContract',
				'contract.orders',
				'contract.orders.buyer',
				'contract.orders.activityHistories',
				'merchantMetaData',
				'ordersAsBuyer',
				'ordersAsBuyer.activityHistories',
				'ordersAsBuyer.activityHistories.targetOrder',
				'ordersAsBuyer.contract',
				'ordersAsBuyer.contract.seller',
				'ordersAsBuyer.contract.seller.merchantMetaData',
				'activityHistoriesAsSender',
				'activityHistoriesAsSender.sender',
				'activityHistoriesAsSender.receiver',
				'activityHistoriesAsReceiver',
				'activityHistoriesAsReceiver.sender',
				'activityHistoriesAsReceiver.receiver',
			],
		});
		if (!currentUser) return undefined;
		const {
			activityHistoriesAsReceiver,
			activityHistoriesAsSender,
			base64Avatar,
			contract,
			email,
			id,
			merchantMetaData,
			metaMaskPublicKey,
			ordersAsBuyer,
			fullName,
			gender,
			identityCode,
			phoneNumber,
		} = currentUser;
		return {
			activityHistoriesAsReceiver,
			activityHistoriesAsSender,
			base64Avatar,
			contract,
			email,
			id,
			merchantMetaData,
			metaMaskPublicKey,
			ordersAsBuyer,
			fullName,
			gender,
			identityCode,
			phoneNumber,
		};
	}

	@Mutation((_return) => UserMutationResponse)
	async register(
		@Arg('registerInput')
		registerInput: RegisterInput
	): Promise<UserMutationResponse> {
		const { email, password, ...rest } = registerInput;

		const existingUser = await User.findOne({ email });

		if (existingUser) {
			return {
				code: 400,
				success: false,
				message: 'Duplicated email',
			};
		}

		const hashedPassword = await argon2.hash(password);

		const newUser = User.create({
			email,
			password: hashedPassword,
			...rest,
		});

		await newUser.save();

		return {
			code: 200,
			success: true,
			message: 'User registration successful',
			user: newUser,
		};
	}

	@Mutation((_return) => UserMutationResponse)
	async login(
		@Arg('loginInput') { email, password }: LoginInput,
		@Ctx() { res }: Context
	): Promise<UserMutationResponse> {
		const existingUser = await User.findOne({ email });
		console.log("existingUser", existingUser)

		if (!existingUser) {
			return {
				code: 400,
				success: false,
				message: 'User not found',
			};
		}

		const isPasswordValid = await argon2.verify(
			existingUser.password,
			password
		);

		console.log("isPasswordValid", isPasswordValid)

		if (!isPasswordValid) {
			return {
				code: 400,
				success: false,
				message: 'Incorrect password',
			};
		}

		sendRefreshToken(res, existingUser);

		return {
			code: 200,
			success: true,
			message: 'Logged in successfully',
			user: existingUser,
			accessToken: createToken('accessToken', existingUser),
		};
	}

	@Mutation((_return) => UserMutationResponse)
	async logout(
		@Arg('userId', (_type) => ID) userId: number,
		@Ctx() { res }: Context
	): Promise<UserMutationResponse> {
		const existingUser = await User.findOne(userId);

		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}

		existingUser.tokenVersion += 1;

		await existingUser.save();

		res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME as string, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/refresh_token',
		});

		return { code: 200, success: true };
	}

	@Mutation((_return) => MerchantMutationResponse)
	@UseMiddleware(checkAuth)
	async registerMerchant(
		@Arg('registerMerchantInput')
		registerMerchantInput: RegisterMerchantInput,
		@Ctx() { user }: Context
	): Promise<MerchantMutationResponse> {
		const existingUser = await User.findOne({
			where: { id: user.userId },
			relations: ['contract'],
		});
		console.log('existingUser register merchant', existingUser);
		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}

		const secretKey = generateMerchantSecretKey();

		const existingUserMetadata = MerchantMetaData.create({
			...registerMerchantInput,
			owner: existingUser,
			merchantSecretKey: secretKey,
		});
		const createMetadataResult = await existingUserMetadata.save();
		console.log('createMetadataResult', createMetadataResult);
		if (!createMetadataResult)
			return {
				code: 500,
				success: false,
			};
		return {
			code: 200,
			success: true,
			merchantMetaData: createMetadataResult,
		};
	}
}
