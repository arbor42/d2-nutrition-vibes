/*
 * FAOExport – Einfache Hilfsfunktionen zum Exportieren von Diagrammen/Daten
 * - downloadSVG: Lädt den ersten <svg>-Knoten innerhalb eines Containers als .svg-Datei herunter
 * - downloadCSV: Lädt ein Array von Objekten als CSV-Datei herunter
 */

window.FAOExport = {
    downloadSVG(containerId, filename = 'diagramm.svg') {
        const svgNode = document.querySelector(`#${containerId} svg`);
        if (!svgNode) {
            return;
        }

        // SVG serialisieren
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgNode);

        // Namespace sicherstellen
        if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        // Datei erstellen und herunterladen
        const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    },

    downloadCSV(dataArray, filename = 'daten.csv') {
        if (!Array.isArray(dataArray) || dataArray.length === 0) {
            return;
        }

        const header = Object.keys(dataArray[0]).join(',');
        const rows = dataArray.map(obj => Object.values(obj).join(','));
        const csvContent = [header, ...rows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    },

    downloadPNG(containerId, filename = 'diagramm.png') {
        const svgNode = document.querySelector(`#${containerId} svg`);
        if (!svgNode) {
            return;
        }

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgNode);
        if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const img = new Image();
        const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(blob => {
                const pngUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = pngUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(pngUrl);
            }, 'image/png');

            URL.revokeObjectURL(url);
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
        };

        img.src = url;
    },

    attachExport(buttonId, formatSelectId, containerId) {
        const btn = document.getElementById(buttonId);
        if (!btn) return;

        btn.addEventListener('click', () => {
            const format = document.getElementById(formatSelectId)?.value || 'svg';
            if (format === 'png') {
                this.downloadPNG(containerId, `${containerId}.png`);
            } else {
                this.downloadSVG(containerId, `${containerId}.svg`);
            }
        });
    }
}; 