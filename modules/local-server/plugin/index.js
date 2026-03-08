const { withAndroidManifest } = require('@expo/config-plugins');

function withLocalServer(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      return modConfig;
    }

    application.$ = application.$ || {};
    application.$['android:enableOnBackInvokedCallback'] = 'false';
    application.service = application.service || [];

    const serviceName = 'expo.modules.localserver.LocalServerForegroundService';
    const exists = application.service.some(
      (s) => s.$?.['android:name'] === serviceName
    );

    if (!exists) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
    }

    return modConfig;
  });
}

module.exports = withLocalServer;
