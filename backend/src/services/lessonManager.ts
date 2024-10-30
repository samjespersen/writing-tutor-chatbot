interface Activity {
    order: number;
    name: string;
    text: string;
    theme: string;
    strategy?: string;
    assessmentCriteria?: string[];
}

interface LessonPlan {
    pedagogy: 'SAFE' | 'MPR';
    lessonPlan: {
        objective: string;
        commonCoreStandards: string[];
        themes: string[];
        activities: Activity[];
    };
}

interface StudentProgress {
    currentLessonIndex: number;
    currentActivityIndex: number;
    completedActivities: {
        lessonIndex: number;
        activityIndex: number;
        response: string;
        botReply?: string;
    }[];
}

export class LessonManager {
    private lessonPlans: LessonPlan[];
    private progress: StudentProgress;

    constructor(lessonPlans: LessonPlan[]) {
        this.lessonPlans = lessonPlans;
        this.progress = {
            currentLessonIndex: 0,
            currentActivityIndex: 0,
            completedActivities: []
        };
    }

    getCurrentState() {
        if (!this.lessonPlans || this.lessonPlans.length === 0) {
            throw new Error('No lesson plans available');
        }

        const currentLesson = this.lessonPlans[this.progress.currentLessonIndex];
        if (!currentLesson) {
            throw new Error(`Invalid lesson index: ${this.progress.currentLessonIndex}`);
        }

        const currentActivity = currentLesson.lessonPlan.activities[this.progress.currentActivityIndex];
        if (!currentActivity) {
            throw new Error(`Invalid activity index: ${this.progress.currentActivityIndex}`);
        }

        return {
            currentLessonPlan: currentLesson,
            currentActivity: currentActivity,
            progressHistory: this.progress.completedActivities,
            isComplete: this.isComplete()
        };
    }

    recordActivity(studentResponse: string, botReply?: string) {
        this.progress.completedActivities.push({
            lessonIndex: this.progress.currentLessonIndex,
            activityIndex: this.progress.currentActivityIndex,
            response: studentResponse,
            botReply: botReply
        });
    }

    advanceToNextActivity() {
        const currentLesson = this.lessonPlans[this.progress.currentLessonIndex];
        if (this.progress.currentActivityIndex < currentLesson.lessonPlan.activities.length - 1) {
            this.progress.currentActivityIndex++;
        } else if (this.progress.currentLessonIndex < this.lessonPlans.length - 1) {
            this.progress.currentLessonIndex++;
            this.progress.currentActivityIndex = 0;
        }
    }

    isComplete(): boolean {
        return (
            this.progress.currentLessonIndex === this.lessonPlans.length - 1 &&
            this.progress.currentActivityIndex === this.lessonPlans[this.progress.currentLessonIndex].lessonPlan.activities.length - 1 &&
            this.progress.completedActivities.some(
                activity => 
                    activity.lessonIndex === this.progress.currentLessonIndex && 
                    activity.activityIndex === this.progress.currentActivityIndex
            )
        );
    }

    // Optional: Add method to serialize/deserialize progress for persistence
    serializeProgress(): string {
        return JSON.stringify(this.progress);
    }

    static deserializeProgress(lessonPlans: LessonPlan[], serializedProgress: string): LessonManager {
        const manager = new LessonManager(lessonPlans);
        manager.progress = JSON.parse(serializedProgress);
        return manager;
    }
}