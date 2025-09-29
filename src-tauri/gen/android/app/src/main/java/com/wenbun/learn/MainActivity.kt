package com.wenbun.learn

import android.os.Bundle
import androidx.core.content.ContextCompat
import com.wenbun.learn.R
// import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    
    // Set status bar color to your theme color
    window.statusBarColor = ContextCompat.getColor(this, R.color.wenbun_blue)
    
    // Optional: set icons to dark or light depending on contrast
    // true -> light icons, false -> dark icons
    val decorView = window.decorView
    decorView.systemUiVisibility = decorView.systemUiVisibility and
        android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv()
  }
}
