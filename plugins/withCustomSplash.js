const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withCustomSplash(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const srcImage = path.join(projectRoot, 'assets', 'images', 'splash-screen.png');

      // Find the SplashScreenLegacy imageset in the ios project
      const iosDir = path.join(projectRoot, 'ios');
      const entries = fs.readdirSync(iosDir);
      const appDir = entries.find(
        (e) => e !== 'Pods' && e !== 'build' && fs.statSync(path.join(iosDir, e)).isDirectory()
      );

      if (appDir) {
        const imagesetDir = path.join(
          iosDir, appDir, 'Images.xcassets', 'SplashScreenLegacy.imageset'
        );

        if (fs.existsSync(imagesetDir)) {
          const srcBuffer = fs.readFileSync(srcImage);
          for (const fname of ['image.png', 'image@2x.png', 'image@3x.png']) {
            fs.writeFileSync(path.join(imagesetDir, fname), srcBuffer);
          }
          console.log('✅ Custom splash image applied');
        }
      }

      return config;
    },
  ]);
}

module.exports = withCustomSplash;
