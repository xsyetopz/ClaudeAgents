export { ItemService, createItemService } from "./service";
export type { ItemRepository } from "./service";

export type {
    Config,
    CreateItemInput,
    Item,
    PaginatedResponse,
    PaginationParams,
    UpdateItemInput,
} from "./types";

export { FeatureError, InvalidInputError, ItemNotFoundError, isItem } from "./types";
