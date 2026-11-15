plugins {
    id("com.android.application")
}
android {
    namespace = "pro.educart.gestao"
    compileSdk = 35
    defaultConfig {
        applicationId = "pro.educart.gestao"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.1.0-candidata"
    }
    buildTypes {
        getByName("release") { isMinifyEnabled = false }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
