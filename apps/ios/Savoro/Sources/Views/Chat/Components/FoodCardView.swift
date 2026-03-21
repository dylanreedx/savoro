import SwiftUI

// MARK: - FoodCardView

/// Verification card shown when AI identifies a food item.
/// Displays food name, source badge, macro breakdown, portion controls,
/// and Log / Not Right action buttons.
struct FoodCardView: View {
    let props: FoodCardProps
    let onLog: (String, String, Double, MealType) -> Void
    let onDismiss: () -> Void

    @State private var state: FoodCardState
    @State private var appeared = false

    init(
        props: FoodCardProps,
        onLog: @escaping (String, String, Double, MealType) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.props = props
        self.onLog = onLog
        self.onDismiss = onDismiss
        _state = State(initialValue: FoodCardState(props: props))
    }

    // MARK: - Computed (delegated to FoodCardState)

    private var displayedCalories: Double { state.displayedCalories }
    private var displayedProtein: Double  { state.displayedProtein }
    private var displayedCarb: Double     { state.displayedCarbs }
    private var displayedFat: Double      { state.displayedFat }

    private var sourceColor: Color {
        switch props.source {
        case .off:    return Color(hex: "#3B82F6")  // blue
        case .usda:   return Color(hex: "#22C55E")  // green
        case .recipe: return SavoroColors.rose       // rose
        case .user:   return SavoroColors.Stone.s500 // stone
        }
    }

    private var sourceLabel: String {
        switch props.source {
        case .off:    return "Open Food Facts"
        case .usda:   return "USDA"
        case .recipe: return "Recipe"
        case .user:   return "My Foods"
        }
    }

    private var quantityFormatted: String {
        state.quantity.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(state.quantity))
            : String(format: "%.1f", state.quantity)
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            headerSection
            macroSection
            if state.servings.count > 1 {
                servingPickerSection
            }
            quantityStepperSection
            actionButtons
        }
        .padding(16)
        .glassCard()
        .opacity(appeared ? 1 : 0)
        .scaleEffect(appeared ? 1 : 0.94)
        .offset(y: appeared ? 0 : 8)
        .onAppear {
            withAnimation(AnimationPresets.spring) {
                appeared = true
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 6) {
                Text(props.name)
                    .font(SavoroFonts.headline)
                    .foregroundStyle(SavoroColors.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)

                if let brand = props.brandName, !brand.isEmpty {
                    Text(brand)
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.textSecondary)
                }
            }

            Spacer()

            // Source pill badge
            Text(sourceLabel)
                .font(SavoroFonts.caption2)
                .foregroundStyle(sourceColor)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(sourceColor.opacity(0.12))
                .clipShape(Capsule())
        }
    }

    // MARK: - Macros

    private var macroSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Text("\(Int(displayedCalories))")
                    .font(SavoroFonts.title3)
                    .foregroundStyle(SavoroColors.textPrimary)
                Text("kcal")
                    .font(SavoroFonts.footnote)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            MacroLineView(
                protein: displayedProtein,
                carb: displayedCarb,
                fat: displayedFat
            )
        }
    }

    // MARK: - Serving Picker

    private var servingPickerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Serving")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)

            Picker("Serving", selection: Binding(
                get: { state.selectedServingId },
                set: { state.selectServing(id: $0) }
            )) {
                ForEach(state.servings, id: \.id) { serving in
                    Text(serving.description).tag(serving.id)
                }
            }
            .pickerStyle(.menu)
            .tint(SavoroColors.textPrimary)
        }
    }

    // MARK: - Quantity Stepper

    private var quantityStepperSection: some View {
        HStack {
            Text("Quantity")
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)

            Spacer()

            HStack(spacing: 12) {
                Button {
                    withAnimation(AnimationPresets.snappy) {
                        state.decrementQuantity()
                    }
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(state.quantity <= FoodCardState.quantityMin ? SavoroColors.Stone.s300 : SavoroColors.textPrimary)
                        .frame(width: 28, height: 28)
                        .background(SavoroColors.Stone.s100)
                        .clipShape(Circle())
                }
                .disabled(state.quantity <= FoodCardState.quantityMin)

                Text(quantityFormatted)
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textPrimary)
                    .frame(minWidth: 32, alignment: .center)
                    .animation(nil, value: state.quantity)

                Button {
                    withAnimation(AnimationPresets.snappy) {
                        state.incrementQuantity()
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(SavoroColors.textPrimary)
                        .frame(width: 28, height: 28)
                        .background(SavoroColors.Stone.s100)
                        .clipShape(Circle())
                }
            }
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 10) {
            // Not Right — outline
            Button {
                onDismiss()
            } label: {
                Text("Not Right")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.Stone.s500)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.clear)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(SavoroColors.Stone.s300, lineWidth: 1)
                    )
            }

            // Log This — rose filled
            Button {
                let payload = state.logPayload()
                onLog(payload.foodId, payload.servingId, payload.quantity, payload.mealType)
            } label: {
                Text("Log This")
                    .font(SavoroFonts.callout)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(SavoroColors.rose)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }
}

// MARK: - Preview

#Preview {
    let props = FoodCardProps(
        foodId: "123",
        name: "Greek Yogurt",
        brandName: "Chobani",
        servingId: "s1",
        servingDescription: "1 container (150g)",
        calories: 130,
        protein: 18,
        carb: 9,
        fat: 3,
        quantity: 1,
        source: .usda,
        servings: [
            FoodCardServing(id: "s1", description: "1 container (150g)", calories: 130, protein: 18, carb: 9, fat: 3),
            FoodCardServing(id: "s2", description: "100g", calories: 87, protein: 12, carb: 6, fat: 2),
        ],
        selectedServingId: "s1"
    )

    FoodCardView(
        props: props,
        onLog: { _, _, _, _ in },
        onDismiss: { }
    )
    .padding()
    .background(SavoroColors.canvas)
}
