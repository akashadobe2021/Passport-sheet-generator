/**
 * Utility to generate a high-definition sample passport photo for testing
 * Renders an official Indian passport style studio headshot onto a high-res canvas (1200x1500 px)
 */

export function generateSamplePassportPhoto(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Studio backdrop: subtle clean off-white / light neutral studio gradient
  const bgGrad = ctx.createRadialGradient(600, 500, 100, 600, 750, 800);
  bgGrad.addColorStop(0, '#FFFFFF');
  bgGrad.addColorStop(0.7, '#F8FAFC');
  bgGrad.addColorStop(1, '#EEF2F6');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 1500);

  // 2. Subtle soft studio rim lighting
  ctx.save();

  // Shoulders & Formal Dark Navy Blue Suit/Blazer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.moveTo(100, 1500);
  ctx.bezierCurveTo(200, 1200, 420, 1100, 480, 1060);
  ctx.lineTo(720, 1060);
  ctx.bezierCurveTo(780, 1100, 1000, 1200, 1100, 1500);
  ctx.closePath();
  ctx.fill();

  // White formal shirt collar
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(520, 1060);
  ctx.lineTo(600, 1180);
  ctx.lineTo(680, 1060);
  ctx.lineTo(650, 970);
  ctx.lineTo(550, 970);
  ctx.closePath();
  ctx.fill();

  // Dark tie / collar notch
  ctx.fillStyle = '#0F172A';
  ctx.beginPath();
  ctx.moveTo(585, 1100);
  ctx.lineTo(615, 1100);
  ctx.lineTo(625, 1500);
  ctx.lineTo(575, 1500);
  ctx.closePath();
  ctx.fill();

  // Neck
  ctx.fillStyle = '#BA7A4F';
  ctx.beginPath();
  ctx.moveTo(520, 800);
  ctx.lineTo(520, 1000);
  ctx.quadraticCurveTo(600, 1030, 680, 1000);
  ctx.lineTo(680, 800);
  ctx.closePath();
  ctx.fill();

  // Neck shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.moveTo(520, 800);
  ctx.quadraticCurveTo(600, 860, 680, 800);
  ctx.lineTo(680, 860);
  ctx.quadraticCurveTo(600, 920, 520, 860);
  ctx.closePath();
  ctx.fill();

  // Head / Face Oval
  ctx.fillStyle = '#C6865A';
  ctx.beginPath();
  ctx.ellipse(600, 640, 230, 310, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw refinement
  ctx.fillStyle = '#C6865A';
  ctx.beginPath();
  ctx.moveTo(400, 650);
  ctx.quadraticCurveTo(420, 870, 600, 910);
  ctx.quadraticCurveTo(780, 870, 800, 650);
  ctx.closePath();
  ctx.fill();

  // Soft cheek highlights
  const cheekGrad = ctx.createRadialGradient(600, 670, 50, 600, 670, 220);
  cheekGrad.addColorStop(0, 'rgba(235, 160, 115, 0.35)');
  cheekGrad.addColorStop(1, 'rgba(160, 95, 55, 0.15)');
  ctx.fillStyle = cheekGrad;
  ctx.beginPath();
  ctx.ellipse(600, 670, 220, 290, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ears
  ctx.fillStyle = '#BA7A4F';
  ctx.beginPath();
  ctx.ellipse(365, 660, 28, 65, -0.08, 0, Math.PI * 2);
  ctx.ellipse(835, 660, 28, 65, 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Hair (Professional, neat side part)
  ctx.fillStyle = '#181311';
  ctx.beginPath();
  ctx.moveTo(370, 630);
  ctx.bezierCurveTo(360, 420, 480, 330, 600, 330);
  ctx.bezierCurveTo(740, 330, 840, 420, 830, 630);
  ctx.bezierCurveTo(800, 500, 720, 430, 600, 430);
  ctx.bezierCurveTo(490, 430, 410, 500, 370, 630);
  ctx.closePath();
  ctx.fill();

  // Hair volume top
  ctx.beginPath();
  ctx.ellipse(600, 400, 240, 100, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#221915';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  // Left eyebrow
  ctx.beginPath();
  ctx.moveTo(480, 570);
  ctx.quadraticCurveTo(530, 550, 575, 565);
  ctx.stroke();
  // Right eyebrow
  ctx.beginPath();
  ctx.moveTo(720, 570);
  ctx.quadraticCurveTo(670, 550, 625, 565);
  ctx.stroke();

  // Eyes (White base)
  ctx.fillStyle = '#FAFAF9';
  // Left eye
  ctx.beginPath();
  ctx.ellipse(525, 615, 32, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(675, 615, 32, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Irises (Dark brown / hazel)
  ctx.fillStyle = '#321D12';
  ctx.beginPath();
  ctx.arc(525, 615, 16, 0, Math.PI * 2);
  ctx.arc(675, 615, 16, 0, Math.PI * 2);
  ctx.fill();

  // Pupils
  ctx.fillStyle = '#0F0B08';
  ctx.beginPath();
  ctx.arc(525, 615, 9, 0, Math.PI * 2);
  ctx.arc(675, 615, 9, 0, Math.PI * 2);
  ctx.fill();

  // Catchlights in eyes
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(528, 611, 4, 0, Math.PI * 2);
  ctx.arc(678, 611, 4, 0, Math.PI * 2);
  ctx.fill();

  // Eyelids
  ctx.strokeStyle = '#633A20';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(525, 614, 33, Math.PI * 1.15, Math.PI * 1.85);
  ctx.arc(675, 614, 33, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = '#A8683E';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(595, 610);
  ctx.lineTo(590, 715);
  ctx.quadraticCurveTo(600, 735, 610, 730);
  ctx.stroke();

  // Nostrils
  ctx.fillStyle = '#734020';
  ctx.beginPath();
  ctx.ellipse(580, 730, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.ellipse(620, 730, 8, 4, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Lips (Neutral closed expression per passport requirements)
  ctx.fillStyle = '#A45842';
  // Upper lip
  ctx.beginPath();
  ctx.moveTo(545, 800);
  ctx.quadraticCurveTo(600, 785, 655, 800);
  ctx.quadraticCurveTo(600, 808, 545, 800);
  ctx.fill();
  // Lower lip
  ctx.fillStyle = '#B86550';
  ctx.beginPath();
  ctx.moveTo(548, 802);
  ctx.quadraticCurveTo(600, 830, 652, 802);
  ctx.quadraticCurveTo(600, 810, 548, 802);
  ctx.fill();

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}
