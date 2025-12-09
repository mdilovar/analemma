// Analemma Simulation
// Models the figure-8 pattern traced by the Sun in the sky

class AnalemmaSimulation {
    constructor() {
        // Canvases
        this.analemmaCanvas = document.getElementById('analemmaCanvas');
        this.orbitCanvas = document.getElementById('orbitCanvas');
        this.eotCanvas = document.getElementById('eotCanvas');

        this.analemmaCtx = this.analemmaCanvas.getContext('2d');
        this.orbitCtx = this.orbitCanvas.getContext('2d');
        this.eotCtx = this.eotCanvas.getContext('2d');

        // Set up high DPI canvases
        this.setupCanvas(this.analemmaCanvas, this.analemmaCtx);
        this.setupCanvas(this.orbitCanvas, this.orbitCtx);
        this.setupCanvas(this.eotCanvas, this.eotCtx);

        // Simulation parameters
        this.params = {
            tilt: 23.4,              // Earth's axial tilt in degrees
            eccentricity: 0.017,     // Earth's orbital eccentricity
            perihelionDay: 3,        // Day of year for perihelion (Jan 3)
            speed: 1,
            currentDay: 0,
            isPlaying: true,
            showTiltComponent: true,
            showEccentricityComponent: true
        };

        // Animation state
        this.lastTime = 0;
        this.dayAccumulator = 0;

        // Month names for display
        this.months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Days in each month (non-leap year)
        this.daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        this.setupControls();
        this.animate(0);
    }

    setupCanvas(canvas, ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.scale(dpr, dpr);

        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
    }

    setupControls() {
        // Sliders
        const tiltSlider = document.getElementById('tiltSlider');
        const eccentricitySlider = document.getElementById('eccentricitySlider');
        const perihelionSlider = document.getElementById('perihelionSlider');
        const speedSlider = document.getElementById('speedSlider');
        const daySlider = document.getElementById('daySlider');

        tiltSlider.addEventListener('input', (e) => {
            this.params.tilt = parseFloat(e.target.value);
            document.getElementById('tiltValue').textContent = this.params.tilt.toFixed(1) + '°';
        });

        eccentricitySlider.addEventListener('input', (e) => {
            this.params.eccentricity = parseFloat(e.target.value);
            document.getElementById('eccentricityValue').textContent = this.params.eccentricity.toFixed(3);
        });

        perihelionSlider.addEventListener('input', (e) => {
            this.params.perihelionDay = parseInt(e.target.value);
            document.getElementById('perihelionValue').textContent = 'Day ' + this.params.perihelionDay;
        });

        speedSlider.addEventListener('input', (e) => {
            this.params.speed = parseFloat(e.target.value);
            document.getElementById('speedValue').textContent = this.params.speed.toFixed(1) + 'x';
        });

        daySlider.addEventListener('input', (e) => {
            this.params.currentDay = parseInt(e.target.value);
            document.getElementById('dayValue').textContent = this.params.currentDay;
        });

        // Checkboxes
        document.getElementById('showTiltComponent').addEventListener('change', (e) => {
            this.params.showTiltComponent = e.target.checked;
        });

        document.getElementById('showEccentricityComponent').addEventListener('change', (e) => {
            this.params.showEccentricityComponent = e.target.checked;
        });

        // Buttons
        document.getElementById('playPauseBtn').addEventListener('click', () => {
            this.params.isPlaying = !this.params.isPlaying;
            document.getElementById('playPauseBtn').textContent = this.params.isPlaying ? 'Pause' : 'Play';
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.params.tilt = 23.4;
            this.params.eccentricity = 0.017;
            this.params.perihelionDay = 3;
            this.params.speed = 1;
            this.params.currentDay = 0;

            tiltSlider.value = 23.4;
            eccentricitySlider.value = 0.017;
            perihelionSlider.value = 3;
            speedSlider.value = 1;
            daySlider.value = 0;

            document.getElementById('tiltValue').textContent = '23.4°';
            document.getElementById('eccentricityValue').textContent = '0.017';
            document.getElementById('perihelionValue').textContent = 'Day 3';
            document.getElementById('speedValue').textContent = '1x';
            document.getElementById('dayValue').textContent = '0';
        });
    }

    // Convert degrees to radians
    toRad(deg) {
        return deg * Math.PI / 180;
    }

    // Convert radians to degrees
    toDeg(rad) {
        return rad * 180 / Math.PI;
    }

