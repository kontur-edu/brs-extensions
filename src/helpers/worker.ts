export default interface Worker{
    run: () => void;
    cancel: () => void;
    onFinished?: <TResult>(result: TResult) => void;
}
