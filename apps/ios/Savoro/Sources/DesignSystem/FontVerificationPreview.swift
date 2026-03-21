#if DEBUG
import SwiftUI

#Preview("Plus Jakarta Sans — All Weights") {
    VStack(alignment: .leading, spacing: 12) {
        Text("Regular — The quick brown fox")
            .font(SavoroFonts.regular(size: 17))
        Text("Medium — The quick brown fox")
            .font(SavoroFonts.medium(size: 17))
        Text("SemiBold — The quick brown fox")
            .font(SavoroFonts.semibold(size: 17))
        Text("Bold — The quick brown fox")
            .font(SavoroFonts.bold(size: 17))
        Text("ExtraBold — The quick brown fox")
            .font(SavoroFonts.extrabold(size: 17))
    }
    .padding()
}
#endif
