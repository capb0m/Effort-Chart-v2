import { ACHIEVEMENT_DEFINITIONS } from "./definitions";
import { AchievementContext } from "./registry";

export interface CheckResult {
  newlyUnlocked: string[];
}

export async function checkAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: string[]
): Promise<CheckResult> {
  const unlockedSet = new Set(alreadyUnlocked);
  const newlyUnlocked: string[] = [];

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (unlockedSet.has(def.id)) continue;
    try {
      const met = await def.checkCondition(ctx);
      if (met) {
        newlyUnlocked.push(def.id);
      }
    } catch {
      // 個別エラーは無視して継続
    }
  }

  return { newlyUnlocked };
}
