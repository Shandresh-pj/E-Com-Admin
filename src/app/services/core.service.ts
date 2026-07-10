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
        // Automatically sync theme signal changes to localStorage, document element, and body classes
        effect(() => {
            const theme = this.themeSignal();
            localStorage.setItem('theme', theme);

            const root = document.documentElement;
            const body = document.body;
            root.setAttribute('data-theme', theme);
            root.style.colorScheme = theme;

            if (theme === 'dark') {
                root.classList.add('dark', 'dark-theme');
                root.classList.remove('light', 'light-theme');
                body.classList.add('dark', 'dark-theme');
                body.classList.remove('light', 'light-theme');
            } else {
                root.classList.add('light', 'light-theme');
                root.classList.remove('dark', 'dark-theme');
                body.classList.add('light', 'light-theme');
                body.classList.remove('dark', 'dark-theme');
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
