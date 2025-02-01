import { system, world, ItemCustomComponent, Player, ItemStack, EntityInventoryComponent, ItemComponentUseEvent, EntityItemComponent, Entity } from "@minecraft/server"

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

world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity.typeId !== "minecraft:player") return
    const player = event.deadEntity as Player;
    const location = player.getHeadLocation()
    const xpCrystals = player.dimension.getEntities({ type: "minecraft:item", location, maxDistance: 1 })
        .reduce((prev, entity) => {
            const itemComp = entity.getComponent("minecraft:item") as EntityItemComponent;
            const item = itemComp.itemStack
            if (item.typeId === "xpcrystal:xpcrystal") prev.push({ entity, item })
            return prev
        }, [] as { entity: Entity, item: ItemStack }[])
        .sort((a, b) => {
            return getCurrentXpValue(b.item) - getCurrentXpValue(a.item)
        })

    const level = player.level
    const xpDroppedOnDeath = Math.min(7 * level, 100)
    let xpToStore = player.getTotalXp() - xpDroppedOnDeath

    for (let i = 0; i < xpCrystals.length && xpToStore > 0; i++) {
        const crystal = xpCrystals[i]
        const currentXpValue = getCurrentXpValue(crystal.item)
        const canStore = Math.min(xpToStore, MAX_XP_STORAGE - currentXpValue)

        updateXpValue(crystal.item, canStore, false)
        const newEntity = player.dimension.spawnItem(crystal.item, crystal.entity.location)
        newEntity.applyImpulse(crystal.entity.getVelocity())
        crystal.entity.remove()
        xpToStore -= canStore
    }
})

function handleXpCrystalOnUse(event: ItemComponentUseEvent) {
    const { source, itemStack } = event;
    const { xpEarnedAtCurrentLevel: earnedAtLevel, totalXpNeededForNextLevel: totalLevelXp } = source;
    const currentXpValue = getCurrentXpValue(event.itemStack) as number;

    const newItem = itemStack.clone()

    // if player is not sneaking store xp
    // else retrieve xp
    if (!source.isSneaking) { // store xp
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

        const loreStr = updateXpValue(newItem, canRemove, false)
        setInventoryItem(source, newItem, source.selectedSlotIndex)
        source.onScreenDisplay.setActionBar(loreStr)
    } else { // retrieve xp
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

        const loreStr = updateXpValue(newItem, -canAdd, false)
        setInventoryItem(source, newItem, source.selectedSlotIndex)
        source.onScreenDisplay.setActionBar(loreStr)
    }
}

function getXpStorageLoreString(value: number) {
    const percent = getDisplayPercent((value / MAX_XP_STORAGE) * 100)
    let color: string;
    if (percent === 100) {      // 100
        color = "b"
    } else if (percent === 0) { // 0
        color = "n"
    } else if (percent > 90) {  // 91 - 99
        color = "a"
    } else if (percent > 70) {  // 71 - 90
        color = "e"
    } else if (percent > 50) {  // 51 - 70
        color = "g"
    } else if (percent > 30) {  // 31 - 50
        color = "6"
    } else if (percent > 10) {  // 11 - 30
        color = "v"
    } else {                    // 1 - 10
        color = "c"
    }
    const str = `${LORE_ID}§7XP: §${color}${percent}% §7(${value} / ${MAX_XP_STORAGE})`
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
 * 
 * @returns new lore string for item
 */
function updateXpCrystalLore(item: ItemStack) {
    const allLore = item.getLore()
    const currentLoreIndex = allLore.findIndex(a => a.startsWith(LORE_ID))
    const currentXpValue = getCurrentXpValue(item);
    const newLoreString = getXpStorageLoreString(currentXpValue)
    allLore.splice(currentLoreIndex, 1, newLoreString)
    item.setLore(allLore)
    return newLoreString
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
 * 
 * @returns updated crystal lore string
 */
function updateXpValue(item: ItemStack, xp: number, set = true) {
    if (set) {
        item.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, xp)
    } else {
        item.setDynamicProperty(EXPERIENCE_DYNAMIC_ID, getCurrentXpValue(item) + xp)
    }
    return updateXpCrystalLore(item)
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