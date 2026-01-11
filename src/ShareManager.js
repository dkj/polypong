import QRCode from 'qrcode';

export class ShareManager {
    constructor() {
        this.title = 'Polypongon';
        this.text = 'For your consideration, I am sharing this polygon pong game.';
    }

    getShareText(game, isInvite = false) {
        if (game && game.hasPlayed && (game.gameState === 'SCORING' || game.gameState === 'TERMINATED')) {
            const isMulti = game.mode === 'online';
            const subject = isMulti ? 'We' : 'I';
            let text = `${subject} survived ${game.finalTime} seconds with a score of ${game.lastScore} !`;
            if (isMulti) text += ' Join us at';
            return text;
        }
        return isInvite
            ? 'Care to join us for our imminent game of Polypongon? Join us at'
            : this.text;
    }

    async share(url, isInvite = false, customText = null) {
        const shareData = {
            title: this.title,
            text: customText || this.getShareText(window.game, isInvite),
            url: url
        };

        const canUseNative = navigator.share && (!navigator.canShare || navigator.canShare(shareData));

        if (canUseNative) {
            try {
                await navigator.share(shareData);
                return { success: true, method: 'native' };
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                }
            }
        }

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

    getSocialLinks(url, isInvite = false, customText = null) {
        const text = customText || this.getShareText(window.game, isInvite);
        const encodedUrl = encodeURIComponent(url);
        const encodedText = encodeURIComponent(text);

        return {
            twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
            bluesky: `https://bsky.app/intent/compose?text=${encodedText}%20${encodedUrl}`,
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
