window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    if (event.data.type === 'MEMORIA_FETCHED_KEYS') {
        const keysList = event.data.keys;
        const autoClose = event.data.autoClose;

        chrome.storage.local.set({ geminiKeys: keysList }, () => {
            console.log('[GetAPIKey Bridge] Loaded Gemini keys: ', keysList.length, 'List keys:', keysList);
            if (autoClose && keysList.length > 0) {
                console.log('[GetAPIKey Bridge] Close as getting keys completely!');
                window.close();
            }
        });
    }
});