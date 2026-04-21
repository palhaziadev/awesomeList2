export default {
  // app.json and app.config.js when both files exist, app.config.js takes precedence
  expo: {
    name: "awesomeList2",
    slug: "awesomeList2",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "awesomelist2",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    plugins: [
      "@react-native-google-signin/google-signin",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      // TODO: maybe not needed
      "expo-secure-store",
    ],
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.palhaziadev.awesomelist2",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      router: {},
      eas: {
        projectId: "715b3160-a2a6-4095-a88d-c274aa5c9ef7",
      },
    },
    owner: "palhaziadev",
  },
  //   name: "awesomeList2",
  //   slug: "awesomeList2",
  //   version: "1.0.0",
  //   orientation: "portrait",
  //   extra: {
  //     // if it never changes belongs to app.json
  //     supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  //     supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  //     eas: {
  //       projectId: "715b3160-a2a6-4095-a88d-c274aa5c9ef7",
  //     },
  //   },
  // },
};
