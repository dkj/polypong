import QRCode from 'qrcode';

export class ShareManager {
    constructor() {
        this.title = 'PolyPongon';
        this.text = 'Check out this awesome pentagon pong game!';
    }

    async share(url, isInvite = false) {
        const shareData = {
            title: this.title,
            text: isInvite ? 'Join my PolyPongon game!' : this.text,
            url: url
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                return { success: true, method: 'native' };
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        }

        // Fallback or manual modal handling will happen in main.js
        return { success: false };
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Clipboard failed:', err);
            return false;
        }
    }

    getSocialLinks(url, isInvite = false) {
        const text = isInvite ? 'Join my PolyPongon game!' : this.text;
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(text);

        return {
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`
        };
    }

    renderQRCode(canvas, url) {
        QRCode.toCanvas(canvas, url, {
            width: 180,
            margin: 2,
            color: {
                dark: '#f8fafc',  // Slate 50
                light: '#020617'  // Slate 950
            }
        }, (error) => {
            if (error) console.error(error);
        });
    }
}
