/**
 * Validation tests for the 9 social/kitchen tables added in schema.ts.
 * Uses drizzle's getTableConfig to inspect table structure without circular ref issues.
 */
import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import {
  kitchen, kitchenMember, kitchenInvite,
  mealPlan, groceryList, groceryItem,
  follow, recipeShare, kitchenActivity,
  type Kitchen, type NewKitchen,
  type KitchenMember, type NewKitchenMember,
  type KitchenInvite, type NewKitchenInvite,
  type MealPlan, type NewMealPlan,
  type GroceryList, type NewGroceryList,
  type GroceryItem, type NewGroceryItem,
  type Follow, type NewFollow,
  type RecipeShare, type NewRecipeShare,
  type KitchenActivity, type NewKitchenActivity,
} from "./schema.js";

function colNames(tbl: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(tbl).columns.map((c) => c.name);
}

function jsColNames(tbl: Parameters<typeof getTableConfig>[0]): string[] {
  // Drizzle columns expose camelCase JS key in the table object
  return Object.keys(tbl as object).filter(
    (k) => !k.startsWith("_") && typeof (tbl as unknown as Record<string, unknown>)[k] === "object"
  );
}

// ---------------------------------------------------------------------------
// kitchen
// ---------------------------------------------------------------------------
describe("kitchen table", () => {
  const cfg = getTableConfig(kitchen);

  it("table name is 'kitchen'", () => expect(cfg.name).toBe("kitchen"));

  it("has correct SQL columns", () => {
    expect(colNames(kitchen)).toEqual(
      expect.arrayContaining(["id", "name", "description", "image_url", "owner_id", "created_at", "updated_at"])
    );
  });

  it("name is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "name")!;
    expect(col.notNull).toBe(true);
  });

  it("owner_id references user with cascade", () => {
    const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === "owner_id");
    expect(fk).toBeDefined();
    expect(fk!.onDelete).toBe("cascade");
  });
});

// ---------------------------------------------------------------------------
// kitchenMember
// ---------------------------------------------------------------------------
describe("kitchenMember table", () => {
  const cfg = getTableConfig(kitchenMember);

  it("table name is 'kitchen_member'", () => expect(cfg.name).toBe("kitchen_member"));

  it("has correct SQL columns", () => {
    expect(colNames(kitchenMember)).toEqual(
      expect.arrayContaining(["id", "kitchen_id", "user_id", "role", "created_at", "updated_at"])
    );
  });

  it("role defaults to 'member' and is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "role")!;
    expect(col.default).toBe("member");
    expect(col.notNull).toBe(true);
  });

  it("has uniqueIndex on (kitchen_id, user_id)", () => {
    // drizzle uniqueIndex() compiles to indexes with config.unique=true
    const idx = cfg.indexes.find((i) => i.config.name === "kitchen_member_kitchen_user_idx");
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
    const idxColNames = idx!.config.columns.map((c) => (c as { name?: string }).name);
    expect(idxColNames).toContain("kitchen_id");
    expect(idxColNames).toContain("user_id");
  });

  it("kitchen_id and user_id both cascade", () => {
    const fkKitchen = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === "kitchen_id");
    const fkUser = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === "user_id");
    expect(fkKitchen?.onDelete).toBe("cascade");
    expect(fkUser?.onDelete).toBe("cascade");
  });
});

// ---------------------------------------------------------------------------
// kitchenInvite
// ---------------------------------------------------------------------------
describe("kitchenInvite table", () => {
  const cfg = getTableConfig(kitchenInvite);

  it("table name is 'kitchen_invite'", () => expect(cfg.name).toBe("kitchen_invite"));

  it("has correct SQL columns", () => {
    expect(colNames(kitchenInvite)).toEqual(
      expect.arrayContaining([
        "id", "kitchen_id", "invited_by", "invited_user_id", "email",
        "status", "expires_at", "created_at", "updated_at",
      ])
    );
  });

  it("status defaults to 'pending' and is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "status")!;
    expect(col.default).toBe("pending");
    expect(col.notNull).toBe(true);
  });

  it("invited_user_id is nullable", () => {
    const col = cfg.columns.find((c) => c.name === "invited_user_id")!;
    expect(col.notNull).toBe(false);
  });

  it("has uniqueIndex on (kitchen_id, invited_user_id)", () => {
    const idx = cfg.indexes.find((i) => i.config.name === "kitchen_invite_kitchen_user_idx");
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
    const idxColNames = idx!.config.columns.map((c) => (c as { name?: string }).name);
    expect(idxColNames).toContain("kitchen_id");
    expect(idxColNames).toContain("invited_user_id");
  });
});

