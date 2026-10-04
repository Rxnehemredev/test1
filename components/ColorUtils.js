/**
 * Extracts the average dominant color from an image element using Canvas.
 * Safe against CORS issues - returns null if the canvas gets tainted.
 * 
 * @param {HTMLImageElement} imgElement The image element to extract color from.
 * @returns {Array|null} RGB array [r, g, b] or null if extraction fails.
 */
export function getDominantColor(imgElement) {
    if (!imgElement || !imgElement.complete || imgElement.naturalWidth === 0) {
        return null; // Not loaded or invalid
    }

    try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return null;

        // Scale down the image for extremely fast sampling
        canvas.width = 64; 
        canvas.height = 64;
        
        context.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

        // This will throw a DOMException if the image violates CORS
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            // Ignore completely transparent pixels
            if (data[i + 3] === 0) continue; 
            
            // Ignore completely black or white pixels (too dominant in manga/UI)
            const sum = data[i] + data[i+1] + data[i+2];
            if (sum < 30 || sum > 730) continue;

            r += data[i];
            g += data[i+1];
            b += data[i+2];
            count++;
        }

        if (count === 0) return null; // No meaningful color found

        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);

        return [r, g, b];
    } catch (e) {
        // Tainted canvas (CORS error) or other error
        return null;
    }
}

/**
 * Returns a CSS hex/rgb string from an RGB array format depending on needs
 */
export function rgbToCss(rgb) {
    if (!rgb) return null;
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function generateAdaptivePalette(rgb) {
    if (!rgb) return null;
    
    // We boost the base for an "accent" look slightly
    const boost = (val) => Math.min(255, val + 20);
    const accent = `rgb(${boost(rgb[0])}, ${boost(rgb[1])}, ${boost(rgb[2])})`;
    
    // A much brighter version for "light accent" text/icons
    const boostLight = (val) => Math.min(255, val + 70);
    const accentLight = `rgb(${boostLight(rgb[0])}, ${boostLight(rgb[1])}, ${boostLight(rgb[2])})`;
    
    return {
        accent,
        accentLight,
        accentGlow: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15)`,
        gradientHero: `linear-gradient(180deg, rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.15) 0%, transparent 60%)`,
        gradientPrimary: `linear-gradient(135deg, rgba(${Math.max(0, rgb[0]-30)}, ${Math.max(0, rgb[1]-30)}, ${Math.max(0, rgb[2]-30)}, 1) 0%, ${accent} 50%, rgba(${Math.max(0, rgb[0]-20)}, ${Math.max(0, rgb[1]-20)}, ${Math.max(0, rgb[2]-20)}, 1) 100%)`
    };
}
