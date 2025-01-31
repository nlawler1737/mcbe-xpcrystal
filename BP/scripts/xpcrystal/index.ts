import { world, ItemCustomComponent, Player, ItemStack, ItemDurabilityComponent, EntityInventoryComponent, ItemComponentUseEvent } from "@minecraft/server"

const MAX_XP_STORAGE = 10252 // 64 levels
const LORE_ID = "§x§p§r"
const EXPERIENCE_DYNAMIC_ID = "xpcrystal:experience"

const XpCrystalItemComponent: ItemCustomComponent = {
    onUse: handleXpCrystalOnUse
}

world.beforeEvents.worldInitialize.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent(
        "xpcrystal:xpcrystal",
        XpCrystalItemComponent
    )
})

function handleXpCrystalOnUse(event: ItemComponentUseEvent) {
    const { source, itemStack } = event;
    const { xpEarnedAtCurrentLevel: earnedAtLevel, totalXpNeededForNextLevel: totalLevelXp } = source;
    const currentXpValue = getCurrentXpValue(event.itemStack) as number;

    const newItem = itemStack.clone()

    // if player is sneaking store xp
    // else retrieve xp
    if (source.isSneaking) {
        let xpToRemove = 0
        let removeLevel = false

        if (earnedAtLevel > 0) {
            xpToRemove = earnedAtLevel
        } else {
            xpToRemove = getExperienceNeededForNextLevel(source.level - 1)
            removeLevel = true
        }

        const canRemove = Math.min(xpToRemove, MAX_XP_STORAGE - currentXpValue)

        if (removeLevel) {
            source.addLevels(-1)
            if (canRemove !== xpToRemove) {
                source.addExperience(xpToRemove - canRemove)
            }
        } else {
            source.addExperience(-canRemove)
        }

        updateXpValue(newItem, canRemove, false)
        setInventoryItem(source, newItem, source.selectedSlotIndex)
    } else {
        let xpToAdd = 0
        let wasMaxedOut = false

        // for chance that xp is maxed out for current level
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

        updateXpValue(newItem, -canAdd, false)
        setInventoryItem(source, newItem, source.selectedSlotIndex)
    }
}

function getXpStorageLoreString(value: number) {
    const percent = getDisplayPercent((value / MAX_XP_STORAGE) * 100)
    let color: string;
    if (percent <= 10) {
        color = "4"
    } else if (percent <= 20) {
        color = "c"
    } else if (percent <= 30) {
        color = "v"
    } else if (percent <= 50) {
        color = "6"
    } else if (percent <= 60) {
        color = "g"
    } else if (percent <= 80) {
        color = "e"
    } else if (percent === 100) {
        color = "b§l"
    } else {
        color = "a"
    }
    const str = `${LORE_ID}§aXP: ${value} / ${MAX_XP_STORAGE} §${color}(${percent}%)`
    return str
}

function getExperienceNeededForNextLevel(level: number) {
    if (level < 0) {
        return 0
    } else if (level <= 15) {
        return 2 * level + 7
    } else if (level <= 30) {
        return 5 * level - 38
    } else {
        return 9 * level - 158
    }
}

/**
 * Sets the experience lore of `item`
 * 
 * Uses the item's dynamic property of `EXPERIENCE_DYNAMIC_ID`
 * to set the value
 */
function updateXpCrystalLore(item: ItemStack) {
    const allLore = item.getLore()
    const currentLoreIndex = allLore.findIndex(a => a.startsWith(LORE_ID))
    const currentXpValue = getCurrentXpValue(item);
    allLore.splice(currentLoreIndex, 1, getXpStorageLoreString(currentXpValue))
    item.setLore(allLore)
}

/**
 * Gets the current dynamic property value of `EXPERIENCE_DYNAMIC_ID`
 * 
 * If no value exists, it will be set to 0
 */
function getCurrentXpValue(item: ItemStack): number {
    const val = item.getDynamicProperty(EXPERIENCE_DYNAMIC_ID) as number;
    if (val == undefined) {
        item.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, 0)
        return 0
    }
    return val
}

/**
 * Updates the item's dynamic property of `EXPERIENCE_DYNAMIC_ID`
 * and the item's lore using `xp`
 * 
 * `set` is used to set or add the current value
 * 
 * `set` is `true` by default
 */
function updateXpValue(item: ItemStack, xp: number, set = true) {
    if (set) {
        item.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, xp)
    } else {
        item.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, getCurrentXpValue(item) + xp)
    }
    updateXpCrystalLore(item)
}

function setInventoryItem(player: Player, item: ItemStack, index: number, inventory?: EntityInventoryComponent) {
    const invComp = inventory ?? player.getComponent("minecraft:inventory") as EntityInventoryComponent
    invComp.container.setItem(index, item)
}

/**
 * Rounds a percent to the nearest whole number,
 * but it will only return 0 or 100 if `percent`
 * are exactly 100 or 0. Everything else will be
 * rounded as normal.
 * 
 * `percent` should be a float in range [0,100]
 * 
 * Returns a whole number
 * 
 * ```
 * getDisplayPercent(100) // 100
 * getDisplayPercent(99.99) // 99
 * getDisplayPercent(0) // 0
 * getDisplayPercent(0.01) // 1
 * ```
 */
function getDisplayPercent(percent: number) {
    if (percent < 100 && percent >= 99) {
        return 99
    }
    if (percent > 0 && percent <= 1) {
        return 1
    }
    return Math.round(percent)
}