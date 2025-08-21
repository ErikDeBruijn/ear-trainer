// services/storageService.js

const KEY = "eartrainer_v01";

function getTodayString() {
    return new Date().toDateString();
}

class StorageService {
    load() { 
        try { 
            return JSON.parse(localStorage.getItem(KEY)) || {}; 
        } catch { 
            return {}; 
        } 
    }
    
    save(data) { 
        localStorage.setItem(KEY, JSON.stringify(data)); 
    }
    
    getDailyPracticeTime() {
        const data = this.load();
        const today = getTodayString();
        
        if (data.practiceDate !== today) {
            // New day, reset practice time
            return 0;
        }
        
        return data.dailyPracticeTime || 0;
    }
    
    addDailyPracticeTime(additionalSeconds) {
        const data = this.load();
        const today = getTodayString();
        
        let currentTime = 0;
        if (data.practiceDate === today) {
            currentTime = data.dailyPracticeTime || 0;
        }
        
        this.save({
            ...data,
            practiceDate: today,
            dailyPracticeTime: currentTime + additionalSeconds
        });
    }

    // Settings management
    getSettings() {
        const data = this.load();
        return data.settings || {};
    }
    
    saveSettings(settings) {
        const data = this.load();
        this.save({
            ...data,
            settings: { ...data.settings, ...settings }
        });
    }
    
    // Device selection persistence
    getMidiInputs() {
        const settings = this.getSettings();
        return settings.midiInputs || [];
    }
    
    saveMidiInputs(inputIds) {
        this.saveSettings({ midiInputs: inputIds });
    }
    
    getMidiOutputs() {
        const settings = this.getSettings();
        return settings.midiOutputs || [];
    }
    
    saveMidiOutputs(outputIds) {
        this.saveSettings({ midiOutputs: outputIds });
    }
}

// Export singleton instance
export const storageService = new StorageService();