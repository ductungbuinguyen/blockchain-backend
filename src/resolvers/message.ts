import { InputType, ObjectType, Field, Resolver, Query, Subscription, Root } from 'type-graphql';
import 'reflect-metadata';

@ObjectType()
export class Message {
    @Field(_type => Number)
    id: Number = 0
    @Field(_type => String)
    content: String = ""
};

@InputType()
export class MessageInput {
    @Field(_type => Number)
    id: Number = 0
    @Field(_type => String)
    content: String = ""
};

@Resolver(Message)
export class MessageResolver {
    @Query(_returns => [Message])
    messages(): Message[] {
        return [
            { id: 0, content: 'Hello!' },
            { id: 1, content: 'Bye!' },
        ];
    }

    @Subscription(_returns => Message, {
        topics: "MESSAGE_CREATED"
    })
    messageCreated(
        @Root() payload : any
    ): Message {
        console.log("messageCreated():-", payload);
        return payload.messageCreated;
    }
};
