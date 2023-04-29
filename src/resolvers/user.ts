import { uploadToS3Bucket } from './../utils/s3';
import { UpdatePasswordInput } from './../types/UpdatePasswordInput';
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
import { generateRandomKey } from '../utils/contract';
import { checkAuth } from '../middleware/checkAuth';
import { MerchantMutationResponse } from '../types/MerchantMutationResponse';
import { UserInfoMetaData } from '../types/UserInfoMetaData';
import { UpdateUserInfoInput } from '../types/UpdateUserInfoInput';
import { UpdateUserMerchantMetadataInput } from '../types/UpdateUserMerchantMetadataInput';
import { MerchantMetadataMutationResponse } from '../types/MerchantMetadataMutationResponse';
import { MutationResponse } from '../types/MutationResponse';
import { UserInfoMetaDataMutationResponse } from '../types/UserInfoMetaDataMutationResponse';

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
		console.log("currentUser", currentUser)
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

	@Mutation((_return) => UserInfoMetaDataMutationResponse)
	@UseMiddleware(checkAuth)
	async updateUserInfo(
		@Arg('updateUserInfoInput')
		updateUserInfoInput: UpdateUserInfoInput,
		@Ctx() { user }: Context
	): Promise<UserInfoMetaDataMutationResponse> {
		const { email, fullName, gender, identityCode, phoneNumber, base64Avatar } = updateUserInfoInput
		const existingUser = await User.findOne({
			where: { id: user.userId },
		});
		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}
		existingUser.email = email ? email : existingUser?.email;
		existingUser.fullName = fullName ? fullName : existingUser?.fullName,
		existingUser.gender = gender ? gender : existingUser?.gender,
		existingUser.identityCode = identityCode ? identityCode : existingUser?.identityCode,
		existingUser.phoneNumber = phoneNumber ? phoneNumber : existingUser?.phoneNumber
		existingUser.base64Avatar = await uploadToS3Bucket(base64Avatar)
		console.log("link", existingUser.base64Avatar)
		
		const result = await User.save(existingUser)
		if(!result) return {
			code: 400,
			success: false,
		};
		return {
			code: 200,
			success: true,
			user: result
		}
	}

	@Mutation((_return) => MerchantMetadataMutationResponse)
	@UseMiddleware(checkAuth)
	async updateUserMerchantMetadata(
		@Arg('updateUserMerchantMetadataInput')
		updateUserMerchantMetadataInput: UpdateUserMerchantMetadataInput,
		@Ctx() { user }: Context
	): Promise<MerchantMetadataMutationResponse> {
		const { businessField, companyIdentify, companyName, note, storeLocation, websiteUrl } = updateUserMerchantMetadataInput
		const existingUser = await User.findOne({
			where: { id: user.userId },
			relations: ['merchantMetaData']
		});
		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}
		const merchantMetaData = await MerchantMetaData.findOne({
			where: { id: existingUser.merchantMetaData.id },
		})
		if(!merchantMetaData) return {
			code: 400,
			success: false,
		};
		merchantMetaData.businessField = businessField ? businessField : merchantMetaData.businessField
		merchantMetaData.companyName = companyName ? companyName : merchantMetaData.companyName
		merchantMetaData.companyIdentify = companyIdentify ? companyIdentify : merchantMetaData.companyIdentify
		merchantMetaData.storeLocation = storeLocation ? storeLocation : merchantMetaData.storeLocation
		merchantMetaData.websiteUrl = websiteUrl ? websiteUrl : merchantMetaData.websiteUrl
		merchantMetaData.note = note ? note : merchantMetaData.note
		
		const result = await MerchantMetaData.save(merchantMetaData)
		if(!result) return {
			code: 400,
			success: false,
		};
		return {
			code: 200,
			success: true,
			merchantMetaData: result
		}
	}

	@Mutation((_return) => MutationResponse)
	@UseMiddleware(checkAuth)
	async updatePassword(
		@Arg('updatePasswordInput')
		updatePasswordInput: UpdatePasswordInput,
		@Ctx() { user }: Context
	): Promise<MutationResponse> {
		const { newPassword, oldPassword, reEnterNewPassword } = updatePasswordInput
		const existingUser = await User.findOne({
			where: { id: user.userId },
		});
		if (!existingUser) {
			return {
				code: 400,
				success: false,
			};
		}

		if(newPassword !== reEnterNewPassword) {
			return {
				code: 400,
				success: false,
			}
		}
		const isPasswordValid = await argon2.verify(
			existingUser.password,
			oldPassword
		);
		if(!isPasswordValid) return {
			code: 400,
			success: false
		}
		const hashedPassword = await argon2.hash(newPassword)
		existingUser.password = hashedPassword
		const result = User.save(existingUser)
		if(!result) return {
			code: 500,
			success: false
		}
		return {
			code: 200,
			success: true,
		}
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
	@UseMiddleware(checkAuth)
	async logout(
		@Ctx() { res, user }: Context
	): Promise<UserMutationResponse> {
		const existingUser = await User.findOne(user?.userId);

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

		const secretKey = generateRandomKey();

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