    // Calculate the mean anomaly for a given day
    getMeanAnomaly(day) {
        // Mean anomaly: how far Earth has traveled in its orbit (if it were circular)
        // Zero at perihelion
        const daysSincePerihelion = (day - this.params.perihelionDay + 365) % 365;
        return this.toRad(360 * daysSincePerihelion / 365);
    }

    // Calculate the true anomaly (actual position in elliptical orbit)
    getTrueAnomaly(meanAnomaly) {
        // Use equation of center approximation for small eccentricity
        const e = this.params.eccentricity;
        const M = meanAnomaly;

        // Equation of center (approximation valid for small e)
        const C = (2 * e - e * e * e / 4) * Math.sin(M) +
                  (5 * e * e / 4) * Math.sin(2 * M) +
                  (13 * e * e * e / 12) * Math.sin(3 * M);

        return M + C;
    }

    // Calculate solar longitude (position along ecliptic)
    getSolarLongitude(day) {
        // Spring equinox is around day 80 (March 21)
        // Solar longitude is 0 at spring equinox
        const springEquinox = 80;
        const meanLongitude = this.toRad(360 * (day - springEquinox) / 365);

        const meanAnomaly = this.getMeanAnomaly(day);
        const trueAnomaly = this.getTrueAnomaly(meanAnomaly);

        // Difference between true and mean anomaly
        const equationOfCenter = trueAnomaly - meanAnomaly;

        return meanLongitude + equationOfCenter;
    }

    // Calculate solar declination (north-south position of Sun)
    getSolarDeclination(day) {
        const solarLongitude = this.getSolarLongitude(day);
        const obliquity = this.toRad(this.params.tilt);

        // Declination from spherical trigonometry
        const declination = Math.asin(Math.sin(obliquity) * Math.sin(solarLongitude));

        return this.toDeg(declination);
    }

    // Calculate the Equation of Time (in minutes)
    // This is the difference between apparent solar time and mean solar time
    getEquationOfTime(day) {
        const components = this.getEOTComponents(day);
        let eot = 0;
        if (this.params.showEccentricityComponent) {
            eot += components.eccentricity;
        }
        if (this.params.showTiltComponent) {
            eot += components.obliquity;
        }
        return eot;
    }

    // Get the two EOT components separately (in minutes)
    getEOTComponents(day) {
        const obliquity = this.toRad(this.params.tilt);
        const e = this.params.eccentricity;

        // Mean anomaly
        const M = this.getMeanAnomaly(day);

        // Mean longitude (from vernal equinox, day 80)
        const springEquinox = 80;
        const L = this.toRad(360 * (day - springEquinox) / 365);

        // 1. Eccentricity effect (Earth moves faster near perihelion)
        // This has ONE cycle per year
        const eccentricityEffect = -2 * e * Math.sin(M) - 1.25 * e * e * Math.sin(2 * M);

        // 2. Obliquity effect (Sun's path on ecliptic projects variably onto equator)
        // This has TWO cycles per year (peaks at solstices AND equinoxes)
        const y = Math.tan(obliquity / 2);
        const y2 = y * y;
        const obliquityEffect = y2 * Math.sin(2 * L) - 0.5 * y2 * y2 * Math.sin(4 * L);

        // Convert from radians to minutes
        // 24 hours = 1440 minutes = 2π radians, so 1 radian = 1440/(2π) ≈ 229.18 minutes
        return {
            eccentricity: eccentricityEffect * 229.18,
            obliquity: obliquityEffect * 229.18
        };
    }

    // Get the month and day from day of year
    getDayMonth(dayOfYear) {
        let day = dayOfYear;
        let month = 0;

        while (month < 12 && day >= this.daysInMonth[month]) {
            day -= this.daysInMonth[month];
            month++;
        }

        if (month >= 12) {
            month = 0;
            day = dayOfYear;
        }

        return { month: this.months[month], day: Math.floor(day) + 1 };
    }

