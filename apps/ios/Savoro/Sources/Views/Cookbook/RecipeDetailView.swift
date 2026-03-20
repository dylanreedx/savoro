import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe
    let viewModel: CookbookViewModel

    @State private var servings: Int
    @State private var showEditor = false

    init(recipe: Recipe, viewModel: CookbookViewModel) {
        self.recipe = recipe
        self.viewModel = viewModel
        self._servings = State(initialValue: recipe.servings)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerSection
                macroSection
                ingredientsSection
                instructionsSection
                cookButton
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .padding(.bottom, 32)
        }
        .background(SavoroColors.canvas)
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") {
                    showEditor = true
                }
                .foregroundStyle(SavoroColors.rose)
            }
        }
        .sheet(isPresented: $showEditor) {
            NavigationStack {
                RecipeEditorView(
                    mode: .edit(recipe),
                    viewModel: viewModel
                )
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let description = recipe.description, !description.isEmpty {
                Text(description)
                    .font(SavoroFonts.body)
                    .foregroundStyle(SavoroColors.textSecondary)
            }

            HStack(spacing: 16) {
                if let prep = recipe.prepTime {
                    Label("\(prep)m prep", systemImage: "clock")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.Stone.s400)
                }
                if let cook = recipe.cookTime {
                    Label("\(cook)m cook", systemImage: "flame")
                        .font(SavoroFonts.caption)
                        .foregroundStyle(SavoroColors.Stone.s400)
                }
            }

            if !recipe.tags.isEmpty {
                HStack(spacing: 6) {
                    ForEach(recipe.tags, id: \.self) { tag in
                        Text(tag)
                            .font(SavoroFonts.caption2)
                            .foregroundStyle(SavoroColors.Stone.s500)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(SavoroColors.Stone.s100)
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }

    // MARK: - Macros

    @ViewBuilder
    private var macroSection: some View {
        if let protein = recipe.proteinPerServing,
           let carb = recipe.carbPerServing,
           let fat = recipe.fatPerServing {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Nutrition per serving")
                        .font(SavoroFonts.subheadline)
                        .foregroundStyle(SavoroColors.textPrimary)

                    Spacer()

                    Stepper("Servings: \(servings)", value: $servings, in: 1...99)
                        .font(SavoroFonts.caption)
                        .fixedSize()
                }

                HStack(spacing: 16) {
                    if let cal = recipe.caloriesPerServing {
                        Text("\(Int(cal)) cal")
                            .font(SavoroFonts.callout)
                            .foregroundStyle(SavoroColors.Macro.calories)
                    }
                    MacroLineView(protein: protein, carb: carb, fat: fat)
                }
            }
            .padding(14)
            .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm)
        }
    }

    // MARK: - Ingredients

    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Ingredients")
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)

            Text("Ingredient details available in edit mode.")
                .font(SavoroFonts.body)
                .foregroundStyle(SavoroColors.textSecondary)
        }
    }

    // MARK: - Instructions

    @ViewBuilder
    private var instructionsSection: some View {
        if let instructions = recipe.instructions, !instructions.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text("Instructions")
                    .font(SavoroFonts.headline)
                    .foregroundStyle(SavoroColors.textPrimary)

                Text(instructions)
                    .font(SavoroFonts.body)
                    .foregroundStyle(SavoroColors.textSecondary)
                    .lineSpacing(4)
            }
        }
    }

    // MARK: - Cook Button

    private var cookButton: some View {
        Button {
            // Future: log cook event
        } label: {
            Text("Cook & Log")
                .font(SavoroFonts.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(SavoroColors.rose)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .padding(.top, 8)
    }
}

#Preview {
    NavigationStack {
        RecipeDetailView(
            recipe: .preview,
            viewModel: CookbookViewModel()
        )
    }
}
