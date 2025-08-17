// js/storage.js
const KEY = "eartrainer_v01";

function getTodayString() {
    return new Date().toDateString();
}

export const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } },
    save(data) { localStorage.setItem(KEY, JSON.stringify(data)); },
    
    getDailyPracticeTime() {
        const data = this.load();
        const today = getTodayString();
        
        if (data.practiceDate !== today) {
            // New day, reset practice time
            return 0;
        }
        
        return data.dailyPracticeTime || 0;
    },
    
    saveDailyPracticeTime(seconds) {
        const data = this.load();
        const today = getTodayString();
        
        this.save({
            ...data,
            practiceDate: today,
            dailyPracticeTime: seconds
        });
    }
};