    // Get color for a given day of year
    getSeasonColor(day, alpha = 1) {
        // Map day to a color representing the season
        // Winter: blue, Spring: green, Summer: orange, Autumn: red

        const t = day / 365;
        let r, g, b;

        if (t < 0.25) {
            // Winter to Spring (blue to green)
            const s = t / 0.25;
            r = Math.floor(74 * (1 - s) + 74 * s);
            g = Math.floor(158 * (1 - s) + 255 * s);
            b = Math.floor(255 * (1 - s) + 74 * s);
        } else if (t < 0.5) {
            // Spring to Summer (green to orange)
            const s = (t - 0.25) / 0.25;
            r = Math.floor(74 * (1 - s) + 255 * s);
            g = Math.floor(255 * (1 - s) + 170 * s);
            b = Math.floor(74 * (1 - s) + 0 * s);
        } else if (t < 0.75) {
            // Summer to Autumn (orange to red)
            const s = (t - 0.5) / 0.25;
            r = Math.floor(255);
            g = Math.floor(170 * (1 - s) + 74 * s);
            b = Math.floor(0 * (1 - s) + 74 * s);
        } else {
            // Autumn to Winter (red to blue)
            const s = (t - 0.75) / 0.25;
            r = Math.floor(255 * (1 - s) + 74 * s);
            g = Math.floor(74 * (1 - s) + 158 * s);
            b = Math.floor(74 * (1 - s) + 255 * s);
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Draw the analemma pattern
    drawAnalemma() {
        const ctx = this.analemmaCtx;
        const canvas = this.analemmaCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;

        // Scale factors
        const scaleX = width / 50;  // minutes to pixels (±20 minutes range)
        const scaleY = height / 60; // degrees to pixels (±30 degrees range)

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Vertical lines (equation of time)
        for (let m = -20; m <= 20; m += 5) {
            const x = centerX + m * scaleX;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            if (m !== 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(m + 'm', x, height - 10);
            }
        }

        // Horizontal lines (declination)
        for (let d = -25; d <= 25; d += 5) {
            const y = centerY - d * scaleY;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            if (d !== 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(d + '°', 10, y + 4);
            }
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;

        // Vertical axis (declination)
        ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, height);
        ctx.stroke();

        // Horizontal axis (equation of time)
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        // Draw axis labels with color coding
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';

        // Sun Early label (left side - blue)
        ctx.fillStyle = 'rgba(84, 160, 255, 0.9)';
        ctx.fillText('← Sun Early', centerX - 70, height - 30);

        // Separator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('|', centerX, height - 30);

        // Sun Late label (right side - orange)
        ctx.fillStyle = 'rgba(255, 159, 67, 0.9)';
        ctx.fillText('Sun Late →', centerX + 70, height - 30);

        ctx.save();
        ctx.translate(width - 25, centerY);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('← South | North →', 0, 0);
        ctx.restore();

        // Draw motion direction arrows at key points to show WHY tilt creates E-W variation
        // This is the key visual: at solstices motion is horizontal, at equinoxes it's diagonal
        if (this.params.tilt > 5 && this.params.showTiltComponent) {
            const arrowLen = 25;

            // Helper to draw an arrow
            const drawArrow = (x, y, angle, color, label, labelPos) => {
                const endX = x + arrowLen * Math.cos(angle);
                const endY = y + arrowLen * Math.sin(angle);

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Arrowhead
                const headLen = 6;
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
                ctx.moveTo(endX, endY);
                ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
                ctx.stroke();

                // Label
                if (label) {
                    ctx.fillStyle = color;
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = labelPos === 'left' ? 'right' : 'left';
                    const labelX = labelPos === 'left' ? x - 8 : x + arrowLen + 8;
                    ctx.fillText(label, labelX, y + 3);
                }
            };

            // Summer solstice (top of analemma) - motion parallel to equator (horizontal arrow)
            const summerDay = 172; // ~June 21
            const summerEot = this.getEquationOfTime(summerDay);
            const summerDecl = this.getSolarDeclination(summerDay);
            const summerX = centerX + summerEot * scaleX;
            const summerY = centerY - summerDecl * scaleY;
            drawArrow(summerX - arrowLen/2, summerY, 0, 'rgba(255, 200, 100, 0.8)', 'E-W only', 'right');

            // Winter solstice (bottom) - also horizontal
            const winterDay = 355; // ~Dec 21
            const winterEot = this.getEquationOfTime(winterDay);
            const winterDecl = this.getSolarDeclination(winterDay);
            const winterX = centerX + winterEot * scaleX;
            const winterY = centerY - winterDecl * scaleY;
            drawArrow(winterX - arrowLen/2, winterY, 0, 'rgba(100, 180, 255, 0.8)', 'E-W only', 'right');

            // Spring equinox - motion at an angle (diagonal arrow)
            const springDay = 80; // ~March 21
            const springEot = this.getEquationOfTime(springDay);
            const springDecl = this.getSolarDeclination(springDay);
            const springX = centerX + springEot * scaleX;
            const springY = centerY - springDecl * scaleY;
            // Arrow going up-right (NE direction) to show motion split between N and E
            drawArrow(springX, springY, -Math.PI/4, 'rgba(150, 255, 150, 0.8)', 'N + E', 'right');

            // Fall equinox - also diagonal but going down
            const fallDay = 266; // ~Sept 23
            const fallEot = this.getEquationOfTime(fallDay);
            const fallDecl = this.getSolarDeclination(fallDay);
            const fallX = centerX + fallEot * scaleX;
            const fallY = centerY - fallDecl * scaleY;
            // Arrow going down-right (SE direction)
            drawArrow(fallX, fallY, Math.PI/4, 'rgba(255, 150, 150, 0.8)', 'S + E', 'right');

            // Add a mini legend for the arrows when eccentricity is low
            if (this.params.eccentricity <= 0.005) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('Arrows show Sun\'s motion direction:', 10, 20);
                ctx.fillText('→ Horizontal = all E-W = Sun late', 10, 34);
                ctx.fillText('↗ Diagonal = some N-S = Sun early', 10, 48);
            }
        }

        // Draw "WHY" annotations on the analemma (for eccentricity effect)
        if (this.params.eccentricity > 0.005 && this.params.showEccentricityComponent) {
            ctx.font = '10px sans-serif';

            // Find the rightmost point (Sun most late - near perihelion)
            let maxEot = -Infinity, maxEotDay = 0;
            let minEot = Infinity, minEotDay = 0;
            for (let d = 0; d < 365; d++) {
                const e = this.getEquationOfTime(d);
                if (e > maxEot) { maxEot = e; maxEotDay = d; }
                if (e < minEot) { minEot = e; minEotDay = d; }
            }

            // Annotation for "Sun Late" (right side)
            const lateDecl = this.params.showTiltComponent ? this.getSolarDeclination(maxEotDay) : 0;
            const lateX = centerX + maxEot * scaleX;
            const lateY = centerY - lateDecl * scaleY;

            ctx.fillStyle = 'rgba(255, 159, 67, 0.8)';
            ctx.textAlign = 'left';
            const lateInfo = this.getDayMonth(maxEotDay);
            ctx.fillText(`${lateInfo.month}: Earth moving fast`, lateX + 15, lateY - 10);
            ctx.fillText(`→ extra rotation needed`, lateX + 15, lateY + 5);

            // Draw connector line
            ctx.strokeStyle = 'rgba(255, 159, 67, 0.4)';
            ctx.beginPath();
            ctx.moveTo(lateX + 5, lateY);
            ctx.lineTo(lateX + 13, lateY - 5);
            ctx.stroke();

            // Annotation for "Sun Early" (left side)
            const earlyDecl = this.params.showTiltComponent ? this.getSolarDeclination(minEotDay) : 0;
            const earlyX = centerX + minEot * scaleX;
            const earlyY = centerY - earlyDecl * scaleY;

            ctx.fillStyle = 'rgba(84, 160, 255, 0.8)';
            ctx.textAlign = 'right';
            const earlyInfo = this.getDayMonth(minEotDay);
            ctx.fillText(`${earlyInfo.month}: Earth moving slow`, earlyX - 15, earlyY - 10);
            ctx.fillText(`← less rotation needed`, earlyX - 15, earlyY + 5);

            // Draw connector line
            ctx.strokeStyle = 'rgba(84, 160, 255, 0.4)';
            ctx.beginPath();
            ctx.moveTo(earlyX - 5, earlyY);
            ctx.lineTo(earlyX - 13, earlyY - 5);
            ctx.stroke();
        }

        // Draw loop size annotations if tilt is significant
        if (this.params.tilt > 5 && this.params.showTiltComponent) {
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';

            // Winter loop label (bottom)
            ctx.fillStyle = 'rgba(74, 158, 255, 0.7)';
            const winterY = centerY + 20 * scaleY;
            ctx.fillText('WINTER', centerX + 50, winterY);

            // Summer loop label (top)
            ctx.fillStyle = 'rgba(255, 170, 0, 0.7)';
            const summerY = centerY - 20 * scaleY;
            ctx.fillText('SUMMER', centerX - 50, summerY);

            // Only show size explanation if eccentricity is significant
            if (this.params.eccentricity > 0.005) {
                ctx.font = '9px sans-serif';
                ctx.fillStyle = 'rgba(74, 158, 255, 0.6)';
                ctx.fillText('(larger: fastest here)', centerX + 50, winterY + 13);
                ctx.fillStyle = 'rgba(255, 170, 0, 0.6)';
                ctx.fillText('(smaller: slowest here)', centerX - 50, summerY + 13);
            }
        }

        // Draw the full analemma trail
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw as colored segments
        for (let day = 0; day < 365; day++) {
            const eot = this.getEquationOfTime(day);
            const decl = this.params.showTiltComponent ? this.getSolarDeclination(day) : 0;

            const x = centerX + eot * scaleX;
            const y = centerY - decl * scaleY;

            const nextDay = (day + 1) % 365;
            const nextEot = this.getEquationOfTime(nextDay);
            const nextDecl = this.params.showTiltComponent ? this.getSolarDeclination(nextDay) : 0;
            const nextX = centerX + nextEot * scaleX;
            const nextY = centerY - nextDecl * scaleY;

            ctx.strokeStyle = this.getSeasonColor(day, 0.8);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nextX, nextY);
            ctx.stroke();
        }

        // Draw current position marker
        const currentEot = this.getEquationOfTime(this.params.currentDay);
        const currentDecl = this.params.showTiltComponent ? this.getSolarDeclination(this.params.currentDay) : 0;
        const currentX = centerX + currentEot * scaleX;
        const currentY = centerY - currentDecl * scaleY;

        // Glow effect
        const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, 20);
        gradient.addColorStop(0, 'rgba(255, 200, 50, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 20, 0, Math.PI * 2);
        ctx.fill();

        // Sun marker
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(currentX - 2, currentY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw month markers
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';

        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        for (let i = 0; i < 12; i++) {
            const day = monthDays[i] + 15; // Middle of month
            const eot = this.getEquationOfTime(day);
            const decl = this.params.showTiltComponent ? this.getSolarDeclination(day) : 0;
            const x = centerX + eot * scaleX;
            const y = centerY - decl * scaleY;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Offset labels to avoid overlap
            let labelX = x + 15;
            let labelY = y + 4;

            if (i === 5 || i === 6) labelX = x - 20; // Jun, Jul on left
            if (i === 11 || i === 0) labelY = y - 10; // Dec, Jan above

            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(this.months[i], labelX, labelY);
        }
    }

    // Draw the orbital view
    drawOrbit() {
        const ctx = this.orbitCtx;
        const canvas = this.orbitCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const orbitRadius = Math.min(width, height) * 0.38;

        // Calculate focus offset for ellipse (Sun is at one focus)
        const focusOffset = orbitRadius * this.params.eccentricity;

        // Draw orbit path
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, orbitRadius, orbitRadius * Math.sqrt(1 - this.params.eccentricity * this.params.eccentricity), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Sun at focus
        const sunX = centerX + focusOffset;
        const sunY = centerY;

        // Sun glow
        const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 40);
        sunGradient.addColorStop(0, 'rgba(255, 230, 150, 1)');
        sunGradient.addColorStop(0.3, 'rgba(255, 180, 50, 0.8)');
        sunGradient.addColorStop(0.6, 'rgba(255, 100, 0, 0.3)');
        sunGradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

        ctx.fillStyle = sunGradient;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 40, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffee88';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sun', sunX, sunY + 35);

