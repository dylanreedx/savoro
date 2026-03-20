import SwiftUI

struct GoalEditorView: View {

    @Bindable var viewModel: ProfileViewModel

    private let gridColumns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Daily Targets")
                    .font(SavoroFonts.headline)
                    .foregroundStyle(SavoroColors.textPrimary)

                Spacer()

                if viewModel.isEditing {
                    HStack(spacing: 12) {
                        Button("Cancel") {
                            viewModel.cancelEditing()
                        }
                        .font(SavoroFonts.callout)
                        .foregroundStyle(SavoroColors.textSecondary)

                        Button("Save") {
                            Task { await viewModel.saveGoal() }
                        }
                        .font(SavoroFonts.callout)
                        .foregroundStyle(SavoroColors.rose)
                        .disabled(viewModel.isSavingGoal)
                    }
                } else {
                    Button("Edit") {
                        viewModel.startEditing()
                    }
                    .font(SavoroFonts.callout)
                    .foregroundStyle(SavoroColors.rose)
                }
            }

            LazyVGrid(columns: gridColumns, spacing: 12) {
                goalCell(
                    label: "Calories",
                    value: $viewModel.editCalories,
                    unit: "kcal",
                    color: SavoroColors.rose,
                    bgColor: SavoroColors.Macro.caloriesBg
                )
                goalCell(
                    label: "Protein",
                    value: $viewModel.editProtein,
                    unit: "g",
                    color: SavoroColors.Macro.protein,
                    bgColor: SavoroColors.Macro.proteinBg
                )
                goalCell(
                    label: "Carbs",
                    value: $viewModel.editCarb,
                    unit: "g",
                    color: SavoroColors.Macro.carb,
                    bgColor: SavoroColors.Macro.carbBg
                )
                goalCell(
                    label: "Fat",
                    value: $viewModel.editFat,
                    unit: "g",
                    color: SavoroColors.Macro.fat,
                    bgColor: SavoroColors.Macro.fatBg
                )
            }

            if let error = viewModel.error {
                Text(error)
                    .font(SavoroFonts.caption)
                    .foregroundStyle(.red)
            }
        }
    }

    // MARK: - Goal Cell

    @ViewBuilder
    private func goalCell(
        label: String,
        value: Binding<String>,
        unit: String,
        color: Color,
        bgColor: some ShapeStyle
    ) -> some View {
        VStack(spacing: 6) {
            Text(label)
                .font(SavoroFonts.caption)
                .foregroundStyle(SavoroColors.textSecondary)

            if viewModel.isEditing {
                TextField("0", text: value)
                    .font(SavoroFonts.title3)
                    .foregroundStyle(color)
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
            } else {
                Text(value.wrappedValue)
                    .font(SavoroFonts.title3)
                    .foregroundStyle(color)
            }

            Text(unit)
                .font(SavoroFonts.caption2)
                .foregroundStyle(SavoroColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}
