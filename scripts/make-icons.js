   const sharp = require('sharp');
   const dir = 'assets/images/';
   const jobs = [
     ['icon.svg', 'icon.png', 1024, 1024],
     ['adaptive-icon.svg', 'adaptive-icon.png', 1024, 1024],
     ['splash.svg', 'splash.png', 1284, 1284],
     ['favicon.svg', 'favicon.png', 128, 128],
   ];
   (async () => {
     for (const [src, out, w, h] of jobs) {
       await sharp(dir + src, { density: 300 })
         .resize(w, h, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
         .png()
         .toFile(dir + out);
       console.log('made', out);
     }
   })();