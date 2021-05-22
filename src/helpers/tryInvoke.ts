export default function tryInvoke<T>(action: () => T, onError: (error: any) => void): T | null {
    try {
        return action();
    } catch (e) {
        onError(e);
        return null;
    }
}
