const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');

function renderNetworkSecurityXml(domains, pins) {
  const domainEntries = domains
    .map(
      (domain) => `    <domain-config includeSubdomains=\"true\">\n      <domain>${domain}</domain>\n      <pin-set expiration=\"2035-12-31\">\n${pins
        .map((pin) => `        <pin digest=\"SHA-256\">${pin}</pin>`)
        .join('\n')}\n      </pin-set>\n    </domain-config>`
    )
    .join('\n');

  return `<?xml version=\"1.0\" encoding=\"utf-8\"?>
<network-security-config>
  <base-config cleartextTrafficPermitted=\"false\" />
${domainEntries}
</network-security-config>
`;
}

module.exports = function withAndroidNetworkSecurityConfig(config, props = {}) {
  const domains = Array.isArray(props.domains) && props.domains.length
    ? props.domains
    : ['jutaghar.com'];

  const pins = Array.isArray(props.spkiPins) && props.spkiPins.length
    ? props.spkiPins
    : ['AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='];

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const xmlPath = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml');

      fs.mkdirSync(path.dirname(xmlPath), { recursive: true });
      fs.writeFileSync(xmlPath, renderNetworkSecurityXml(domains, pins), 'utf8');

      return modConfig;
    },
  ]);

  return withAndroidManifest(config, (modConfig) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(modConfig.modResults);
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    app.$['android:usesCleartextTraffic'] = 'false';
    return modConfig;
  });
};
