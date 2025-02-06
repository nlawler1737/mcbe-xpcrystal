import { system, ItemComponentUseEvent } from "@minecraft/server"
import { getExperienceNeededForNextLevel, getMainhandSlot, spawnXpOrbs } from "../utils"
import { MAX_XP_STORAGE, MIN_X_HEAD_ROTATION, MAX_XP_SUMMON } from "../constants"
import XpCrystalItemStack from "../classes/XpCrystalItemStack"

export function xpCrystalUse(event: ItemComponentUseEvent) {
    const { source } = event;
    const { xpEarnedAtCurrentLevel: earnedAtLevel, totalXpNeededForNextLevel: totalLevelXp } = source;

    const slot = getMainhandSlot(source)

    try {
        if (!slot || slot.typeId !== "xpcrystal:xpcrystal") return
    } catch (e) {
        return
    }

    const xpCrystal = new XpCrystalItemStack(slot)
    const currentXpValue = xpCrystal.xp;

    // if player is sneaking and looking at the floor
    // summon xp at feet
    if (source.isSneaking && source.getRotation().x > MIN_X_HEAD_ROTATION) {
        const { added } = xpCrystal.addExperience(-MAX_XP_SUMMON)

        source.onScreenDisplay.setActionBar(xpCrystal.xpLore)

        system.runJob(spawnXpOrbs(source.dimension, -added, source.location))

        return
    }


    // if player is not sneaking store xp
    // else retrieve xp
    if (!source.isSneaking) {
        let xpToRemoveFromPlayer = 0
        let removeLevel = false

        if (earnedAtLevel > 0) {
            xpToRemoveFromPlayer = earnedAtLevel
        } else {
            xpToRemoveFromPlayer = getExperienceNeededForNextLevel(source.level - 1)
            removeLevel = true
        }

        const canRemove = Math.min(xpToRemoveFromPlayer, MAX_XP_STORAGE - currentXpValue)

        if (removeLevel) {
            source.addLevels(-1)
            if (canRemove !== xpToRemoveFromPlayer) {
                source.addExperience(xpToRemoveFromPlayer - canRemove)
            }
        } else {
            source.addExperience(-canRemove)
        }

        xpCrystal.addExperience(canRemove)
        source.onScreenDisplay.setActionBar(xpCrystal.xpLore)
    } else {
        let xpToAdd = 0
        let wasMaxedOut = false

        // for the chance that xp is maxed out for current level
        // should act as if player is already the next level
        if (earnedAtLevel === totalLevelXp) {
            wasMaxedOut = true
            xpToAdd = getExperienceNeededForNextLevel(source.level + 1)
        } else if (earnedAtLevel > 0) {
            xpToAdd = totalLevelXp - earnedAtLevel
        } else {
            xpToAdd = totalLevelXp
        }

        const canAdd = Math.min(xpToAdd, currentXpValue)
        source.addExperience(canAdd)

        if (wasMaxedOut) {
            source.addExperience(1)
            source.addExperience(-1)
        }

        xpCrystal.addExperience(-canAdd)
        source.onScreenDisplay.setActionBar(xpCrystal.xpLore)
    }
}

export default xpCrystalUse