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
        const currentLesson = this.lessonPlans[this.progress.currentLessonIndex];
        const currentActivity = currentLesson.lessonPlan.activities[this.progress.currentActivityIndex];

        return {
            currentLessonPlan: currentLesson,
            currentActivity: currentActivity,
            progressHistory: this.progress.completedActivities,
            isComplete: this.isComplete()
        };
    }

    recordActivity(studentResponse: string) {
        this.progress.completedActivities.push({
            lessonIndex: this.progress.currentLessonIndex,
            activityIndex: this.progress.currentActivityIndex,
            response: studentResponse
        });

        // Move to next activity or lesson
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