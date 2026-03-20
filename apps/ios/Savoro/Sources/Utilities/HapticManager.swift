import UIKit

// MARK: - HapticManager

@MainActor
final class HapticManager {
    static let shared = HapticManager()

    private var impactGenerators: [UIImpactFeedbackGenerator.FeedbackStyle: UIImpactFeedbackGenerator] = [:]
    private var selectionGenerator: UISelectionFeedbackGenerator?
    private var notificationGenerator: UINotificationFeedbackGenerator?

    private init() {}

    // MARK: Core

    func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let generator = impactGenerator(for: style)
        generator.impactOccurred()
    }

    func selection() {
        if selectionGenerator == nil {
            selectionGenerator = UISelectionFeedbackGenerator()
            selectionGenerator?.prepare()
        }
        selectionGenerator?.selectionChanged()
    }

    func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        if notificationGenerator == nil {
            notificationGenerator = UINotificationFeedbackGenerator()
            notificationGenerator?.prepare()
        }
        notificationGenerator?.notificationOccurred(type)
    }

    // MARK: Convenience

    func light()   { impact(.light) }
    func medium()  { impact(.medium) }
    func heavy()   { impact(.heavy) }
    func success() { notification(.success) }
    func warning() { notification(.warning) }
    func error()   { notification(.error) }

    // MARK: Private

    private func impactGenerator(
        for style: UIImpactFeedbackGenerator.FeedbackStyle
    ) -> UIImpactFeedbackGenerator {
        if let existing = impactGenerators[style] {
            return existing
        }
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.prepare()
        impactGenerators[style] = generator
        return generator
    }
}