        // Draw Earth's positions for each month
        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

        for (let i = 0; i < 12; i++) {
            const day = monthDays[i];
            const meanAnomaly = this.getMeanAnomaly(day);
            const trueAnomaly = this.getTrueAnomaly(meanAnomaly);

            // Position in orbit (true anomaly is angle from perihelion)
            // Perihelion is to the right (0 angle), so we need to adjust
            const angle = trueAnomaly + Math.PI; // Adjust so perihelion direction is correct

            // Distance from Sun (in terms of orbit radius as semi-major axis)
            const e = this.params.eccentricity;
            const r = orbitRadius * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

            const x = sunX + r * Math.cos(angle);
            const y = sunY + r * Math.sin(angle);

            ctx.fillStyle = this.getSeasonColor(day, 0.5);
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '10px sans-serif';
            const labelR = r + 20;
            const labelX = sunX + labelR * Math.cos(angle);
            const labelY = sunY + labelR * Math.sin(angle);
            ctx.fillText(this.months[i], labelX, labelY);
        }

        // Draw current Earth position
        const meanAnomaly = this.getMeanAnomaly(this.params.currentDay);
        const trueAnomaly = this.getTrueAnomaly(meanAnomaly);
        const angle = trueAnomaly + Math.PI;
        const e = this.params.eccentricity;
        const r = orbitRadius * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

