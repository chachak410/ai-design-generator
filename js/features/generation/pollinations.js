// js/features/generation/pollinations.js
const Pollinations = {
    async generate(prompt, referenceImage, options = {}) {
        const { timeout = 120000 } = options;
        const controller = new AbortController();
        const signal = controller.signal;

        const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn('Pollinations API request timed out after', timeout, 'ms');
            throw new Error('Fetch is aborted due to timeout');
        }, timeout);

        try {
            let basePrompt = prompt;
            if (referenceImage) {
                basePrompt += ' based on uploaded reference image';
            }

            const encodedPrompt = encodeURIComponent(basePrompt);

            const params = new URLSearchParams({
                model: 'flux',
                width: '1024',
                height: '1024',
                seed: 'random',
                nologo: 'true',
                enhance: 'true'
            });

            const url1 = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}&seed=1`;
            const url2 = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}&seed=2`;

            console.log('Sending Pollinations API requests:', { prompt: basePrompt, urls: [url1, url2] });

            const [res1, res2] = await Promise.all([
                fetch(url1, { signal }),
                fetch(url2, { signal })
            ]);

            clearTimeout(timeoutId);

            if (!res1.ok || !res2.ok) {
                const errorDetails = {
                    status1: res1.status,
                    status2: res2.status,
                    statusText1: res1.statusText,
                    statusText2: res2.statusText
                };
                console.error('Pollinations API error:', errorDetails);
                if (res1.status === 522 || res2.status === 522) {
                    throw new Error('Server timeout (522): Pollinations API is temporarily unavailable');
                }
                throw new Error(`HTTP ${res1.status || res2.status}: ${res1.statusText || res2.statusText}`);
            }

            const buffer1 = await res1.arrayBuffer();
            const buffer2 = await res2.arrayBuffer();

            const image1 = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buffer1)))}`;
            const image2 = `data:image/png;base64,${btoa(String.fromCharCode(...new Uint8Array(buffer2)))}`;

            console.log('Pollinations API success: Images generated');

            return {
                images: [image1, image2]
            };
        } catch (err) {
            clearTimeout(timeoutId);
            console.error('Pollinations generation failed:', err.message, { prompt, referenceImage: !!referenceImage });
            if (err.name === 'AbortError') {
                throw new Error('Fetch is aborted');
            }
            if (err.message.includes('522')) {
                throw new Error('API server temporarily unavailable (Code 522). Please try again in a few minutes.');
            }
            throw err;
        }
    }
};

window.ImageGenerator = window.ImageGenerator || {};
window.ImageGenerator.generate = Pollinations.generate;