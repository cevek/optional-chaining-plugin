declare global {
    interface Object {
        orUndefined<T>(this: T): T | undefined;
    }
}
export {};
