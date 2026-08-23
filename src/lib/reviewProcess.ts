import { WenBunCustomState } from "./app";

export type AutomaticSuccessReviewActions = {
    isExtraStudy: boolean;
    cardState: WenBunCustomState | undefined;
    isFinalWarmUp: boolean;
    isGradeWarmUpCards: boolean;
    onStartWarmUp: () => void | Promise<void>;
    onAdvanceWarmUp: () => void | Promise<void>;
    onFinishWarmUp: () => void | Promise<void>;
    onExtraStudyGood: () => void | Promise<void>;
    onAcceptGrade: () => void | Promise<void>;
};

export async function handleAutomaticSuccess({
    isExtraStudy,
    cardState,
    isFinalWarmUp,
    isGradeWarmUpCards,
    onStartWarmUp,
    onAdvanceWarmUp,
    onFinishWarmUp,
    onExtraStudyGood,
    onAcceptGrade,
}: AutomaticSuccessReviewActions): Promise<void> {
    console.log({isExtraStudy, cardState})
    if (isExtraStudy) {
        await onExtraStudyGood();
    } else if (cardState === WenBunCustomState.New) {
        await onStartWarmUp();
    } else if (cardState === WenBunCustomState.WarmUp && !isFinalWarmUp) {
        await onAdvanceWarmUp();
    } else if (cardState === WenBunCustomState.WarmUp && !isGradeWarmUpCards) {
        await onFinishWarmUp();
    } else {
        await onAcceptGrade();
    }
}
