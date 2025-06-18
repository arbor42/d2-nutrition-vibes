// Slider Debug Utilities
window.SliderDebug = {
    inspectSlider: function(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) {
            return;
        }

        // Debug slider properties
        const style = window.getComputedStyle(slider);
        
        // Check tooltip
        const tooltip = slider.parentElement.querySelector('.slider-tooltip');
    },

    forceGreenThumb: function(sliderId) {
        const slider = document.getElementById(sliderId);
        if (!slider) {
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
        
    },

    inspectAllSliders: function() {
        const sliders = document.querySelectorAll('input[type="range"]');
        // Found sliders
        sliders.forEach((slider, index) => {
            // Inspect slider properties
        });
    }
};

// Auto-run debugging when page loads
window.addEventListener('load', () => {
    // Auto-inspect main sliders
    setTimeout(() => {
        SliderDebug.inspectAllSliders();
        
        // Try to force green thumbs
        SliderDebug.forceGreenThumb('year-slider');
        SliderDebug.forceGreenThumb('sim-years');
    }, 2000);
});
