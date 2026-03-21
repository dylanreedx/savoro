import SwiftUI

// MARK: - FoodCardView

/// Verification card shown when AI identifies a food item.
/// Displays food name, source badge, macro breakdown, portion controls,
/// and Log / Not Right action buttons.
struct FoodCardView: View {
    let props: FoodCardProps
    let onLog: (String, String, Double, MealType) -> Void
    let onDismiss: () -> Void

    @State private var selectedServingId: String
    @State private var quantity: Double
    @State private var appeared = false

    init(
        props: FoodCardProps,
        onLog: @escaping (String, String, Double, MealType) -> Void,
        onDismiss: @escaping () -> Void
    ) {
        self.props = props
        self.onLog = onLog
        self.onDismiss = onDismiss
        _selectedServingId = State(initialValue: props.selectedServingId.isEmpty ? (props.servings.first?.id ?? props.servingId) : props.selectedServingId)
        _quantity = State(initialValue: props.quantity > 0 ? props.quantity : 1.0)
    }

    // MARK: - Computed

    private var selectedServing: FoodCardServing? {
        props.servings.first { $0.id == selectedServingId } ?? props.servings.first
    }

    private var displayedCalories: Double {
        let base = selectedServing?.calories ?? props.calories ?? 0
        return base * quantity
    }

    private var displayedProtein: Double {
        let base = selectedServing?.protein ?? props.protein ?? 0
        return base * quantity
    }

    private var displayedCarb: Double {
        let base = selectedServing?.carb ?? props.carb ?? 0
        return base * quantity
    }

    private var displayedFat: Double {
        let base = selectedServing?.fat ?? props.fat ?? 0
        return base * quantity
    }

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
        quantity.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(quantity))
            : String(format: "%.1f", quantity)
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            headerSection
            macroSection
            if props.servings.count > 1 {
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

            Picker("Serving", selection: $selectedServingId) {
                ForEach(props.servings, id: \.id) { serving in
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
                        quantity = max(0.5, quantity - 0.5)
                    }
                } label: {
                    Image(systemName: "minus")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(quantity <= 0.5 ? SavoroColors.Stone.s300 : SavoroColors.textPrimary)
                        .frame(width: 28, height: 28)
                        .background(SavoroColors.Stone.s100)
                        .clipShape(Circle())
                }
                .disabled(quantity <= 0.5)

                Text(quantityFormatted)
                    .font(SavoroFonts.subheadline)
                    .foregroundStyle(SavoroColors.textPrimary)
                    .frame(minWidth: 32, alignment: .center)
                    .animation(nil, value: quantity)

                Button {
                    withAnimation(AnimationPresets.snappy) {
                        quantity += 0.5
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
                onLog(props.foodId, selectedServingId, quantity, .snack)
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
