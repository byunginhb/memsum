const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// 릴리스 AAB를 업로드 키스토어로 서명하도록 android/app/build.gradle을 패치한다.
// 시크릿은 gradle 프로퍼티(-P 또는 ~/.gradle/gradle.properties)로 주입 → 저장소엔 안 들어간다.
// android/가 gitignore(Expo CNG)라, expo prebuild 때마다 이 플러그인이 서명 설정을 다시 적용한다.
// 프로퍼티가 없으면(로컬 개발·툴체인 점검) 기존처럼 debug 키로 서명된다.
// 절차·키 위치: docs/store/mobile-app.md
const RELEASE_SIGNING = `        release {
            if (project.hasProperty('MEMSUM_STORE_FILE')) {
                storeFile file(MEMSUM_STORE_FILE)
                storePassword MEMSUM_STORE_PASSWORD
                keyAlias MEMSUM_KEY_ALIAS
                keyPassword MEMSUM_KEY_PASSWORD
            }
        }
`;

// Play 콘솔 "DEX 코드 최적화 기준 미만" 경고 대응: 릴리스 빌드에 R8 코드 축소·난독화 + 리소스 축소.
// build.gradle이 이 두 프로퍼티를 읽어 minifyEnabled/shrinkResources에 반영한다(RN·Expo 기본 proguard 규칙 포함).
const RELEASE_PROPERTIES = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

module.exports = function withReleaseSigning(config) {
  config = withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(RELEASE_PROPERTIES)) {
      const item = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item) item.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
  return withAppBuildGradle(config, (cfg) => {
    let c = cfg.modResults.contents;
    if (!c.includes('MEMSUM_STORE_FILE')) {
      c = c.replace(/signingConfigs\s*\{\n/, (m) => m + RELEASE_SIGNING);
      c = c.replace(
        'signingConfig signingConfigs.debug\n            def enableShrinkResources',
        "signingConfig project.hasProperty('MEMSUM_STORE_FILE') ? signingConfigs.release : signingConfigs.debug\n            def enableShrinkResources",
      );
    }
    // 치환 검증: Expo 템플릿이 바뀌어 위 문자열이 안 맞으면 replace가 조용히 아무것도 안 해,
    // 릴리스 AAB가 debug 키로 서명된 채 나간다(콘솔 거부). prebuild 단계에서 바로 실패시킨다.
    if (!/release\s*\{\s*if \(project\.hasProperty\('MEMSUM_STORE_FILE'\)\)/.test(c)) {
      throw new Error('[withReleaseSigning] signingConfigs.release 블록을 build.gradle에 넣지 못했습니다(템플릿 변경 확인).');
    }
    if (!c.includes('? signingConfigs.release : signingConfigs.debug')) {
      throw new Error('[withReleaseSigning] release 빌드가 signingConfigs.release를 쓰도록 바꾸지 못했습니다(템플릿 변경 확인).');
    }
    cfg.modResults.contents = c;
    return cfg;
  });
};
