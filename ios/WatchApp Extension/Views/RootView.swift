//
//  TopView.swift
//  WatchApp Extension
//
//  Created by TinyKitten on 2020/12/19.
//  Copyright © 2020 Facebook. All rights reserved.
//

import SwiftUI

struct RootView: View {
  let state: String
  let station: Station

  let isJa = Locale.current.languageCode == "ja"

  var body: some View {
    VStack{
      Text(state)
        .multilineTextAlignment(.center)
        .font(.subheadline)
      Text(isJa ? station.name : station.nameR)
          .multilineTextAlignment(.center)
          .font(.title2)
      List {
        ForEach(station.lines) { line in
          Text(isJa ? line.name : line.nameR)
            .listRowBackground(Color.init(hex: line.lineColorC ?? "#000"))
        }
      }
    }
  }
}

struct RootView_Previews: PreviewProvider {
    static var previews: some View {
      RootView(
        state: "ただいま",
        station: sampleStation
      )
    }
}
