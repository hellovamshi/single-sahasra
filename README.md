# Sahasra Single

> **Mobile-first interactive folding experience**  
> Production URL: [https://single.sahasra.tech](https://single.sahasra.tech)

**Sahasra Single** turns any user photo into an organic, interactive physical fold. When running on a mobile device, rolling the phone physically to the left or right folds the image away from the screen edge as if the phone’s display itself is folding like a physical substrate. On desktop, unified pointer and touch tracking provide an equivalent fluid experience.

---

## Technical Highlights

1. **WebGL 2 & GLSL Shaders**:
   - Custom vertex shader with 3D virtual hinge mathematics and perspective projection.
   - Organic bend curvature easing near the hinge axis combined with rigid planar rotation.
   - Hardware progressive defocus blur powered by GPU mipmaps (`textureLod`) with multi-tap Poisson disc anti-aliasing.
   - Dynamic oleophobic glass reflection that moves dynamically with device tilt angle.
   - Ambient contact crease shadow and depth attenuation fading seamlessly into the pitch-black void (`#000000`).

2. **Decoupled 60 FPS Render Loop**:
   - The WebGL rendering loop operates independently from React state using mutable refs and `requestAnimationFrame`.
   - Zero React re-renders per animation frame, guaranteeing rock-solid 60 FPS performance on iOS and Android.

3. **Unified Input Controller**:
   - **Mobile**: Native `DeviceOrientation` tracking with roll (`gamma`) angle detection, iOS 13+ permission flow, baseline recalibration, and dead-zone noise suppression.
   - **Desktop**: Mouse position, hover tilt, and click-drag folding interaction.
   - **Zero-Pop Hinge Switching**: Smooth interpolation through neutral flat state before switching hinge sides.

4. **100% Client-Side Privacy**:
   - Zero server image uploads or processing APIs.
   - Images remain exclusively on-device in browser memory and local IndexedDB for return visits.

5. **Installable PWA**:
   - Web App Manifest (`manifest.json`) with standalone display mode.
   - iOS status bar translucent configuration for true full-bleed edge-to-edge experience.
   - High-resolution adaptive icon set.

---

## Project Structure

```
d:/sahasra tech web app/
├── public/
│   ├── favicon.ico
│   ├── manifest.json
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── apple-touch-icon.png
│       └── og-image.png
├── src/
│   ├── app/
│   │   ├── globals.css                # Pure black theme, safe area insets, typography
│   │   ├── layout.tsx                 # PWA metadata, viewport, OpenGraph tags
│   │   └── page.tsx                   # Top-level view coordinator (Landing vs Fold)
│   ├── components/
│   │   ├── ControlsOverlay.tsx        # Floating minimal [Reset] & [Change photo] controls
│   │   ├── ErrorNotice.tsx            # Graceful WebGL and sensor error dialog
│   │   ├── FoldCanvas.tsx             # Canvas host wiring renderer and input controller
│   │   ├── LandingView.tsx            # Minimalist hero screen with image upload
│   │   ├── MotionPermissionModal.tsx  # iOS user-gesture permission prompt
│   │   └── PrivacyBadge.tsx           # "Your photo stays on your device."
│   ├── hooks/
│   │   ├── useReducedMotion.ts        # Accessibility prefers-reduced-motion hook
│   │   └── useWindowSize.ts           # Window dimension & orientation listener
│   ├── motion/
│   │   ├── inputController.ts         # Unified input coordinator with lerp smoothing
│   │   ├── orientation.ts             # DeviceOrientation listener & iOS permission
│   │   ├── pointerInput.ts            # Pointer, touch drag, and keyboard fallback
│   │   └── types.ts                   # Motion and fold state interfaces
│   ├── storage/
│   │   └── imageStorage.ts            # Local IndexedDB persistence for offline visits
│   ├── utils/
│   │   ├── imageProcessing.ts         # Texture downscaling & EXIF orientation
│   │   ├── math.ts                    # Clamp, lerp, and 4x4 perspective matrix math
│   │   └── sampleImage.ts             # Procedural offline sample image generator
│   └── webgl/
│       ├── glUtils.ts                 # Shader compilation and 256-column mesh generator
│       ├── renderer.ts                # WebGL 2 master renderer & RAF loop
│       ├── textureUtils.ts            # Mipmap generation and memory cleanup
│       └── shaders/
│           ├── vertex.glsl            # 3D virtual hinge fold geometry
│           ├── fold.frag.glsl         # Progressive blur, glass sheen, and void fade
│           ├── blur.frag.glsl         # Standalone Gaussian blur
│           └── index.ts               # Shader exports
├── next.config.mjs
├── package.json
├── postcss.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Local Development Commands

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run production build & verify
```bash
npm run build
npm run start
```

---

## Vercel Deployment Instructions

1. Push this repository to GitHub / GitLab / Bitbucket.
2. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `sahasra-single` repository.
4. Framework Preset: **Next.js** (automatically detected).
5. Build Command: `npm run build`
6. Output Directory: `.next` (default)
7. Click **Deploy**.

---

## Custom Domain Setup: `single.sahasra.tech`

To configure the domain `single.sahasra.tech`:

1. In the Vercel Dashboard for your project, navigate to **Settings** $\rightarrow$ **Domains**.
2. Enter `single.sahasra.tech` and click **Add**.
3. In your DNS provider (e.g. Cloudflare, Namecheap, Route53, or GoDaddy) for the apex domain `sahasra.tech`:
   - **Type**: `CNAME`
   - **Name / Host**: `single`
   - **Target / Value**: `cname.vercel-dns.com`
   - **TTL**: Auto or 3600
4. Vercel will automatically issue and provision a free SSL/TLS certificate via Let's Encrypt within 60 seconds.

---

## Device & Platform Testing Checklist

### iPhone Safari (Primary Target)
- [x] Initial screen displays "SINGLE" with "Turn your photo into a fold."
- [x] File input allows selection from iPhone Photos library and Camera.
- [x] Tapping "Enable motion" triggers native iOS `DeviceOrientationEvent.requestPermission()`.
- [x] Tilting the phone right folds the sheet around the LEFT hinge.
- [x] Tilting the phone left folds the sheet around the RIGHT hinge.
- [x] Progressive blur deepens towards the receding outer edge without frame drops.
- [x] PWA "Add to Home Screen" opens in full-screen standalone mode without Safari address bar.

### Android Chrome
- [x] Sensors work immediately without manual permission prompt.
- [x] Rolling phone triggers smooth 60 FPS fold.
- [x] PWA install banner displays correctly.

### Desktop Chrome & Safari
- [x] Moving mouse horizontally across screen folds the image towards the edges.
- [x] Clicking and dragging provides intuitive physical fold interaction.
- [x] Arrow keys (`←` and `→`) fold manually for accessibility.
- [x] `[Reset]` restores image to flat position.
- [x] `[Change photo]` cleanly frees GPU textures and returns to landing screen.
- [x] `prefers-reduced-motion` provides an accessible manual slider control.
