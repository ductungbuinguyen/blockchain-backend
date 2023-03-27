import { NeedToRefreshData } from '../types/NeedToRefreshData';
import { RegisterMerchantInput } from './../types/RegisterMerchantInput';
import { RegisterInput } from '../types/RegisterInput';
import { Arg, Ctx, ID, Mutation, Query, Resolver, Root, Subscription } from 'type-graphql';
import { User } from '../entities/User';
import argon2 from 'argon2';
import { UserMutationResponse } from '../types/UserMutationResponse';
import { LoginInput } from '../types/LoginInput';
import { createToken, sendRefreshToken } from '../utils/auth';
import { Context } from '../types/Context';
import { MutationResponse } from '../types/MutationResponse';
import { MerchantMetaData } from '../entities/MerchantMetaData';
import { deployECommerceContract, generateMerchantSecretKey } from '../utils/contract';
import { NeedToRefreshDataPayload } from 'src/types/NeedToRefreshData';

@Resolver()
export class UserResolver {

	@Query((_return) => [User])
	async users(): Promise<User[]> {
		return await User.find();
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

	@Mutation((_return) => MutationResponse)
	async registerMerchant(
		@Arg('registerMerchantInput')
		registerMerchantInput: RegisterMerchantInput,
		@Ctx() { user }: Context
	): Promise<MutationResponse> {
		const existingUser = await User.findOne({
			where: { id: user.userId },
			relations: ['contract'],
		});
		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}

		const deployResult = await deployECommerceContract(existingUser.metaMaskPublicKey)
		if(!deployResult) return {
			code: 500,
			success: false,
		}

		const secretKey = generateMerchantSecretKey();

		const existingUserMetadata = MerchantMetaData.create({
			...registerMerchantInput,
			owner: existingUser,
			merchantSecretKey: secretKey,
		})
		const createMetadataResult = await existingUserMetadata.save()
		if(!createMetadataResult) return {
			code: 500,
			success: false,
		}
		return {
			code: 200,
			success: true,
		}
	}

	@Subscription({
		topics: "NEED_TO_REFRESH_DATA",
		filter: ({ payload, context }) => {
			if(payload?.userIds?.includes(context?.user.userId)) return true;
			return false;
		}
	})
	needToRefreshData(
		@Root() needToRefreshDataPayload: NeedToRefreshDataPayload,
	): NeedToRefreshData {
		return {
			type: needToRefreshDataPayload.type,
		}
	}
}
