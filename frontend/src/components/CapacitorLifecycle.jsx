import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

export default function CapacitorLifecycle() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Configure Status Bar
    const setupStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      } catch (e) {
        // Status bar might not be supported on all webviews
      }
    };
    setupStatusBar();

    // 2. Smoothly fade out Splash Screen after React mounts and paints
    const hideSplash = async () => {
      try {
        await SplashScreen.hide({ fadeOutDuration: 350 });
      } catch (e) {
        // Ignored on web
      }
    };

    // Double RAF ensures React has completed DOM paint before fading out native splash
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        hideSplash();
      });
    });

    // 3. Handle Android Hardware Back Button
    let backListener;
    const setupBackButton = async () => {
      try {
        backListener = await CapApp.addListener('backButton', ({ canGoBack }) => {
          const rootPaths = ['/', '/login', '/employee/dashboard', '/admin/dashboard'];
          if (rootPaths.includes(location.pathname)) {
            CapApp.exitApp();
          } else {
            navigate(-1);
          }
        });
      } catch (e) {
        // Ignored on web
      }
    };
    setupBackButton();

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [location.pathname, navigate]);

  return null;
}
