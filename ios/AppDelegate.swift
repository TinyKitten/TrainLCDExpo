//
//  AppDelegate.swift
//  TrainLCD
//
//  Created by Tsubasa SEKIGUCHI on 2023/10/16.
//  Copyright © 2023 Facebook. All rights reserved.
//

import Foundation
import UIKit
import Firebase
import MetricKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var bridge: RCTBridge!
  
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions:
    [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    let jsCodeLocation: URL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    let rootView = RCTRootView(bundleURL: jsCodeLocation, moduleName: "main", initialProperties: nil, launchOptions: launchOptions)
    let rootViewController = UIViewController()
    rootViewController.view = rootView

    self.window = UIWindow(frame: UIScreen.main.bounds)
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()
    
    MXMetricManager.shared.add(self)
    FirebaseApp.configure()
    
    return true
  }
  
  func applicationWillTerminate(_ application: UIApplication) {
    MXMetricManager.shared.remove(self)
  }
}

extension AppDelegate: MXMetricManagerSubscriber {
  func didReceive(_ payloads: [MXMetricPayload]) {}
}
