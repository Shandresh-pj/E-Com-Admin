import { Injectable, signal, effect } from '@angular/core';
import { AppSettings, defaults } from '../config';

@Injectable({
    providedIn: 'root',
})
export class CoreService {
    private optionsSignal = signal<AppSettings>(defaults);

    // Theme signal: 'light' or 'dark', loaded from local storage (defaults to dark to align with the login screen)
    public themeSignal = signal<'light' | 'dark'>(
        (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
    );

    constructor() {
        // Automatically sync theme signal changes to localStorage and document element classes
        effect(() => {
            const theme = this.themeSignal();
            localStorage.setItem('theme', theme);

            const root = document.documentElement;
            if (theme === 'dark') {
                root.classList.add('dark');
                root.classList.remove('light');
            } else {
                root.classList.add('light');
                root.classList.remove('dark');
            }
        });
    }

    getOptions() {
        return this.optionsSignal();
    }

    setOptions(options: Partial<AppSettings>) {
        this.optionsSignal.update((current) => ({
            ...current,
            ...options,
        }));
    }

    toggleTheme() {
        this.themeSignal.update(t => t === 'light' ? 'dark' : 'light');
    }
}
