import MyContext from "../types/MyContext";
import { MiddlewareFn } from "type-graphql";

const checkIfTeamOwner: MiddlewareFn<MyContext> = ({ context, args }, next) => {

    const role = context.payload.role;

    if (role) {
        if (role !== 1) {
            throw Error('Access denied! You dont have permission to perform this action!');
        }
    }
    return next();
}

export default checkIfTeamOwner;