// ---------------------------------------------------------------------------
// mealPlan
// ---------------------------------------------------------------------------
describe("mealPlan table", () => {
  const cfg = getTableConfig(mealPlan);

  it("table name is 'meal_plan'", () => expect(cfg.name).toBe("meal_plan"));

  it("has correct SQL columns", () => {
    expect(colNames(mealPlan)).toEqual(
      expect.arrayContaining(["id", "kitchen_id", "user_id", "name", "start_date", "end_date", "created_at", "updated_at"])
    );
  });

  it("name, start_date, end_date are notNull", () => {
    for (const colName of ["name", "start_date", "end_date"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull, `${colName} should be notNull`).toBe(true);
    }
  });

  it("kitchen_id and user_id are nullable", () => {
    for (const colName of ["kitchen_id", "user_id"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull, `${colName} should be nullable`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// groceryList
// ---------------------------------------------------------------------------
describe("groceryList table", () => {
  const cfg = getTableConfig(groceryList);

  it("table name is 'grocery_list'", () => expect(cfg.name).toBe("grocery_list"));

  it("has correct SQL columns", () => {
    expect(colNames(groceryList)).toEqual(
      expect.arrayContaining([
        "id", "kitchen_id", "user_id", "meal_plan_id", "name", "is_completed", "created_at", "updated_at",
      ])
    );
  });

  it("is_completed defaults false and is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "is_completed")!;
    expect(col.default).toBe(false);
    expect(col.notNull).toBe(true);
  });

  it("meal_plan_id FK uses set null on delete", () => {
    const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === "meal_plan_id");
    expect(fk).toBeDefined();
    expect(fk!.onDelete).toBe("set null");
  });
});

// ---------------------------------------------------------------------------
// groceryItem
// ---------------------------------------------------------------------------
describe("groceryItem table", () => {
  const cfg = getTableConfig(groceryItem);

  it("table name is 'grocery_item'", () => expect(cfg.name).toBe("grocery_item"));

  it("has correct SQL columns", () => {
    expect(colNames(groceryItem)).toEqual(
      expect.arrayContaining([
        "id", "grocery_list_id", "food_id", "name", "quantity", "unit",
        "is_checked", "sort_order", "created_at", "updated_at",
      ])
    );
  });

  it("sort_order defaults to 0 and is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "sort_order")!;
    expect(col.default).toBe(0);
    expect(col.notNull).toBe(true);
  });

  it("is_checked defaults false and is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "is_checked")!;
    expect(col.default).toBe(false);
    expect(col.notNull).toBe(true);
  });

  it("grocery_list_id is notNull with cascade", () => {
    const col = cfg.columns.find((c) => c.name === "grocery_list_id")!;
    expect(col.notNull).toBe(true);
    const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === "grocery_list_id");
    expect(fk!.onDelete).toBe("cascade");
  });

  it("food_id is nullable (optional)", () => {
    const col = cfg.columns.find((c) => c.name === "food_id")!;
    expect(col.notNull).toBe(false);
  });

  it("quantity is real and nullable", () => {
    const col = cfg.columns.find((c) => c.name === "quantity")!;
    expect(col.columnType).toContain("SQLiteReal");
    expect(col.notNull).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// follow
// ---------------------------------------------------------------------------
describe("follow table", () => {
  const cfg = getTableConfig(follow);

  it("table name is 'follow'", () => expect(cfg.name).toBe("follow"));

  it("has correct SQL columns", () => {
    expect(colNames(follow)).toEqual(
      expect.arrayContaining(["id", "follower_id", "following_id", "created_at", "updated_at"])
    );
  });

  it("follower_id and following_id are notNull with cascade", () => {
    for (const colName of ["follower_id", "following_id"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull).toBe(true);
      const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === colName);
      expect(fk!.onDelete).toBe("cascade");
    }
  });

  it("has uniqueIndex on (follower_id, following_id)", () => {
    const idx = cfg.indexes.find((i) => i.config.name === "follow_follower_following_idx");
    expect(idx).toBeDefined();
    expect(idx!.config.unique).toBe(true);
    const idxColNames = idx!.config.columns.map((c) => (c as { name?: string }).name);
    expect(idxColNames).toContain("follower_id");
    expect(idxColNames).toContain("following_id");
  });
});

// ---------------------------------------------------------------------------
// recipeShare
// ---------------------------------------------------------------------------
describe("recipeShare table", () => {
  const cfg = getTableConfig(recipeShare);

  it("table name is 'recipe_share'", () => expect(cfg.name).toBe("recipe_share"));

  it("has correct SQL columns", () => {
    expect(colNames(recipeShare)).toEqual(
      expect.arrayContaining([
        "id", "recipe_id", "shared_by", "shared_to_user_id", "shared_to_kitchen_id",
        "message", "created_at", "updated_at",
      ])
    );
  });

  it("recipe_id and shared_by are notNull with cascade", () => {
    for (const colName of ["recipe_id", "shared_by"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull).toBe(true);
      const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === colName);
      expect(fk!.onDelete).toBe("cascade");
    }
  });

  it("shared_to_user_id and shared_to_kitchen_id are nullable", () => {
    for (const colName of ["shared_to_user_id", "shared_to_kitchen_id"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// kitchenActivity
// ---------------------------------------------------------------------------
describe("kitchenActivity table", () => {
  const cfg = getTableConfig(kitchenActivity);

  it("table name is 'kitchen_activity'", () => expect(cfg.name).toBe("kitchen_activity"));

  it("has correct SQL columns", () => {
    expect(colNames(kitchenActivity)).toEqual(
      expect.arrayContaining(["id", "kitchen_id", "user_id", "action", "metadata", "created_at", "updated_at"])
    );
  });

  it("action is notNull", () => {
    const col = cfg.columns.find((c) => c.name === "action")!;
    expect(col.notNull).toBe(true);
  });

  it("metadata is nullable json", () => {
    const col = cfg.columns.find((c) => c.name === "metadata")!;
    expect(col.notNull).toBe(false);
  });

  it("has index on kitchen_id", () => {
    const idx = cfg.indexes.find((i) => i.config.name === "kitchen_activity_kitchen_idx");
    expect(idx).toBeDefined();
    const idxColNames = idx!.config.columns.map((c) => (c as { name?: string }).name);
    expect(idxColNames).toContain("kitchen_id");
  });

  it("kitchen_id and user_id are notNull with cascade", () => {
    for (const colName of ["kitchen_id", "user_id"]) {
      const col = cfg.columns.find((c) => c.name === colName)!;
      expect(col.notNull).toBe(true);
      const fk = cfg.foreignKeys.find((fk) => fk.reference().columns[0].name === colName);
      expect(fk!.onDelete).toBe("cascade");
    }
  });
});

// ---------------------------------------------------------------------------
// Type exports – 18 for 9 new tables (compile-time verification)
// ---------------------------------------------------------------------------
describe("18 type exports for 9 new tables", () => {
  it("all table objects are defined (runtime check; types verified at compile time)", () => {
    const tables = [kitchen, kitchenMember, kitchenInvite, mealPlan, groceryList, groceryItem, follow, recipeShare, kitchenActivity];
    for (const tbl of tables) {
      expect(tbl).toBeDefined();
    }
  });

  it("type check: Kitchen and NewKitchen shape", () => {
    const row: Kitchen = { id: "x", name: "k", description: null, imageUrl: null, ownerId: "u", createdAt: "t", updatedAt: "t" };
    const ins: NewKitchen = { id: "x", name: "k", ownerId: "u" };
    expect(row.name).toBe("k");
    expect(ins.ownerId).toBe("u");
  });

  it("type check: Follow and NewFollow shape", () => {
    const row: Follow = { id: "x", followerId: "a", followingId: "b", createdAt: "t", updatedAt: "t" };
    const ins: NewFollow = { id: "x", followerId: "a", followingId: "b" };
    expect(row.followerId).toBe("a");
    expect(ins.followingId).toBe("b");
  });
});
