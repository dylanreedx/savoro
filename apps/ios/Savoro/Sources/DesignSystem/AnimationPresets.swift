import SwiftUI

// MARK: - Savoro Design Tokens — Animation

enum AnimationPresets {
    /// Default spring for most interactions.
    static let spring    = Animation.spring(response: 0.35, dampingFraction: 0.8)

    /// Slower, softer spring for large-area transitions.
    static let gentle    = Animation.spring(response: 0.5, dampingFraction: 0.85)

    /// Quick, crisp spring for small UI feedback.
    static let snappy    = Animation.spring(response: 0.28, dampingFraction: 0.75)

    /// Pronounced overshoot for playful moments.
    static let bouncy    = Animation.spring(response: 0.4, dampingFraction: 0.6)

    /// Classic ease-out for fades and simple transitions.
    static let easeOut   = Animation.easeOut(duration: 0.25)

    /// Symmetrical ease for modal-style transitions.
    static let easeInOut = Animation.easeInOut(duration: 0.3)
}
