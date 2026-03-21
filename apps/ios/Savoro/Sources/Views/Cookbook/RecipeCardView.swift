import SwiftUI

struct RecipeCardView: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(recipe.title)
                .font(SavoroFonts.headline)
                .foregroundStyle(SavoroColors.textPrimary)
                .lineLimit(2)

            if let protein = recipe.proteinPerServing,
               let carb = recipe.carbPerServing,
               let fat = recipe.fatPerServing {
                MacroLineView(protein: protein, carb: carb, fat: fat)
            }

            if let calories = recipe.caloriesPerServing {
                Text("\(Int(calories)) cal/serving")
                    .font(SavoroFonts.caption)
                    .foregroundStyle(SavoroColors.Stone.s400)
            }

            Spacer(minLength: 0)

            HStack {
                if recipe.forkCount > 0 {
                    Label {
                        Text("Forked")
                            .font(SavoroFonts.caption2)
                    } icon: {
                        Image(systemName: "tuningfork")
                            .font(.system(size: 9))
                    }
                    .foregroundStyle(SavoroColors.Stone.s400)
                }

                Spacer()

                if !recipe.tags.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(recipe.tags, id: \.self) { tag in
                            Text(RecipeTag(rawValue: tag)?.displayName ?? tag)
                                .font(SavoroFonts.caption2)
                                .foregroundStyle(SavoroColors.Stone.s500)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SavoroColors.Stone.s100)
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
        .padding(14)
        .frame(minHeight: 120)
        .glassCard(cornerRadius: SavoroColors.Glass.cornerRadiusSm)
    }
}

#Preview {
    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        ForEach(Recipe.previewList) { recipe in
            RecipeCardView(recipe: recipe)
        }
    }
    .padding()
    .background(SavoroColors.canvas)
}
