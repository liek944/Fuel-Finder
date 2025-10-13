const fs = require('fs');
const path = require('path');

// This script requires sharp package to be installed
// Run: npm install --save-dev sharp

async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    const logoPath = path.join(__dirname, 'public', 'logo.jpeg');
    const publicDir = path.join(__dirname, 'public');
    
    console.log('Generating icons from logo.jpeg...');
    
    // Generate 192x192 PNG for PWA
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'logo192.png'));
    console.log('✓ Generated logo192.png');
    
    // Generate 512x512 PNG for PWA
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'logo512.png'));
    console.log('✓ Generated logo512.png');
    
    // Generate favicon.ico (32x32)
    await sharp(logoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toFile(path.join(publicDir, 'favicon-32.png'));
    console.log('✓ Generated favicon-32.png (convert to .ico manually or use online tool)');
    
    console.log('\n✅ Icon generation complete!');
    console.log('\nNote: For favicon.ico, you can:');
    console.log('1. Use an online converter like https://convertio.co/png-ico/');
    console.log('2. Or install imagemagick and run: convert favicon-32.png favicon.ico');
    
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('❌ Error: sharp package not found.');
      console.error('\nPlease install sharp first:');
      console.error('  npm install --save-dev sharp');
      console.error('\nThen run this script again:');
      console.error('  node generate-icons.js');
    } else {
      console.error('❌ Error generating icons:', error.message);
    }
    process.exit(1);
  }
}

generateIcons();
