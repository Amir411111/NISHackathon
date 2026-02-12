const appJson = require("./app.json");

const config = appJson.expo;
const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

if (googleMapsApiKey) {
  config.android = {
    ...(config.android || {}),
    config: {
      ...((config.android && config.android.config) || {}),
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  };

  config.ios = {
    ...(config.ios || {}),
    config: {
      ...((config.ios && config.ios.config) || {}),
      googleMapsApiKey,
    },
  };
}

module.exports = { expo: config };
