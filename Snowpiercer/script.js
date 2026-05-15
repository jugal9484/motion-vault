/* ═══════════════════════════════════════════════════════════════

   S N O W P I E R C E R
   Cinematic Title System — Animation Engine

   A four-act structure, like a Nolan film:

   ACT I   — THE VOID        (0s – 1s)
             Pure darkness. Grain bleeds in at the edges.
             The audience waits. Anticipation.

   ACT II  — THE BREACH      (1s – 3s)
             A razor-thin line of light splits the void.
             Particles scatter from the wound in space.
             Something is about to be born.

   ACT III — THE EMERGENCE   (2.5s – 6s)
             From within the light, letter-forms resolve.
             Like focusing a lens on something vast.
             Blur contracts. Light condenses into typography.
             A subliminal flash marks the crystallization.

   ACT IV  — THE SETTLING    (5.5s – 8s+)
             The breach heals. The pulse ripples outward.
             The text stands alone in the void — sharp,
             permanent, breathing.

   ═══════════════════════════════════════════════════════════════ */

; (function () {
    "use strict";

    /* ─── Config ─── */
    const TITLE_TEXT = "SNOWPIERCER";

    const TIMING = {
        voidDuration: 1.0,   // seconds of black before anything
        breachStart: 1.0,
        breachGrow: 1.8,   // how long the line takes to reach full width
        particleBurst: 1.6,   // when breach particles fire
        textFadeStart: 2.5,   // when letters begin emerging
        textRevealDur: 3.0,   // total time for text to fully sharpen
        charStagger: 0.04,  // near-simultaneous, center-outward
        crystallizeAt: 5.0,   // the moment of sharpness — flash + pulse
        breachFadeStart: 5.0,
        settleEnd: 7.5,
    };

    const PARTICLES = {
        ambient: 30,            // persistent floating dust count
        burstCount: 60,         // sparks from the breach
    };

    /* ─── DOM ─── */
    const titleEl = document.getElementById("title");
    const grainEl = document.getElementById("grain");
    const partEl = document.getElementById("particles");
    const vignetteEl = document.querySelector(".vignette");
    const breachEl = document.getElementById("breach");
    const breachGlow = document.getElementById("breach-glow");
    const flashEl = document.getElementById("flash");
    const pulseEl = document.getElementById("pulse");

    /* ═══════════════════════════════════════════
       1. TEXT SPLITTING
       Characters split center-outward for stagger.
       ═══════════════════════════════════════════ */
    function splitText() {
        const chars = TITLE_TEXT.split("");
        titleEl.innerHTML = chars
            .map((c) => `<span class="char" aria-hidden="true">${c}</span>`)
            .join("");
    }

    /* Reorder chars array so stagger goes from center outward */
    function getCenterOutwardChars() {
        const chars = Array.from(document.querySelectorAll(".char"));
        const mid = Math.floor(chars.length / 2);
        const ordered = [];
        let left = mid, right = mid + 1;
        while (left >= 0 || right < chars.length) {
            if (left >= 0) ordered.push(chars[left--]);
            if (right < chars.length) ordered.push(chars[right++]);
        }
        return ordered;
    }

    /* ═══════════════════════════════════════════
       2. FILM GRAIN — Canvas
       Renders at ~12fps for cinematic flicker,
       not 60fps (which looks digital, not filmic).
       ═══════════════════════════════════════════ */
    function initGrain() {
        const ctx = grainEl.getContext("2d");
        let w, h;

        function resize() {
            // Render grain at half res for performance, CSS scales it
            w = grainEl.width = Math.ceil(window.innerWidth / 2);
            h = grainEl.height = Math.ceil(window.innerHeight / 2);
        }
        resize();
        window.addEventListener("resize", resize);

        function frame() {
            const img = ctx.createImageData(w, h);
            const d = img.data;
            for (let i = 0, n = d.length; i < n; i += 4) {
                const v = (Math.random() * 255) | 0;
                d[i] = d[i + 1] = d[i + 2] = v;
                d[i + 3] = 14;
            }
            ctx.putImageData(img, 0, 0);
            setTimeout(frame, 83); // ~12fps
        }
        frame();
    }

    /* ═══════════════════════════════════════════
       3. PARTICLE SYSTEM — Canvas
       Two types:
         • Ambient dust: always drifting, subtle
         • Breach sparks: burst from center line, fade
       ═══════════════════════════════════════════ */
    function initParticles() {
        const ctx = partEl.getContext("2d");
        let w, h;
        const pool = [];
        let breachFired = false;

        function resize() {
            w = partEl.width = window.innerWidth;
            h = partEl.height = window.innerHeight;
        }
        resize();
        window.addEventListener("resize", resize);

        // Ambient dust
        for (let i = 0; i < PARTICLES.ambient; i++) {
            pool.push({
                type: "ambient",
                x: Math.random() * (w || window.innerWidth),
                y: Math.random() * (h || window.innerHeight),
                size: Math.random() * 1.0 + 0.3,
                vx: (Math.random() - 0.5) * 0.12,
                vy: (Math.random() - 0.5) * 0.08 - 0.02,
                alpha: 0,
                alphaTarget: Math.random() * 0.18 + 0.04,
                breathDir: 1,
                breathSpeed: Math.random() * 0.002 + 0.0008,
            });
        }

        // Breach burst — spawned later
        function fireBreach() {
            if (breachFired) return;
            breachFired = true;
            const cx = w / 2, cy = h / 2;
            for (let i = 0; i < PARTICLES.burstCount; i++) {
                const angle = (Math.random() - 0.5) * Math.PI * 0.6; // mostly horizontal spread
                const speed = Math.random() * 1.8 + 0.4;
                const side = Math.random() > 0.5 ? 1 : -1;
                pool.push({
                    type: "breach",
                    x: cx + (Math.random() - 0.5) * 40,
                    y: cy + (Math.random() - 0.5) * 4,
                    size: Math.random() * 1.2 + 0.3,
                    vx: Math.cos(angle) * speed * side,
                    vy: Math.sin(angle) * speed * 0.3 + (Math.random() - 0.5) * 0.5,
                    alpha: Math.random() * 0.5 + 0.3,
                    life: 1.0,
                    decay: Math.random() * 0.006 + 0.003,
                });
            }
        }

        function frame() {
            ctx.clearRect(0, 0, w, h);

            for (let i = pool.length - 1; i >= 0; i--) {
                const p = pool[i];

                p.x += p.vx;
                p.y += p.vy;

                if (p.type === "ambient") {
                    // Fade in ambient particles gradually
                    if (p.alpha < p.alphaTarget) p.alpha += 0.0005;
                    // Breathing
                    p.alpha += p.breathSpeed * p.breathDir;
                    if (p.alpha > p.alphaTarget + 0.06) p.breathDir = -1;
                    if (p.alpha < p.alphaTarget - 0.04) p.breathDir = 1;
                    // Wrap
                    if (p.x < -10) p.x = w + 10;
                    if (p.x > w + 10) p.x = -10;
                    if (p.y < -10) p.y = h + 10;
                    if (p.y > h + 10) p.y = -10;
                } else {
                    // Breach sparks — decelerate and fade
                    p.vx *= 0.993;
                    p.vy *= 0.993;
                    p.life -= p.decay;
                    p.alpha = Math.max(0, p.life * 0.6);
                    if (p.life <= 0) { pool.splice(i, 1); continue; }
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(220, 220, 230, ${Math.max(0, p.alpha)})`;
                ctx.fill();
            }

            requestAnimationFrame(frame);
        }
        frame();

        return { fireBreach };
    }

    /* ═══════════════════════════════════════════
       4. MASTER TIMELINE — GSAP
       Four-act structure. Every tween placed
       at an absolute position on the timeline.
       ═══════════════════════════════════════════ */
    function runAnimation(particleSystem) {
        const allChars = Array.from(document.querySelectorAll(".char"));
        const orderedChars = getCenterOutwardChars();

        // Measure the rendered title width so the breach line matches it
        gsap.set(titleEl, { opacity: 0, visibility: "hidden" });
        titleEl.style.opacity = "0";
        titleEl.style.visibility = "hidden";
        titleEl.style.display = "flex";
        const titleWidth = titleEl.offsetWidth;
        titleEl.style.display = "";
        titleEl.style.visibility = "";
        titleEl.style.opacity = "";
        gsap.set(titleEl, { clearProps: "visibility", opacity: 0 });

        const breachTargetWidth = titleWidth + 20; // slight overshoot past text edges
        const breachFadeWidth = titleWidth + Math.min(window.innerWidth * 0.15, 200);

        const tl = gsap.timeline();

        /* ─── ACT I: THE VOID ─── */

        // Grain fades in from darkness
        tl.to(grainEl, {
            opacity: 0.05,
            duration: 3.0,
            ease: "power1.inOut",
        }, 0.3);

        // Vignette settles in
        tl.to(vignetteEl, {
            opacity: 1,
            duration: 4.0,
            ease: "power1.inOut",
        }, 0.5);

        // Particles canvas fades in
        tl.to(partEl, {
            opacity: 0.7,
            duration: 3.0,
            ease: "power1.inOut",
        }, 0.8);

        /* ─── ACT II: THE BREACH ─── */

        // Light line appears
        tl.to(breachEl, {
            opacity: 1,
            duration: 0.3,
            ease: "power2.in",
        }, TIMING.breachStart);

        // Light line grows from 0 → match text width (equal on both sides)
        tl.to(breachEl, {
            width: breachTargetWidth,
            duration: TIMING.breachGrow,
            ease: "power2.inOut",
        }, TIMING.breachStart + 0.1);

        // Glow intensifies as line grows
        tl.fromTo(breachGlow, {
            opacity: 0.3,
        }, {
            opacity: 1,
            duration: TIMING.breachGrow * 0.7,
            ease: "power2.in",
        }, TIMING.breachStart + 0.2);

        // Fire breach particles
        tl.call(() => particleSystem.fireBreach(), null, TIMING.particleBurst);

        // Breach glow pulse — a subtle throb before text emerges
        tl.to(breachGlow, {
            opacity: 1.4,
            duration: 0.3,
            ease: "power2.in",
            yoyo: true,
            repeat: 1,
        }, TIMING.textFadeStart - 0.4);

        /* ─── ACT III: THE EMERGENCE ─── */

        // Title container becomes visible
        tl.to(titleEl, {
            opacity: 1,
            duration: 0.01,
        }, TIMING.textFadeStart);

        // Characters emerge: blur(14px) + brightness(2) → blur(0) + brightness(1)
        // Staggered from center outward
        tl.to(orderedChars, {
            opacity: 1,
            filter: "blur(0px) brightness(1)",
            translateZ: 0,
            scale: 1,
            duration: TIMING.textRevealDur,
            stagger: TIMING.charStagger,
            ease: "power3.out",
        }, TIMING.textFadeStart);

        // During emergence, characters have a warm glow that fades
        // (text-shadow animated separately for layered control)
        tl.fromTo(allChars, {
            textShadow: "0 0 40px rgba(255,252,245,0.5), 0 0 80px rgba(255,252,245,0.2)",
        }, {
            textShadow: "0 0 15px rgba(220,220,230,0.1), 0 0 40px rgba(200,200,210,0.04)",
            duration: TIMING.textRevealDur + 1.0,
            stagger: TIMING.charStagger,
            ease: "power2.inOut",
        }, TIMING.textFadeStart);

        /* ── Crystallization — clean transition, no flash ── */

        /* ─── ACT IV: THE SETTLING ─── */

        // Breach fades — the light condenses into the text
        tl.to(breachEl, {
            opacity: 0,
            width: breachFadeWidth, // continues expanding as it fades, like dissipating
            duration: 2.0,
            ease: "power2.inOut",
        }, TIMING.breachFadeStart);

        // Pulse ring — a single expanding ring of light
        tl.to(pulseEl, {
            opacity: 0.6,
            duration: 0.1,
        }, TIMING.crystallizeAt + 0.05);
        tl.to(pulseEl, {
            scale: 5,
            opacity: 0,
            duration: 2.5,
            ease: "power2.out",
        }, TIMING.crystallizeAt + 0.1);

        /* ─── FINAL STATE — completely static ─── */
        // Text stays perfectly still after settling. No breathing. No drift.
    }

    /* ─── Boot ─── */
    document.addEventListener("DOMContentLoaded", () => {
        splitText();
        initGrain();
        const particleSystem = initParticles();
        runAnimation(particleSystem);
    });

})();
