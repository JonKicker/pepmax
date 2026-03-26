/**
 * withWatchConnectivity.js — Expo config plugin
 *
 * Copies the WatchConnectivity bridge source files from ios-native/PepMax/
 * into ios/{appName}/ and registers them with the Xcode project.
 *
 * What this handles automatically:
 *   - Copying PepMax-Bridging-Header.h, WatchSessionManager.swift,
 *     WatchConnectivityModule.swift, WatchConnectivityModule.m into ios/PepMax/
 *   - Adding those files to the PepMax Xcode target (resolved by name, not position)
 *   - Setting SWIFT_OBJC_BRIDGING_HEADER and SWIFT_VERSION build settings
 *   - Linking WatchConnectivity.framework to the phone target only
 *
 * What requires manual Xcode steps (documented in FEATURE_TRACKER.md):
 *   - Creating the "PepMaxWatch" WatchKit app target
 *   - Watch app source files live in ios-native/PepMaxWatch Watch App/ —
 *     copy them into the target directory created by Xcode
 *
 * IMPORTANT: Use `npx expo prebuild` (not --clean) after the initial
 * manual Xcode watch target setup to avoid wiping ios/.
 */

const { withXcodeProject } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const PHONE_SIDE_FILES = [
  'PepMax-Bridging-Header.h',
  'WatchSessionManager.swift',
  'WatchConnectivityModule.swift',
  'WatchConnectivityModule.m',
];

/**
 * Resolve the Xcode target UUID for the phone app by name.
 * Using getFirstTarget() is unsafe after the watch target is added —
 * target order in project.pbxproj is not guaranteed.
 */
function getPhoneTargetUuid(project, appName) {
  const nativeTargets = project.pbxNativeTargetSection();
  const entry = Object.entries(nativeTargets).find(
    ([key, t]) => !key.endsWith('_comment') && t?.name === appName
  );
  if (!entry) {
    throw new Error(
      `[withWatchConnectivity] Could not find Xcode target named "${appName}". ` +
      `Check that the app name matches the target in Xcode.`
    );
  }
  return entry[0];
}

/**
 * Check whether a file is already registered in the Xcode project.
 * Uses pbxFileReferenceSection() — pbxFileByName() does not exist on the xcode package.
 */
function isFileRegistered(project, fileName) {
  const fileRefs = project.pbxFileReferenceSection();
  return Object.values(fileRefs).some(
    (ref) => ref?.path === fileName || ref?.name === fileName
  );
}

const withWatchConnectivity = (config) => {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectRoot = cfg.modRequest.projectRoot;
    const appName = cfg.modRequest.projectName ?? 'PepMax';

    const sourceDir = path.join(projectRoot, 'ios-native', 'PepMax');
    const destDir = path.join(projectRoot, 'ios', appName);

    // ── 1. Resolve phone app target UUID by name (not position) ──────────────

    const targetUuid = getPhoneTargetUuid(project, appName);

    // ── 2. Copy source files from ios-native/ into ios/{appName}/ ────────────

    for (const fileName of PHONE_SIDE_FILES) {
      const src = path.join(sourceDir, fileName);
      const dest = path.join(destDir, fileName);

      if (!fs.existsSync(src)) {
        console.warn(`[withWatchConnectivity] Source not found: ${src}`);
        continue;
      }

      fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(src, dest);
    }

    // ── 3. Register files with Xcode project (idempotent) ────────────────────

    for (const fileName of PHONE_SIDE_FILES) {
      if (isFileRegistered(project, fileName)) continue;

      if (fileName.endsWith('.h')) {
        project.addHeaderFile(fileName, { public: false }, appName);
      } else {
        project.addSourceFile(fileName, { target: targetUuid }, appName);
      }
    }

    // ── 4. Set bridging header + Swift version build settings ─────────────────

    const bridgingHeaderValue = `"${appName}/${appName}-Bridging-Header.h"`;

    const nativeTargets = project.pbxNativeTargetSection();
    for (const [key, target] of Object.entries(nativeTargets)) {
      if (key.endsWith('_comment') || !target?.name) continue;
      if (target.name !== appName) continue; // phone target only

      const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
      if (!configList) continue;

      for (const ref of configList.buildConfigurations ?? []) {
        const buildConfig = project.pbxXCBuildConfigurationSection()[ref.value];
        if (!buildConfig?.buildSettings) continue;
        buildConfig.buildSettings.SWIFT_OBJC_BRIDGING_HEADER = bridgingHeaderValue;
        buildConfig.buildSettings.SWIFT_VERSION = '"5.0"';
      }
    }

    // ── 5. Link WatchConnectivity.framework to phone target only ─────────────

    const frameworkPhase = project.pbxFrameworksBuildPhaseObj(targetUuid);
    const alreadyLinked = (frameworkPhase?.files ?? []).some((f) => {
      const ref = project.pbxFileReferenceSection()[f.value];
      return ref?.path?.includes('WatchConnectivity');
    });

    if (!alreadyLinked) {
      project.addFramework('WatchConnectivity.framework', {
        weak: false,
        target: targetUuid,
      });
    }

    return cfg;
  });
};

module.exports = withWatchConnectivity;
