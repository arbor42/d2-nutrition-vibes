// Slider Debug Utilities
window.SliderDebug = {
    inspectSlider: function(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) {
            console.error(`Slider with ID '${sliderId}' not found`);
            return;
        }

        console.log(`=== Slider Debug: ${sliderId} ===`);
        console.log('Element:', slider);
        console.log('Computed styles:', window.getComputedStyle(slider));
        
        // Check CSS properties
        const style = window.getComputedStyle(slider);
        console.log('Background:', style.background);
        console.log('Height:', style.height);
        console.log('Border-radius:', style.borderRadius);
        console.log('Appearance:', style.appearance || style.webkitAppearance);
        
        // Check classes
        console.log('Classes:', Array.from(slider.classList));
        
        // Check parent container
        console.log('Parent element:', slider.parentElement);
        console.log('Parent classes:', Array.from(slider.parentElement.classList));
        
        // Check tooltip
        const tooltip = slider.parentElement.querySelector('.slider-tooltip');
        if (tooltip) {
            console.log('Tooltip found:', tooltip);
            console.log('Tooltip classes:', Array.from(tooltip.classList));
        } else {
            console.log('No tooltip found');
        }
    },

    forceGreenThumb: function(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) {
            console.error(`Slider with ID '${sliderId}' not found`);
            return;
        }

        // Create a style element with very specific rules
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            #${sliderId}::-webkit-slider-thumb {
                -webkit-appearance: none !important;
                appearance: none !important;
                width: 24px !important;
                height: 24px !important;
                background: #27ae60 !important;
                border: 3px solid white !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3) !important;
            }
            
            #${sliderId}::-moz-range-thumb {
                width: 24px !important;
                height: 24px !important;
                background: #27ae60 !important;
                border: 3px solid white !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3) !important;
                -moz-appearance: none !important;
            }
        `;
        document.head.appendChild(styleElement);
        
        console.log(`Force green thumb applied to #${sliderId}`);
    },

    inspectAllSliders: function() {
        const sliders = document.querySelectorAll('input[type="range"]');
        console.log(`Found ${sliders.length} sliders:`);
        
        sliders.forEach((slider, index) => {
            console.log(`Slider ${index + 1}:`, {
                id: slider.id,
                element: slider,
                computedStyle: window.getComputedStyle(slider),
                classes: Array.from(slider.classList)
            });
        });
    }
};

// Auto-run debugging when page loads
window.addEventListener('load', () => {
    console.log('SliderDebug loaded. Available methods:');
    console.log('- SliderDebug.inspectSlider(id)');
    console.log('- SliderDebug.forceGreenThumb(id)');
    console.log('- SliderDebug.inspectAllSliders()');
    
    // Auto-inspect main sliders
    setTimeout(() => {
        SliderDebug.inspectAllSliders();
        
        // Try to force green thumbs
        SliderDebug.forceGreenThumb('year-slider');
        SliderDebug.forceGreenThumb('sim-years');
    }, 2000);
});