        const earthX = sunX + r * Math.cos(angle);
        const earthY = sunY + r * Math.sin(angle);

        // Draw line from Sun to Earth
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(earthX, earthY);
        ctx.stroke();

        // Earth glow
        const earthGlow = ctx.createRadialGradient(earthX, earthY, 0, earthX, earthY, 25);
        earthGlow.addColorStop(0, 'rgba(100, 150, 255, 0.5)');
        earthGlow.addColorStop(1, 'rgba(100, 150, 255, 0)');
        ctx.fillStyle = earthGlow;
        ctx.beginPath();
        ctx.arc(earthX, earthY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Earth
        ctx.fillStyle = '#4a88ff';
        ctx.beginPath();
        ctx.arc(earthX, earthY, 12, 0, Math.PI * 2);
        ctx.fill();

        // Earth continents (simple)
        ctx.fillStyle = '#3d8b40';
        ctx.beginPath();
        ctx.arc(earthX - 2, earthY - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(earthX + 3, earthY + 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw Earth's axis tilt
        if (this.params.tilt > 0) {
            const axisLength = 25;
            const tiltAngle = this.toRad(this.params.tilt);

            // Axis is tilted relative to orbital plane
            // For visualization, we show it tilted in the viewing plane
            const axisEndX = earthX + axisLength * Math.sin(tiltAngle);
            const axisEndY = earthY - axisLength * Math.cos(tiltAngle);
            const axisStartX = earthX - axisLength * Math.sin(tiltAngle);
            const axisStartY = earthY + axisLength * Math.cos(tiltAngle);

            ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(axisStartX, axisStartY);
            ctx.lineTo(axisEndX, axisEndY);
            ctx.stroke();

            // Arrow at north pole
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
            ctx.beginPath();
            ctx.arc(axisEndX, axisEndY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw perihelion/aphelion markers with speed info
        ctx.font = '10px sans-serif';

        // Perihelion (closest to Sun) - on the left of orbit
        const periX = sunX - orbitRadius * (1 - e);
        const periSpeed = this.getOrbitalSpeed(this.params.perihelionDay);
        const periSpeedPct = ((periSpeed - 1) * 100).toFixed(1);

        ctx.fillStyle = 'rgba(255, 107, 107, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('PERIHELION', periX, centerY - 25);
        ctx.font = '9px sans-serif';
        ctx.fillText('Closest to Sun', periX, centerY - 12);
        ctx.fillStyle = 'rgba(255, 107, 107, 1)';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Speed: +${periSpeedPct}%`, periX, centerY + 25);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(255, 159, 67, 0.8)';
        ctx.fillText('→ Sun runs LATE', periX, centerY + 38);

        ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
        ctx.beginPath();
        ctx.arc(periX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Aphelion (farthest from Sun) - on the right of orbit
        const apX = sunX + orbitRadius * (1 + e);
        const apDay = (this.params.perihelionDay + 182) % 365;
        const apSpeed = this.getOrbitalSpeed(apDay);
        const apSpeedPct = ((apSpeed - 1) * 100).toFixed(1);

        ctx.fillStyle = 'rgba(107, 255, 107, 0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('APHELION', apX, centerY - 25);
        ctx.font = '9px sans-serif';
        ctx.fillText('Farthest from Sun', apX, centerY - 12);
        ctx.fillStyle = 'rgba(107, 255, 107, 1)';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Speed: ${apSpeedPct}%`, apX, centerY + 25);
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(84, 160, 255, 0.8)';
        ctx.fillText('→ Sun runs EARLY', apX, centerY + 38);

        ctx.fillStyle = 'rgba(107, 255, 107, 0.8)';
        ctx.beginPath();
        ctx.arc(apX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw speed gradient on orbit path
        if (this.params.eccentricity > 0.005) {
            ctx.lineWidth = 4;
            for (let d = 0; d < 365; d += 2) {
                const meanAnomaly = this.getMeanAnomaly(d);
                const trueAnomaly = this.getTrueAnomaly(meanAnomaly);
                const angle = trueAnomaly + Math.PI;
                const r = orbitRadius * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));

                const x = sunX + r * Math.cos(angle);
                const y = sunY + r * Math.sin(angle);

                const nextD = (d + 2) % 365;
                const nextMA = this.getMeanAnomaly(nextD);
                const nextTA = this.getTrueAnomaly(nextMA);
                const nextAngle = nextTA + Math.PI;
                const nextR = orbitRadius * (1 - e * e) / (1 + e * Math.cos(nextTA));
                const nextX = sunX + nextR * Math.cos(nextAngle);
                const nextY = sunY + nextR * Math.sin(nextAngle);

                // Color by speed
                const speed = this.getOrbitalSpeed(d);
                const speedNorm = (speed - (1 - e)) / (2 * e); // 0 to 1
                const r_col = Math.floor(107 + 148 * speedNorm);
                const g_col = Math.floor(255 - 148 * speedNorm);
                ctx.strokeStyle = `rgba(${r_col}, ${g_col}, 107, 0.4)`;

                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(nextX, nextY);
                ctx.stroke();
            }
        }

        // Legend
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Top-down view of Earth\'s orbit', 15, 25);

        if (this.params.eccentricity > 0.005) {
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
            ctx.fillText('● Fast (near Sun)', 15, 45);
            ctx.fillStyle = 'rgba(107, 255, 107, 0.8)';
            ctx.fillText('● Slow (far from Sun)', 15, 60);
        }
    }

    // Draw the equation of time graph
    drawEOTGraph() {
        const ctx = this.eotCtx;
        const canvas = this.eotCanvas;
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear canvas
        ctx.fillStyle = 'rgba(0, 0, 10, 1)';
        ctx.fillRect(0, 0, width, height);

        const padding = { left: 50, right: 20, top: 20, bottom: 30 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let m = -15; m <= 15; m += 5) {
            const y = padding.top + graphHeight / 2 - (m / 20) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(m + 'm', padding.left - 5, y + 4);
        }

        // Zero line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + graphHeight / 2);
        ctx.lineTo(width - padding.right, padding.top + graphHeight / 2);
        ctx.stroke();

        // Month labels
        const monthDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';

        for (let i = 0; i < 12; i++) {
            const x = padding.left + (monthDays[i] / 365) * graphWidth;
            ctx.fillText(this.months[i], x + 15, height - 10);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();
        }

        // Draw the two component curves (dashed, behind the main curve)
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([4, 4]);

        // Eccentricity component (red/orange) - ONE cycle per year
        if (this.params.eccentricity > 0.001) {
            for (let day = 0; day < 364; day++) {
                const comp = this.getEOTComponents(day);
                const nextComp = this.getEOTComponents(day + 1);

                const x1 = padding.left + (day / 365) * graphWidth;
                const y1 = padding.top + graphHeight / 2 - (comp.eccentricity / 20) * graphHeight;
                const x2 = padding.left + ((day + 1) / 365) * graphWidth;
                const y2 = padding.top + graphHeight / 2 - (nextComp.eccentricity / 20) * graphHeight;

                ctx.strokeStyle = 'rgba(255, 107, 107, 0.5)';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        // Obliquity component (blue/cyan) - TWO cycles per year
        if (this.params.tilt > 0.5) {
            for (let day = 0; day < 364; day++) {
                const comp = this.getEOTComponents(day);
                const nextComp = this.getEOTComponents(day + 1);

                const x1 = padding.left + (day / 365) * graphWidth;
                const y1 = padding.top + graphHeight / 2 - (comp.obliquity / 20) * graphHeight;
                const x2 = padding.left + ((day + 1) / 365) * graphWidth;
                const y2 = padding.top + graphHeight / 2 - (nextComp.obliquity / 20) * graphHeight;

                ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        ctx.setLineDash([]);

        // Draw combined EOT curve (solid, on top)
        ctx.lineWidth = 2.5;
        for (let day = 0; day < 364; day++) {
            const eot = this.getEquationOfTime(day);
            const nextEot = this.getEquationOfTime(day + 1);

            const x1 = padding.left + (day / 365) * graphWidth;
            const y1 = padding.top + graphHeight / 2 - (eot / 20) * graphHeight;
            const x2 = padding.left + ((day + 1) / 365) * graphWidth;
            const y2 = padding.top + graphHeight / 2 - (nextEot / 20) * graphHeight;

            ctx.strokeStyle = this.getSeasonColor(day, 0.9);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // Draw current day marker
        const currentX = padding.left + (this.params.currentDay / 365) * graphWidth;
        const currentEot = this.getEquationOfTime(this.params.currentDay);
        const currentY = padding.top + graphHeight / 2 - (currentEot / 20) * graphHeight;

        // Vertical line at current day
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currentX, padding.top);
        ctx.lineTo(currentX, height - padding.bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Current point
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Title and Legend
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Equation of Time (= deviation from average)', padding.left, 15);

        // Component legend on the right
        ctx.textAlign = 'right';
        ctx.font = '9px sans-serif';
        ctx.fillStyle = 'rgba(255, 107, 107, 0.8)';
        ctx.fillText('--- Eccentricity (1 cycle/yr)', width - padding.right, 12);
        ctx.fillStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.fillText('--- Obliquity (2 cycles/yr)', width - padding.right, 24);
    }

    // Get orbital speed relative to mean (1.0 = average)
    getOrbitalSpeed(day) {
        const meanAnomaly = this.getMeanAnomaly(day);
        const trueAnomaly = this.getTrueAnomaly(meanAnomaly);
        const e = this.params.eccentricity;
        // Speed is inversely related to distance squared (Kepler's 2nd law)
        // v ∝ (1 + e*cos(trueAnomaly))
        return 1 + e * Math.cos(trueAnomaly);
    }

    // Generate insight text based on current position
    getInsightText(day, eot, speed) {
        const dateInfo = this.getDayMonth(day);
        const components = this.getEOTComponents(day);
        const eotClass = eot > 0 ? 'late' : 'early';
        const eotWord = eot > 0 ? 'late' : 'early';

        // Format component contributions
        const eccSign = components.eccentricity >= 0 ? '+' : '';
        const oblSign = components.obliquity >= 0 ? '+' : '';

        let insight = `<strong>${dateInfo.month} ${dateInfo.day}</strong>: `;

        // Show both components
        insight += `Two effects combine → Sun is <span class="${eotClass}">${Math.abs(eot).toFixed(1)} min ${eotWord}</span> (relative to average). `;

        // Explain the components
        insight += `<br><small style="color:#aaa;">`;
        insight += `<span style="color:rgba(255,107,107,0.9);">Orbital speed: ${eccSign}${components.eccentricity.toFixed(1)}m</span>`;
        insight += ` + `;
        insight += `<span style="color:rgba(100,200,255,0.9);">Tilt effect: ${oblSign}${components.obliquity.toFixed(1)}m</span>`;
        insight += `</small>`;

        // Add contextual explanation
        if (Math.abs(components.eccentricity) > 5 && Math.sign(components.eccentricity) !== Math.sign(components.obliquity)) {
            insight += `<br><em style="color:#888;">The two effects are opposing each other right now.</em>`;
        } else if (Math.abs(components.eccentricity) > 5 && Math.sign(components.eccentricity) === Math.sign(components.obliquity)) {
            insight += `<br><em style="color:#888;">Both effects reinforce each other, making the Sun extra ${eotWord}.</em>`;
        }

        return insight;
    }

    // Update info displays
    updateInfo() {
        const dateInfo = this.getDayMonth(this.params.currentDay);
        document.getElementById('currentDate').textContent = dateInfo.month + ' ' + dateInfo.day;

        const speed = this.getOrbitalSpeed(this.params.currentDay);
        const speedPercent = ((speed - 1) * 100);
        const speedText = speedPercent > 0 ? `+${speedPercent.toFixed(1)}%` : `${speedPercent.toFixed(1)}%`;
        const speedElement = document.getElementById('orbitalSpeed');
        speedElement.textContent = speedText;
        speedElement.style.color = speedPercent > 0 ? '#ff6b6b' : '#6bff6b';

        const eot = this.getEquationOfTime(this.params.currentDay);
        const eotSign = eot >= 0 ? '+' : '';
        document.getElementById('eot').textContent = eotSign + eot.toFixed(1) + ' min';

        // Update insight panel
        const insightText = this.getInsightText(this.params.currentDay, eot, speed);
        document.getElementById('insightText').innerHTML = insightText;

        // Update day slider
        document.getElementById('daySlider').value = this.params.currentDay;
        document.getElementById('dayValue').textContent = Math.floor(this.params.currentDay);
    }

    // Animation loop
    animate(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update day counter
        if (this.params.isPlaying) {
            // Advance time - complete one year in about 30 seconds at 1x speed
            this.dayAccumulator += deltaTime * 0.012 * this.params.speed;

            if (this.dayAccumulator >= 1) {
                this.params.currentDay = (this.params.currentDay + Math.floor(this.dayAccumulator)) % 365;
                this.dayAccumulator = this.dayAccumulator % 1;
            }
        }

        // Draw everything
        this.drawAnalemma();
        this.drawOrbit();
        this.drawEOTGraph();
        this.updateInfo();

        // Continue animation
        requestAnimationFrame((t) => this.animate(t));
    }
}

// Start simulation when page loads
window.addEventListener('load', () => {
    new AnalemmaSimulation();
});
