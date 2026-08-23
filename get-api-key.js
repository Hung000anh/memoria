(function () {
    'use strict';

    const rawOpen = XMLHttpRequest.prototype.open;
    const rawSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return rawOpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener('load', function () {
            if (this._url && this._url.includes('ListCloudApiKeys')) {
                try {
                    const responseText = this.responseText;
                    const apiKeyRegex = /AIzaSy[A-Za-z0-9_-]{33}/g;
                    const matchedKeys = responseText.match(apiKeyRegex);

                    if (matchedKeys && matchedKeys.length > 0) {
                        const uniqueKeys = [...new Set(matchedKeys)].map((key, index) => ({
                            name: `API Key ${index + 1}`,
                            key: key
                        }));

                        const urlParams = new URLSearchParams(window.location.search);
                        const autoClose = urlParams.get('close_by_memoria') === '1';

                        window.postMessage({
                            type: 'MEMORIA_FETCHED_KEYS',
                            keys: uniqueKeys,
                            autoClose: autoClose
                        }, '*');
                    }
                } catch (e) {
                    console.error('[GetAPIKey] Error responseText:', e);
                }
            }
        });
        return rawSend.call(this, body);
    };

    console.log('[GetAPIKey MAIN] Ready!');
})();