/**
 * Client-side sample photo generator.
 * Creates an elegant high-resolution abstract architectural photo entirely offline.
 */

export function createSamplePhotoBlob(): Promise<Blob> {
  return new Promise((resolve) => {
    const width = 1200;
    const height = 1800;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    // 1. Dark minimalist gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0f14');
    bgGrad.addColorStop(0.5, '#161b26');
    bgGrad.addColorStop(1, '#06070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Geometric architectural sculpture / forms
    // Soft ambient glow
    const glow = ctx.createRadialGradient(
      width * 0.45,
      height * 0.35,
      50,
      width * 0.45,
      height * 0.35,
      700
    );
    glow.addColorStop(0, 'rgba(230, 200, 160, 0.18)');
    glow.addColorStop(0.5, 'rgba(120, 150, 180, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    // Diagonal architectural monoliths
    ctx.save();
    ctx.translate(width * 0.5, height * 0.5);
    ctx.rotate(-0.25);

    // Main pillar
    const pillarGrad = ctx.createLinearGradient(-300, -500, 300, 500);
    pillarGrad.addColorStop(0, '#f2ece4');
    pillarGrad.addColorStop(0.35, '#a69d95');
    pillarGrad.addColorStop(0.7, '#2c2d30');
    pillarGrad.addColorStop(1, '#111215');
    ctx.fillStyle = pillarGrad;
    ctx.beginPath();
    ctx.roundRect(-240, -550, 480, 1100, 24);
    ctx.fill();

    // Inner shadow cut
    const cutGrad = ctx.createLinearGradient(-180, -400, 180, 400);
    cutGrad.addColorStop(0, 'rgba(20, 22, 28, 0.95)');
    cutGrad.addColorStop(1, 'rgba(40, 45, 55, 0.4)');
    ctx.fillStyle = cutGrad;
    ctx.beginPath();
    ctx.roundRect(-160, -450, 320, 900, 16);
    ctx.fill();

    ctx.restore();

    // 3. Subtle typography / minimal artistic caption
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '300 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '8px';
    ctx.fillText('SAHASRA MONOLITH', 100, height - 140);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '300 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText('STUDIO COLLECTION · 01', 100, height - 105);

    canvas.toBlob((blob) => {
      resolve(blob || new Blob());
    }, 'image/jpeg', 0.95);
  });
}
