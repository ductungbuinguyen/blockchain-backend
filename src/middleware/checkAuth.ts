import { AuthenticationError } from 'apollo-server-express'
import { Secret, verify } from 'jsonwebtoken'
import { MiddlewareFn } from 'type-graphql'
import { Context } from '../types/Context'
import { UserAuthPayload } from '../types/UserAuthPayload'

export const checkAuth: MiddlewareFn<Context> = ({ context }, next) => {
	try {
		// console.log("context", context);
		// authHeader here is "Bearer accessToken"
		const authHeader = context.req.header('Authorization')
		const accessToken = authHeader && authHeader.split(' ')[1]
		if (!accessToken)
			throw new AuthenticationError(
				'Not authenticated to perform GraphQL operations'
			)
		const decodedUser = verify(
			accessToken,
			process.env.ACCESS_TOKEN_SECRET as Secret
		) as UserAuthPayload

		context.user = decodedUser

		return next()
	} catch (error) {
		throw new AuthenticationError(
			`Error authenticating user, ${JSON.stringify(error)}`
		)
	}
}

export const getDynamicContextWebSocket = async (ctx: any) => {
	try {
		// console.log("ctx", ctx);
		const auth = ctx.connectionParams.authorization
		// console.log("auth", auth)
		const accessToken = auth && auth.split(' ')[1]
		// console.log("accessToken", accessToken)
		if (!accessToken)
		throw new AuthenticationError(
			'Not authenticated to perform GraphQL operations'
		)
		const decodedUser = verify(
			accessToken,
			process.env.ACCESS_TOKEN_SECRET as Secret
		) as UserAuthPayload
		// console.log("decodedUser", decodedUser)
		return {
			user: decodedUser
		}
	} catch (error) {
		throw new AuthenticationError(
			`Error authenticating user, ${JSON.stringify(error)}`
		)
	}
};
