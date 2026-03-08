const { withAndroidManifest } = require('@expo/config-plugins');

function withTransfer(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) {
      return modConfig;
    }

    application.$ = application.$ || {};
    application.$['android:enableOnBackInvokedCallback'] = 'false';
    application.service = application.service || [];

    const workServiceName = 'androidx.work.impl.foreground.SystemForegroundService';
    const hasWorkService = application.service.some(
      (s) => s.$?.['android:name'] === workServiceName
    );

    if (!hasWorkService) {
      application.service.push({
        $: {
          'android:name': workServiceName,
          'android:exported': 'false',
          'android:foregroundServiceType': 'dataSync',
        },
      });
    }

    return modConfig;
  });
}

module.exports = withTransfer;
