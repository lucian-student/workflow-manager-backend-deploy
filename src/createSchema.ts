import { buildSchema, } from "type-graphql";
import { PubSub } from "graphql-subscriptions";


const pubsub = new PubSub();

const createSchema = () => {
    return buildSchema({
        resolvers: [
            __dirname + '/modules/**/!(*.test).js'
        ],
        pubSub: pubsub
    });
}




export default createSchema;